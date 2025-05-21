package webcontroller

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
	"os"
)

type EventingImportWebhookResponse struct {
	Status       string `json:"status"`
	Error        string `json:"error"`
	EventGroupID int    `json:"eventgroup_id"`
}

func EventingImportWebhook(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		logging.LogError(err, "Failed to get 'file' from web request for EventingImportWebhook")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Missing file in form",
		})
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	fileData := databaseStructs.Filemeta{
		AgentFileID:         uuid.New().String(),
		TotalChunks:         1,
		ChunksReceived:      1,
		ChunkSize:           int(file.Size),
		Size:                file.Size,
		Complete:            true,
		DeleteAfterFetch:    false,
		IsScreenshot:        false,
		IsDownloadFromAgent: false,
		IsPayload:           false,
		OperationID:         operatorOperation.CurrentOperation.ID,
		OperatorID:          operatorOperation.CurrentOperator.ID,
		Comment:             "Uploaded EventGroup",
	}
	fileData.Filename = []byte(file.Filename)
	if cmt, exists := c.GetPostForm("comment"); exists {
		fileData.Comment = cmt
	}
	fileData.AgentFileID, fileData.Path, err = rabbitmq.GetSaveFilePath()
	if err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
	}
	err = c.SaveUploadedFile(file, fileData.Path)
	if err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	fileDataContents, err := os.ReadFile(fileData.Path)
	if err != nil {
		logging.LogError(err, "Failed to read new file off of disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	fileData.Md5 = mythicCrypto.HashMD5(fileDataContents)
	fileData.Sha1 = mythicCrypto.HashSha1(fileDataContents)
	// register the data with database
	statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,chunk_size,path,operation_id,complete,comment,operator_id,delete_after_fetch,md5,sha1,agent_file_id,full_remote_path,task_id,is_screenshot,is_download_from_agent,host,size)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :full_remote_path, :task_id, :is_screenshot, :is_download_from_agent, :host, :size)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create statement for saving file metadata")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&fileData.ID, fileData)
	if err != nil {
		logging.LogError(err, "Failed to save file metadata to database")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// parse the file
	eventData, err := eventing.Ingest(fileDataContents)
	if err != nil {
		logging.LogError(err, "Failed to process file contents as Event data")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = eventing.EnsureActions(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to ensure actions are correct")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = eventing.EnsureTrigger(&eventData, true)
	if err != nil {
		logging.LogError(err, "Failed to ensure triggers are correct")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = eventing.ResolveDependencies(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to resolve dependencies")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	eventData.FileMetaID = fileData.ID
	eventData.Active = true
	eventData.Deleted = false
	err = eventing.SaveEventGroup(&eventData, operatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to save event group and event steps to database")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if eventData.Trigger == eventing.TriggerCron {
		triggerData := eventData.TriggerData.StructValue()
		if _, ok = triggerData["cron"]; ok {
			cronData := triggerData["cron"].(string)
			rabbitmq.CronChannel <- rabbitmq.CronNotification{
				Action:       rabbitmq.CronActionNewEventGroup,
				EventGroupID: eventData.ID,
				CronSchedule: cronData,
				OperationID:  operatorOperation.CurrentOperation.ID,
				OperatorID:   eventData.OperatorID,
			}
		}
	}
	c.JSON(http.StatusOK, EventingImportWebhookResponse{
		Status:       "success",
		EventGroupID: eventData.ID,
	})
}

type EventingImportAutomaticWebhookInput struct {
	Input EventingImportAutomaticWebhookMessage `json:"input"`
}
type EventingImportAutomaticWebhookMessage struct {
	Contents         string `json:"contents" binding:"required"`
	Filename         string `json:"filename" binding:"required"`
	ContainerName    string `json:"container_name" binding:"required"`
	DeleteOldVersion bool   `json:"delete_old_version"`
}

func EventingImportAutomaticWebhook(c *gin.Context) {
	var input EventingImportAutomaticWebhookInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	eventData, err := eventing.Ingest([]byte(input.Input.Contents))
	if err != nil {
		logging.LogError(err, "Failed to process file contents as Event data")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	targetComment := fmt.Sprintf("%s generated workflow: %s", input.Input.ContainerName, eventData.Name)
	// first check if we have a workflow with a backing file with this same comment
	if input.Input.DeleteOldVersion {
		eventGroup := databaseStructs.EventGroup{}
		err = database.DB.Get(&eventGroup, `SELECT 
    	eventgroup.id,
    	filemeta.path "filemeta.path"
		FROM eventgroup
		JOIN filemeta ON eventgroup.filemeta_id = filemeta.id
		WHERE eventgroup.deleted=false AND filemeta.comment=$1 AND filemeta.deleted=false AND eventgroup.operation_id=$2`,
			targetComment, operatorOperation.CurrentOperation.ID)
		if err != nil && !errors.Is(err, sql.ErrNoRows) {
			logging.LogError(err, "Failed to process file contents as Event data")
			c.JSON(http.StatusOK, EventingImportWebhookResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		if err == nil && eventGroup.ID > 0 {
			// we have an existing one, so check for its contents
			contents, err := os.ReadFile(eventGroup.Filemeta.Path)
			if err != nil {
				logging.LogError(err, "Failed to read eventing file contents")
				c.JSON(http.StatusOK, EventingImportWebhookResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
			if input.Input.Contents == string(contents) {
				logging.LogInfo("Got new eventing file from automation, but same contents as existing one, skipping")
				c.JSON(http.StatusOK, EventingImportWebhookResponse{
					Status:       "success",
					EventGroupID: eventGroup.ID,
				})
				return
			}
			_, err = database.DB.Exec(`UPDATE eventgroup SET active=false, deleted=true WHERE id=$1`, eventGroup.ID)
			if err != nil {
				logging.LogError(err, "Failed to update eventgroup to database")
			}
		}
	}
	fileData := databaseStructs.Filemeta{
		AgentFileID:         uuid.New().String(),
		TotalChunks:         1,
		ChunksReceived:      1,
		ChunkSize:           len(input.Input.Contents),
		Size:                int64(len(input.Input.Contents)),
		Complete:            true,
		DeleteAfterFetch:    false,
		IsScreenshot:        false,
		IsDownloadFromAgent: false,
		IsPayload:           false,
		OperationID:         operatorOperation.CurrentOperation.ID,
		OperatorID:          operatorOperation.CurrentOperator.ID,
		Comment:             targetComment,
	}
	fileData.Filename = []byte(input.Input.Filename)
	fileData.AgentFileID, fileData.Path, err = rabbitmq.GetSaveFilePath()
	if err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
	}
	file, err := os.OpenFile(fileData.Path, os.O_RDWR|os.O_CREATE, 0644)
	if err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	_, err = file.WriteString(input.Input.Contents)
	if err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	fileDataContents, err := os.ReadFile(fileData.Path)
	if err != nil {
		logging.LogError(err, "Failed to read new file off of disk")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	fileData.Md5 = mythicCrypto.HashMD5(fileDataContents)
	fileData.Sha1 = mythicCrypto.HashSha1(fileDataContents)
	// register the data with database
	statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,chunk_size,path,operation_id,complete,comment,operator_id,delete_after_fetch,md5,sha1,agent_file_id,full_remote_path,task_id,is_screenshot,is_download_from_agent,host,size)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :full_remote_path, :task_id, :is_screenshot, :is_download_from_agent, :host, :size)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create statement for saving file metadata")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = statement.Get(&fileData.ID, fileData)
	if err != nil {
		logging.LogError(err, "Failed to save file metadata to database")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// parse the file
	err = eventing.EnsureActions(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to ensure actions are correct")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = eventing.EnsureTrigger(&eventData, true)
	if err != nil {
		logging.LogError(err, "Failed to ensure triggers are correct")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = eventing.ResolveDependencies(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to resolve dependencies")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	eventData.FileMetaID = fileData.ID
	eventData.Active = false
	eventData.Deleted = false
	err = eventing.SaveEventGroup(&eventData, operatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to save event group and event steps to database")
		c.JSON(http.StatusOK, EventingImportWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	/*
		if eventData.Trigger == eventing.TriggerCron {
			triggerData := eventData.TriggerData.StructValue()
			if _, ok = triggerData["cron"]; ok {
				cronData := triggerData["cron"].(string)
				rabbitmq.CronChannel <- rabbitmq.CronNotification{
					Action:       rabbitmq.CronActionNewEventGroup,
					EventGroupID: eventData.ID,
					CronSchedule: cronData,
					OperationID:  operatorOperation.CurrentOperation.ID,
					OperatorID:   eventData.OperatorID,
				}
			}
		}

	*/
	c.JSON(http.StatusOK, EventingImportWebhookResponse{
		Status:       "success",
		EventGroupID: eventData.ID,
	})
}
