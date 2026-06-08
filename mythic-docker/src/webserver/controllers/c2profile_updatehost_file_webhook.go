package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type C2UpdateHostedFileMessageInput struct {
	Input C2UpdateHostedFileMessage `json:"input" binding:"required"`
}

type C2UpdateHostedFileMessage struct {
	C2ProfileFileHostID int     `json:"c2profile_file_host_id" binding:"required"`
	HostURL             *string `json:"host_url"`
	AlertOnDownload     *bool   `json:"alert_on_download"`
	Stop                bool    `json:"stop"`
	Remove              bool    `json:"remove"`
}

func C2UpdateHostedFileMessageWebhook(c *gin.Context) {
	var input C2UpdateHostedFileMessageInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c2HostFileError(c, err)
		return
	}
	if input.Input.Stop && input.Input.Remove {
		c2HostFileError(c, errors.New("stop and remove cannot both be true"))
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(nil, "Failed to get operatorOperation information")
		c2HostFileError(c, errors.New("failed to get current operation. Is it set?"))
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	hostRow := databaseStructs.C2profileFileHost{}
	err = database.DB.Get(&hostRow, `SELECT
		c2profile_file_host.id,
		c2profile_file_host.operation_id,
		c2profile_file_host.filemeta_id,
		c2profile_file_host.c2_profile_id,
		c2profile_file_host.host_url,
		c2profile_file_host.alert_on_download,
		c2profile_file_host.status,
		c2profile_file_host.error,
		c2profile_file_host.created_by,
		c2profile_file_host.apitokens_id,
		c2profile_file_host.eventstepinstance_id,
		c2profile_file_host.updated_at,
		filemeta.agent_file_id "filemeta.agent_file_id",
		filemeta.filename "filemeta.filename",
		filemeta.deleted "filemeta.deleted",
		c2profile.name "c2profile.name"
		FROM c2profile_file_host
		JOIN filemeta ON c2profile_file_host.filemeta_id = filemeta.id
		JOIN c2profile ON c2profile_file_host.c2_profile_id = c2profile.id
		WHERE c2profile_file_host.id=$1 AND c2profile_file_host.operation_id=$2`,
		input.Input.C2ProfileFileHostID, operatorOperation.CurrentOperation.ID)
	if errors.Is(err, sql.ErrNoRows) {
		c2HostFileError(c, errors.New("failed to find hosted file row in the current operation"))
		return
	}
	if err != nil {
		logging.LogError(err, "failed to find c2 hosted file row")
		c2HostFileError(c, err)
		return
	}
	apiTokenID := sql.NullInt64{}
	if authContext.APITokensID > 0 {
		apiTokenID.Valid = true
		apiTokenID.Int64 = int64(authContext.APITokensID)
	}
	eventStepInstanceID := sql.NullInt64{}
	if authContext.EventStepInstanceID > 0 {
		eventStepInstanceID.Valid = true
		eventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	if input.Input.Remove {
		if hostRow.Status == databaseStructs.C2ProfileFileHostStatusStopped {
			// if we're already stopped, we can just delete the database entry
			rabbitmq.DeleteC2HostedFile(hostRow.ID)
			rabbitmq.TouchC2HostedFileMeta(hostRow.FileMetaID)
			c.JSON(http.StatusOK, C2HostFileMessageResponse{
				Status:        "success",
				ID:            hostRow.ID,
				FileMetaID:    hostRow.FileMetaID,
				C2ProfileID:   hostRow.C2ProfileID,
				HostURL:       hostRow.HostURL,
				HostingStatus: "",
				AffectedCount: 1,
			})
			return
		}
		_, err = database.DB.Exec(`UPDATE c2profile_file_host SET status=$1, error=$2 WHERE id=$3`,
			databaseStructs.C2ProfileFileHostStatusUpdating, "Pending C2 profile remove confirmation", hostRow.ID)
		if err != nil {
			logging.LogError(err, "failed to mark hosted file as updating before remove")
			c2HostFileError(c, err)
			return
		}
		rabbitmq.InvalidateHostedFileAuthContextToken(hostRow.ID)
		hostMessage := rabbitmq.C2HostFileMessage{
			AgentFileID: hostRow.FileMeta.AgentFileID,
			HostURL:     hostRow.HostURL,
			Remove:      true,
			Filename:    string(hostRow.FileMeta.Filename),
		}
		response, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFiles(rabbitmq.C2HostFilesMessage{
			Name:  hostRow.C2Profile.Name,
			Files: []rabbitmq.C2HostFileMessage{hostMessage},
		}, authContext)
		if err != nil {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
			c2HostFileError(c, err)
			return
		}
		result := rabbitmq.ResultForC2HostedFile(response, hostMessage)
		if !result.Success {
			errorText := result.Error
			if errorText == "" {
				errorText = response.Error
			}
			if errorText == "" {
				errorText = "C2 profile failed to remove hosted file"
			}
			rabbitmq.MarkC2HostedFileError(hostRow.ID, errorText)
			c2HostFileError(c, errors.New(errorText))
			return
		}
		rabbitmq.DeleteC2HostedFile(hostRow.ID)
		rabbitmq.TouchC2HostedFileMeta(hostRow.FileMetaID)
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status:        "success",
			ID:            hostRow.ID,
			FileMetaID:    hostRow.FileMetaID,
			C2ProfileID:   hostRow.C2ProfileID,
			HostURL:       hostRow.HostURL,
			HostingStatus: "",
			AffectedCount: 1,
		})
		return
	}
	if input.Input.Stop {
		_, err = database.DB.Exec(`UPDATE c2profile_file_host SET status=$1, error=$2 WHERE id=$3`,
			databaseStructs.C2ProfileFileHostStatusUpdating, "Pending C2 profile stop confirmation", hostRow.ID)
		if err != nil {
			logging.LogError(err, "failed to mark hosted file as updating before stop")
			c2HostFileError(c, err)
			return
		}
		rabbitmq.InvalidateHostedFileAuthContextToken(hostRow.ID)
		hostMessage := rabbitmq.C2HostFileMessage{
			AgentFileID: hostRow.FileMeta.AgentFileID,
			HostURL:     hostRow.HostURL,
			Remove:      true,
			Filename:    string(hostRow.FileMeta.Filename),
		}
		response, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFiles(rabbitmq.C2HostFilesMessage{
			Name:  hostRow.C2Profile.Name,
			Files: []rabbitmq.C2HostFileMessage{hostMessage},
		}, authContext)
		if err != nil {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
			c2HostFileError(c, err)
			return
		}
		result := rabbitmq.ResultForC2HostedFile(response, hostMessage)
		if !result.Success {
			errorText := result.Error
			if errorText == "" {
				errorText = response.Error
			}
			if errorText == "" {
				errorText = "C2 profile failed to stop hosting file"
			}
			rabbitmq.MarkC2HostedFileError(hostRow.ID, errorText)
			c2HostFileError(c, errors.New(errorText))
			return
		}
		_, err = database.DB.Exec(`UPDATE c2profile_file_host SET status=$1, error='' WHERE id=$2`,
			databaseStructs.C2ProfileFileHostStatusStopped, hostRow.ID)
		if err != nil {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
			logging.LogError(err, "failed to mark hosted file as stopped")
			c2HostFileError(c, err)
			return
		}
		rabbitmq.TouchC2HostedFileMeta(hostRow.FileMetaID)
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status:        "success",
			ID:            hostRow.ID,
			FileMetaID:    hostRow.FileMetaID,
			C2ProfileID:   hostRow.C2ProfileID,
			HostURL:       hostRow.HostURL,
			HostingStatus: databaseStructs.C2ProfileFileHostStatusStopped,
			AffectedCount: 1,
		})
		return
	}
	newHostURL := hostRow.HostURL
	pathChanged := false
	if input.Input.HostURL != nil {
		newHostURL = normalizeHostURL(*input.Input.HostURL)
		if newHostURL == "" {
			c2HostFileError(c, errors.New("must supply a hosting url path"))
			return
		}
		pathChanged = newHostURL != hostRow.HostURL
	}
	if pathChanged {
		if hostRow.FileMeta.Deleted {
			c2HostFileError(c, errors.New("file is deleted, can't be hosted"))
			return
		}
		conflictingRow := databaseStructs.C2profileFileHost{}
		err = database.DB.Get(&conflictingRow, `SELECT id FROM c2profile_file_host
			WHERE c2_profile_id=$1 AND host_url=$2 AND id<>$3`,
			hostRow.C2ProfileID, newHostURL, hostRow.ID)
		if err == nil {
			c2HostFileError(c, fmt.Errorf("%s is already hosting a file at %s", hostRow.C2Profile.Name, newHostURL))
			return
		}
		if !errors.Is(err, sql.ErrNoRows) {
			logging.LogError(err, "failed to check for hosted file path conflict")
			c2HostFileError(c, err)
			return
		}
		_, err = database.DB.Exec(`UPDATE c2profile_file_host
			SET status=$1, error=$2, apitokens_id=$3, eventstepinstance_id=$4
			WHERE id=$5`,
			databaseStructs.C2ProfileFileHostStatusUpdating, "Pending C2 profile path update confirmation",
			apiTokenID, eventStepInstanceID, hostRow.ID)
		if err != nil {
			logging.LogError(err, "failed to mark hosted file as updating before path change")
			c2HostFileError(c, err)
			return
		}
		rabbitmq.InvalidateHostedFileAuthContextToken(hostRow.ID)
		hostRow.APITokensID.Valid = apiTokenID.Valid
		hostRow.APITokensID.Int64 = apiTokenID.Int64
		hostRow.EventStepInstanceID.Valid = eventStepInstanceID.Valid
		hostRow.EventStepInstanceID.Int64 = eventStepInstanceID.Int64
		removeMessage := rabbitmq.C2HostFileMessage{
			AgentFileID: hostRow.FileMeta.AgentFileID,
			HostURL:     hostRow.HostURL,
			Remove:      true,
			Filename:    string(hostRow.FileMeta.Filename),
		}
		addRow := hostRow
		addRow.HostURL = newHostURL
		addMessage, err := rabbitmq.BuildC2HostedFileMessage(addRow, false)
		if err != nil {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
			c2HostFileError(c, err)
			return
		}
		response, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFiles(rabbitmq.C2HostFilesMessage{
			Name:  hostRow.C2Profile.Name,
			Files: []rabbitmq.C2HostFileMessage{removeMessage, addMessage},
		}, authContext)
		if err != nil {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
			c2HostFileError(c, err)
			return
		}
		removeResult := rabbitmq.ResultForC2HostedFile(response, removeMessage)
		addResult := rabbitmq.ResultForC2HostedFile(response, addMessage)
		if !removeResult.Success || !addResult.Success {
			errorText := removeResult.Error
			if errorText == "" {
				errorText = addResult.Error
			}
			if errorText == "" {
				errorText = response.Error
			}
			if errorText == "" {
				errorText = "C2 profile failed to update hosted file path"
			}
			rabbitmq.MarkC2HostedFileError(hostRow.ID, errorText)
			c2HostFileError(c, errors.New(errorText))
			return
		}
		if input.Input.AlertOnDownload != nil {
			_, err = database.DB.Exec(`UPDATE c2profile_file_host
				SET host_url=$1, alert_on_download=$2, status=$3, error=''
				WHERE id=$4`,
				newHostURL, *input.Input.AlertOnDownload, databaseStructs.C2ProfileFileHostStatusActive, hostRow.ID)
		} else {
			_, err = database.DB.Exec(`UPDATE c2profile_file_host
				SET host_url=$1, status=$2, error=''
				WHERE id=$3`,
				newHostURL, databaseStructs.C2ProfileFileHostStatusActive, hostRow.ID)
		}
		if err != nil {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
			logging.LogError(err, "failed to update hosted file path")
			c2HostFileError(c, err)
			return
		}
		rabbitmq.TouchC2HostedFileMeta(hostRow.FileMetaID)
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status:        "success",
			ID:            hostRow.ID,
			FileMetaID:    hostRow.FileMetaID,
			C2ProfileID:   hostRow.C2ProfileID,
			HostURL:       newHostURL,
			HostingStatus: databaseStructs.C2ProfileFileHostStatusActive,
			AffectedCount: 1,
		})
		return
	}
	if input.Input.AlertOnDownload != nil {
		_, err = database.DB.Exec(`UPDATE c2profile_file_host SET alert_on_download=$1 WHERE id=$2`,
			*input.Input.AlertOnDownload, hostRow.ID)
		if err != nil {
			logging.LogError(err, "failed to update hosted file alert setting")
			c2HostFileError(c, err)
			return
		}
		rabbitmq.TouchC2HostedFileMeta(hostRow.FileMetaID)
		c.JSON(http.StatusOK, C2HostFileMessageResponse{
			Status:        "success",
			ID:            hostRow.ID,
			FileMetaID:    hostRow.FileMetaID,
			C2ProfileID:   hostRow.C2ProfileID,
			HostURL:       hostRow.HostURL,
			HostingStatus: hostRow.Status,
			AffectedCount: 1,
		})
		return
	}
	// if we get to this point, it's a retry/restart message
	// the current entry is either stopped or error and we need to start hosting it again
	if hostRow.FileMeta.Deleted {
		c2HostFileError(c, errors.New("file is deleted, can't be hosted"))
		return
	}
	_, err = database.DB.Exec(`UPDATE c2profile_file_host
		SET status=$1, error=$2, apitokens_id=$3, eventstepinstance_id=$4
		WHERE id=$5`,
		databaseStructs.C2ProfileFileHostStatusUpdating, "Pending C2 profile confirmation",
		apiTokenID, eventStepInstanceID, hostRow.ID)
	if err != nil {
		logging.LogError(err, "failed to mark hosted file as updating before retry")
		c2HostFileError(c, err)
		return
	}
	rabbitmq.InvalidateHostedFileAuthContextToken(hostRow.ID)
	hostRow.APITokensID.Valid = apiTokenID.Valid
	hostRow.APITokensID.Int64 = apiTokenID.Int64
	hostRow.EventStepInstanceID.Valid = eventStepInstanceID.Valid
	hostRow.EventStepInstanceID.Int64 = eventStepInstanceID.Int64
	hostMessage, err := rabbitmq.BuildC2HostedFileMessage(hostRow, false)
	if err != nil {
		rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
		c2HostFileError(c, err)
		return
	}
	response, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFiles(rabbitmq.C2HostFilesMessage{
		Name:  hostRow.C2Profile.Name,
		Files: []rabbitmq.C2HostFileMessage{hostMessage},
	}, authContext)
	if err != nil {
		rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
		c2HostFileError(c, err)
		return
	}
	result := rabbitmq.ResultForC2HostedFile(response, hostMessage)
	if !result.Success {
		errorText := result.Error
		if errorText == "" {
			errorText = response.Error
		}
		if errorText == "" {
			errorText = "C2 profile failed to host file"
		}
		rabbitmq.MarkC2HostedFileError(hostRow.ID, errorText)
		c2HostFileError(c, errors.New(errorText))
		return
	}
	rabbitmq.MarkC2HostedFileActive(hostRow.ID)
	rabbitmq.TouchC2HostedFileMeta(hostRow.FileMetaID)
	c.JSON(http.StatusOK, C2HostFileMessageResponse{
		Status:        "success",
		ID:            hostRow.ID,
		FileMetaID:    hostRow.FileMetaID,
		C2ProfileID:   hostRow.C2ProfileID,
		HostURL:       hostRow.HostURL,
		HostingStatus: databaseStructs.C2ProfileFileHostStatusActive,
		AffectedCount: 1,
	})
}
