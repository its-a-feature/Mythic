package webcontroller

import (
	"database/sql"
	"errors"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type C2HostFileMessageInput struct {
	Input C2HostFileMessage `json:"input" binding:"required"`
}

type C2HostFileMessage struct {
	C2ProfileID     int    `json:"c2_id" binding:"required"`
	FileUUID        string `json:"file_uuid"`
	HostURL         string `json:"host_url"`
	AlertOnDownload bool   `json:"alert_on_download"`
}

type C2HostFileMessageResponse struct {
	Status        string `json:"status"`
	Error         string `json:"error"`
	ID            int    `json:"id,omitempty"`
	FileMetaID    int    `json:"filemeta_id,omitempty"`
	C2ProfileID   int    `json:"c2_profile_id,omitempty"`
	HostURL       string `json:"host_url,omitempty"`
	HostingStatus string `json:"hosting_status,omitempty"`
	AffectedCount int    `json:"affected_count,omitempty"`
}

func normalizeHostURL(hostURL string) string {
	if hostURL == "" {
		return hostURL
	}
	if hostURL[0] != '/' {
		return "/" + hostURL
	}
	return hostURL
}

func c2HostFileError(c *gin.Context, err error) {
	c.JSON(http.StatusOK, C2HostFileMessageResponse{
		Status: "error",
		Error:  err.Error(),
	})
}

func C2HostFileMessageWebhook(c *gin.Context) {
	var input C2HostFileMessageInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c2HostFileError(c, err)
		return
	}
	input.Input.HostURL = normalizeHostURL(input.Input.HostURL)
	if input.Input.HostURL == "" {
		c2HostFileError(c, errors.New("must supply a hosting url path"))
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
	c2Profile := databaseStructs.C2profile{ID: input.Input.C2ProfileID}
	err = database.DB.Get(&c2Profile, `SELECT id, "name" FROM c2profile WHERE id=$1`,
		input.Input.C2ProfileID)
	if err != nil {
		logging.LogError(err, "Failed to find c2 profile")
		c2HostFileError(c, err)
		return
	}
	if input.Input.FileUUID == "" {
		c2HostFileError(c, errors.New("must supply file_uuid when hosting a file"))
		return
	}
	hostFile := databaseStructs.Filemeta{}
	err = database.DB.Get(&hostFile, `SELECT deleted, id, operation_id, filename, agent_file_id
		FROM filemeta WHERE agent_file_id=$1 AND operation_id=$2`,
		input.Input.FileUUID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find file")
		c2HostFileError(c, err)
		return
	}
	if hostFile.Deleted {
		c2HostFileError(c, errors.New("file is deleted, can't be hosted"))
		return
	}
	hostRow, createdNew, err := upsertPendingHostedFileRow(input.Input, c2Profile, hostFile, operatorOperation, authContext)
	if err != nil {
		logging.LogError(err, "failed to create pending c2 hosted file row")
		c2HostFileError(c, err)
		return
	}
	hostMessage, err := rabbitmq.BuildC2HostedFileMessage(hostRow, false)
	if err != nil {
		if createdNew {
			rabbitmq.DeleteC2HostedFile(hostRow.ID)
		} else {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
		}
		c2HostFileError(c, err)
		return
	}
	response, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFiles(rabbitmq.C2HostFilesMessage{
		Name:  c2Profile.Name,
		Files: []rabbitmq.C2HostFileMessage{hostMessage},
	}, authContext)
	if err != nil {
		if createdNew {
			rabbitmq.DeleteC2HostedFile(hostRow.ID)
		} else {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, err.Error())
		}
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
		if createdNew {
			rabbitmq.DeleteC2HostedFile(hostRow.ID)
		} else {
			rabbitmq.MarkC2HostedFileError(hostRow.ID, errorText)
		}
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

func upsertPendingHostedFileRow(input C2HostFileMessage, c2Profile databaseStructs.C2profile, hostFile databaseStructs.Filemeta,
	operatorOperation *databaseStructs.Operatoroperation, authContext rabbitmq.RabbitMQAuthContext) (databaseStructs.C2profileFileHost, bool, error) {
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
	existing, err := rabbitmq.FetchC2HostedFileByProfilePath(c2Profile.ID, input.HostURL)
	createdNew := false
	if errors.Is(err, sql.ErrNoRows) {
		createdNew = true
		_, err = database.DB.Exec(`INSERT INTO c2profile_file_host
			(operation_id, filemeta_id, c2_profile_id, host_url, alert_on_download, status, error, created_by, apitokens_id, eventstepinstance_id)
			VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
			hostFile.OperationID, hostFile.ID, c2Profile.ID, input.HostURL, input.AlertOnDownload,
			databaseStructs.C2ProfileFileHostStatusUpdating, "Pending C2 profile confirmation",
			operatorOperation.CurrentOperator.ID, apiTokenID, eventStepInstanceID)
	} else if err == nil {
		_, err = database.DB.Exec(`UPDATE c2profile_file_host
			SET filemeta_id=$1, operation_id=$2, alert_on_download=$3, status=$4, error=$5, apitokens_id=$6, eventstepinstance_id=$7
			WHERE id=$8`,
			hostFile.ID, hostFile.OperationID, input.AlertOnDownload,
			databaseStructs.C2ProfileFileHostStatusUpdating, "Pending C2 profile confirmation",
			apiTokenID, eventStepInstanceID, existing.ID)
	}
	if err != nil {
		return databaseStructs.C2profileFileHost{}, createdNew, err
	}
	hostRow, err := rabbitmq.FetchC2HostedFileByProfilePath(c2Profile.ID, input.HostURL)
	return hostRow, createdNew, err
}
