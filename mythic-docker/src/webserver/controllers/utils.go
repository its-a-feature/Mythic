package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"time"
)

func GetUserIDFromGin(c *gin.Context) (int, error) {
	customClaims, err := authentication.GetClaims(c)
	if err != nil {
		return 0, err
	}
	return customClaims.UserID, nil
}
func GetUserIDFromGinAllowCookies(c *gin.Context) (int, error) {
	customClaims, err := authentication.GetClaims(c)
	if err != nil {
		err = authentication.CookieTokenValid(c)
		if err != nil {
			return 0, err
		}
		return GetUserIDFromGin(c)
	}
	return customClaims.UserID, nil
}

const (
	tagTypePreview               = "FilePreviewed"
	tagTypePreviewDescription    = "The file was previewed in the UI by an operator"
	tagTypePreviewColor          = "#c39a43"
	tagTypeDownload              = "FileDownloaded"
	tagTypeDownloadDescription   = "The file was downloaded by an operator in the UI"
	tagTypeDownloadColor         = "#709567"
	tagTypeHostedByC2            = "FileHosted"
	tagTypeHostedByC2Description = `The file was hosted by an operator in the UI through a C2 Profile.
Use the host file button (blue globe) to then remove this file from being hosted.`
	tagTypeHostedByC2Color = "#cb7a00"
)

func tagFileAs(fileMetaID int, operatorName string, operationID int, tagTypeAssignment string, tagData map[string]interface{}, c *gin.Context, remove bool) {
	// create the tag type in general if needed
	tagtype := databaseStructs.TagType{}
	err := database.DB.Get(&tagtype, `SELECT * FROM tagtype WHERE name=$1 AND operation_id=$2`,
		tagTypeAssignment, operationID)
	if errors.Is(err, sql.ErrNoRows) {
		// we need to create this tagtype
		newTagType := databaseStructs.TagType{
			Name:      tagTypeAssignment,
			Operation: operationID,
		}
		switch tagTypeAssignment {
		case tagTypeDownload:
			newTagType.Description = tagTypeDownloadDescription
			newTagType.Color = tagTypeDownloadColor
		case tagTypePreview:
			newTagType.Description = tagTypePreviewDescription
			newTagType.Color = tagTypePreviewColor
		case tagTypeHostedByC2:
			newTagType.Description = tagTypeHostedByC2Description
			newTagType.Color = tagTypeHostedByC2Color
		default:
		}
		statement, err := database.DB.PrepareNamed(`INSERT INTO tagtype 
			(name, color, description, operation_id)
			VALUES (:name, :color, :description, :operation_id)
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
	case tagTypeHostedByC2:
		newTagData = tagData
	default:
	}

	err = database.DB.Get(&tag, `SELECT * FROM tag WHERE filemeta_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source='mythic'`,
		fileMetaID, operationID, tagtype.ID)
	if errors.Is(err, sql.ErrNoRows) {
		// we haven't tagged this file with this tagtype before, so create a new tag with initial data
		tag.Data = rabbitmq.GetMythicJSONTextFromStruct(newTagData)
		_, err = database.DB.NamedExec(`INSERT INTO tag (filemeta_id, operation_id, tagtype_id, source, data)
			VALUES (:filemeta_id, :operation_id, :tagtype_id, :source, :data )`, tag)
		if err != nil {
			logging.LogError(err, "failed to insert tag")
			return
		}
		go func() {
			rabbitmq.EventingChannel <- rabbitmq.EventNotification{
				Trigger:     eventing.TriggerTagCreate,
				TagID:       tag.ID,
				OperationID: tag.Operation,
			}
		}()
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
		// unknown operator download, check to see if there's a file hosted tag
		hostedTagType := databaseStructs.TagType{}
		err = database.DB.Get(&hostedTagType, `SELECT * FROM tagtype WHERE name=$1 AND operation_id=$2`,
			tagTypeHostedByC2, operationID)
		if err != nil {
			// nothing ever hosted via c2, so nothing special to do
			//logging.LogInfo("Nothing hosted via c2")
			updateTagData[operatorName] = newKey
			break
		}
		hostedTag := databaseStructs.Tag{}
		err = database.DB.Get(&hostedTag, `SELECT * FROM tag WHERE filemeta_id=$1 AND operation_id=$2 AND tagtype_id=$3 AND source='mythic'`,
			fileMetaID, operationID, hostedTagType.ID)
		if err != nil {
			// this file wasn't hosted via c2, nothing special to do
			//logging.LogInfo("file wasn't hosted via c2")
			updateTagData[operatorName] = newKey
			break
		}
		// this file was hosted by c2, so check if there's an alert that needs to be sent about it
		c2Profile := c.GetHeader("mythic")
		//logging.LogInfo("header for downloading file", "mythic header", c2Profile)
		hostedTagData := hostedTag.Data.StructValue()
		for _, val := range hostedTagData {
			hostedTagDataEntry := val.(map[string]interface{})
			//logging.LogInfo("looping through hosted data", "hostedTagDataEntry", hostedTagDataEntry)
			if hostedTagDataEntry["c2_profile"].(string) == c2Profile || c2Profile == "" {
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
					hostedTagDataEntry["filename"],
					newKey,
					hostedTagDataEntry["c2_profile"],
					hostedTagDataEntry["host_url"],
					remoteIP, remoteURL, remoteUserAgent, remoteHost)
				updateTagData[newKey] = downloadMessage
				alertLevel := database.MESSAGE_LEVEL_INFO
				if hostedTagDataEntry["alert_on_download"].(bool) {
					alertLevel = database.MESSAGE_LEVEL_WARNING
				}
				go rabbitmq.SendAllOperationsMessage(downloadMessage, operationID, "", alertLevel)
				break
			}
		}
	case tagTypeHostedByC2:
		if remove {
			for key, val := range updateTagData {
				for _, newTagVal := range tagData {
					newTagMap := newTagVal.(map[string]interface{})
					oldTagMap := val.(map[string]interface{})
					if newTagMap["agent_file_id"].(string) == oldTagMap["agent_file_id"].(string) &&
						newTagMap["c2_profile"].(string) == oldTagMap["c2_profile"].(string) &&
						(newTagMap["host_url"].(string) == "" ||
							newTagMap["host_url"].(string) == oldTagMap["host_url"].(string)) {
						c2HostFileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFile(rabbitmq.C2HostFileMessage{
							Name:     newTagMap["c2_profile"].(string),
							FileUUID: newTagMap["agent_file_id"].(string),
							HostURL:  newTagMap["host_url"].(string),
							Remove:   remove,
						})
						if err != nil {
							logging.LogError(err, "failed to send message to container to stop hosting it")
							go rabbitmq.SendAllOperationsMessage(fmt.Sprintf(
								"%s failed to stop hosting file:\n%s", newTagMap["c2_profile"].(string),
								err.Error()), operationID, "", database.MESSAGE_LEVEL_WARNING)
							continue
						}
						if !c2HostFileResponse.Success {
							logging.LogError(err, "c2 profile failed to stop hosting file")
							go rabbitmq.SendAllOperationsMessage(fmt.Sprintf(
								"%s failed to stop hosting file:\n%s", newTagMap["c2_profile"].(string),
								c2HostFileResponse.Error), operationID, "", database.MESSAGE_LEVEL_WARNING)
							continue
						}
						delete(updateTagData, key)
					}
				}
			}
		} else {
			for key, val := range tagData {
				newTagMap := val.(map[string]interface{})
				c2HostFileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCHostFile(rabbitmq.C2HostFileMessage{
					Name:     newTagMap["c2_profile"].(string),
					FileUUID: newTagMap["agent_file_id"].(string),
					HostURL:  newTagMap["host_url"].(string),
					Remove:   remove,
				})
				if err != nil {
					logging.LogError(err, "failed to send host file message to c2 profile")
					go rabbitmq.SendAllOperationsMessage(fmt.Sprintf(
						"%s failed to start hosting file:\n%s", newTagMap["c2_profile"].(string),
						err.Error()), operationID, "", database.MESSAGE_LEVEL_WARNING)
					continue
				}
				if !c2HostFileResponse.Success {
					logging.LogError(err, "c2 profile failed to start hosting file")
					go rabbitmq.SendAllOperationsMessage(fmt.Sprintf(
						"%s failed to start hosting file:\n%s", newTagMap["c2_profile"].(string),
						c2HostFileResponse.Error), operationID, "", database.MESSAGE_LEVEL_WARNING)
					continue
				}
				updateTagData[key] = val
			}
		}
	default:
	}
	if len(updateTagData) > 0 {
		tag.Data = rabbitmq.GetMythicJSONTextFromStruct(updateTagData)
		_, err = database.DB.NamedExec(`UPDATE tag SET data=:data WHERE id=:id`, tag)
	} else {
		_, err = database.DB.NamedExec(`DELETE FROM tag WHERE id=:id`, tag)
	}

	if err != nil {
		logging.LogError(err, "failed to update tag")
		return
	}
	_, err = database.DB.Exec(`UPDATE filemeta SET timestamp=now() WHERE id=$1`, fileMetaID)
	if err != nil {
		logging.LogError(err, "failed to update file timestamp")
	}
	_, err = database.DB.Exec(`UPDATE payload SET timestamp=now() WHERE file_id=$1`, fileMetaID)
	if err != nil {
		logging.LogError(err, "failed to update payload timestamp")
	}
}
