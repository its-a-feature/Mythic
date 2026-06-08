package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

func GetUserIDFromGin(c *gin.Context) (int, error) {
	customClaims, err := authentication.GetClaims(c)
	if err != nil {
		return 0, err
	}
	return customClaims.UserID, nil
}

func getTaskByDisplayIDForOperation(taskDisplayID int, operationID int) (databaseStructs.Task, error) {
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT * FROM task WHERE display_id=$1 AND operation_id=$2`,
		taskDisplayID, operationID)
	if err != nil {
		return task, fmt.Errorf("failed to find task with display_id %d in current operation: %w", taskDisplayID, err)
	}
	return task, nil
}

func getCallbackByDisplayIDForOperation(callbackDisplayID int, operationID int) (databaseStructs.Callback, error) {
	callback := databaseStructs.Callback{}
	err := database.DB.Get(&callback, `SELECT * FROM callback WHERE display_id=$1 AND operation_id=$2`,
		callbackDisplayID, operationID)
	if err != nil {
		return callback, fmt.Errorf("failed to find callback with display_id %d in current operation: %w", callbackDisplayID, err)
	}
	return callback, nil
}

const (
	tagTypePreview             = "FilePreviewed"
	tagTypePreviewDescription  = "The file was previewed in the UI by an operator"
	tagTypePreviewColor        = "#c39a43"
	tagTypeDownload            = "FileDownloaded"
	tagTypeDownloadDescription = "The file was downloaded by an operator in the UI"
	tagTypeDownloadColor       = "#709567"
)

func insertTag(tag *databaseStructs.Tag) {
	statement, err := database.DB.PrepareNamed(`INSERT INTO tag (filemeta_id, operation_id, tagtype_id, source, data, apitokens_id, eventstepinstance_id)
			VALUES (:filemeta_id, :operation_id, :tagtype_id, :source, :data, :apitokens_id, :eventstepinstance_id)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "failed to create prepared named statement")
		return
	}
	err = statement.Get(&tag.ID, tag)
	if err != nil {
		logging.LogError(err, "failed to execute prepared named statement")
		return
	}
	go func() {
		rabbitmq.EventingChannel <- rabbitmq.EventNotification{
			Trigger:     eventing.TriggerTagCreate,
			TagID:       tag.ID,
			OperationID: tag.Operation,
		}
	}()
}

var tagFileAsLock sync.Mutex

func tagFileAs(fileMetaID int, operatorName string, operationID int, tagTypeAssignment string, tagData map[string]interface{}, c *gin.Context, remove bool, authContext rabbitmq.RabbitMQAuthContext) {
	// create the tag type in general if needed
	// use a lock to prevent accidental double tag creations
	tagFileAsLock.Lock()
	defer tagFileAsLock.Unlock()
	tagtype := databaseStructs.TagType{}
	err := database.DB.Get(&tagtype, `SELECT * FROM tagtype WHERE name=$1 AND operation_id=$2`,
		tagTypeAssignment, operationID)
	if errors.Is(err, sql.ErrNoRows) {
		// we need to create this tagtype
		newTagType := databaseStructs.TagType{
			Name:      tagTypeAssignment,
			Operation: operationID,
		}
		if authContext.APITokensID > 0 {
			newTagType.APITokensID.Valid = true
			newTagType.APITokensID.Int64 = int64(authContext.APITokensID)
		}
		if authContext.EventStepInstanceID > 0 {
			newTagType.EventStepInstanceID.Valid = true
			newTagType.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
		}
		switch tagTypeAssignment {
		case tagTypeDownload:
			newTagType.Description = tagTypeDownloadDescription
			newTagType.Color = tagTypeDownloadColor
		case tagTypePreview:
			newTagType.Description = tagTypePreviewDescription
			newTagType.Color = tagTypePreviewColor
		default:
		}
		statement, err := database.DB.PrepareNamed(`INSERT INTO tagtype 
			(name, color, description, operation_id, apitokens_id, eventstepinstance_id)
			VALUES (:name, :color, :description, :operation_id, :apitokens_id, :eventstepinstance_id)
			RETURNING id`)
		if err != nil {
			logging.LogError(err, "failed to create prepared named statement")
			return
		}
		err = statement.Get(&newTagType.ID, newTagType)
		if err != nil {
			logging.LogError(err, "failed to create prepared named statement")
			return
		}
		tagtype.ID = newTagType.ID
	} else if err != nil {
		logging.LogError(err, "failed to get tagtypes")
		return
	}
	tag := databaseStructs.Tag{
		Operation: operationID,
		TagTypeID: tagtype.ID,
		Source:    "mythic",
	}
	if authContext.APITokensID > 0 {
		tag.APITokensID.Valid = true
		tag.APITokensID.Int64 = int64(authContext.APITokensID)
	}
	if authContext.EventStepInstanceID > 0 {
		tag.EventStepInstanceID.Valid = true
		tag.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	tag.FileMeta.Valid = true
	tag.FileMeta.Int64 = int64(fileMetaID)
	// start processing the new tag
	newKey := fmt.Sprintf("%s", time.Now().UTC().Format(rabbitmq.TIME_FORMAT_STRING_YYYY_MM_DD_HH_MM_SS))
	newTagData := map[string]interface{}{
		operatorName: newKey,
	}
	switch tagTypeAssignment {
	case tagTypePreview:
		fallthrough
	case tagTypeDownload:
	default:
	}
	shouldAddTag := false
	err = database.DB.Get(&tag, `SELECT * FROM tag WHERE filemeta_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source='mythic'`,
		fileMetaID, operationID, tagtype.ID)
	if errors.Is(err, sql.ErrNoRows) {
		// we haven't tagged this file with this tagtype before, so create a new tag with initial data
		tag.Data = rabbitmq.GetMythicJSONTextFromStruct(newTagData)
		shouldAddTag = true
	} else if err != nil {
		logging.LogError(err, "failed to search for tags")
		return
	}
	// the tag exists, we just need to update the data
	updateTagData := tag.Data.StructValue()
	switch tagTypeAssignment {
	case tagTypePreview:
		updateTagData[operatorName] = newKey
	case tagTypeDownload:
		if operatorName != "unknown" {
			updateTagData[operatorName] = newKey
			break
		}
		// unknown operator download, check to see if the file is currently hosted by a C2 profile.
		c2Profile := c.GetHeader("mythic")
		hostedFiles := []databaseStructs.C2profileFileHost{}
		err = database.DB.Select(&hostedFiles, `SELECT
			c2profile_file_host.host_url,
			c2profile_file_host.alert_on_download,
			c2profile.name "c2profile.name",
			filemeta.filename "filemeta.filename"
			FROM c2profile_file_host
			JOIN c2profile ON c2profile_file_host.c2_profile_id = c2profile.id
			JOIN filemeta ON c2profile_file_host.filemeta_id = filemeta.id
			WHERE c2profile_file_host.filemeta_id=$1
			AND c2profile_file_host.operation_id=$2
			AND c2profile_file_host.status=$3
			AND ($4 = '' OR c2profile.name=$4)`,
			fileMetaID, operationID, databaseStructs.C2ProfileFileHostStatusActive, c2Profile)
		if err != nil || len(hostedFiles) == 0 {
			if err != nil {
				logging.LogError(err, "failed to search hosted files for download alert")
			}
			updateTagData[operatorName] = newKey
			break
		}
		for _, hostedFile := range hostedFiles {
			remoteIP := requestGetRemoteAddress(c)
			remoteURL := requestGetRemoteURL(c)
			remoteUserAgent := requestGetRemoteUserAgent(c)
			remoteHost := requestGetRemoteHost(c)
			downloadMessage := fmt.Sprintf(`
%s was downloaded at %s: 
C2 Profile:    %s
Hosted Path:   %s
Downloader IP: %s
Requested URL: %s
User-Agent:    %s
Target Host:   %s`,
				string(hostedFile.FileMeta.Filename),
				newKey,
				hostedFile.C2Profile.Name,
				hostedFile.HostURL,
				remoteIP, remoteURL, remoteUserAgent, remoteHost)
			updateTagData[newKey] = downloadMessage
			alertLevel := database.MESSAGE_LEVEL_INFO
			if shouldAddTag {
				insertTag(&tag)
				shouldAddTag = false
			}
			go rabbitmq.SendAllOperationsMessage(downloadMessage, operationID, "", alertLevel, hostedFile.AlertOnDownload)
		}
	default:
	}
	switch tagTypeAssignment {
	case tagTypePreview:
		fallthrough
	case tagTypeDownload:
		if shouldAddTag {
			insertTag(&tag)
		} else {
			if len(updateTagData) > 0 {
				tag.Data = rabbitmq.GetMythicJSONTextFromStruct(updateTagData)
				_, err = database.DB.NamedExec(`UPDATE tag SET data=:data WHERE id=:id`, tag)
				if err != nil {
					logging.LogError(err, "failed to update tag")
					return
				}
			}
		}
	}
	rabbitmq.TouchC2HostedFileMeta(fileMetaID)
}
