package webcontroller

import (
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
	Status string `json:"status"`
	Error  string `json:"error"`
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
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
	}
	err = c.SaveUploadedFile(file, fileData.Path)
	if err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	fileDataContents, err := os.ReadFile(fileData.Path)
	if err != nil {
		logging.LogError(err, "Failed to read new file off of disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
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
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = statement.Get(&fileData.ID, fileData)
	if err != nil {
		logging.LogError(err, "Failed to save file metadata to database")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	// parse the file
	eventData, err := eventing.Ingest(fileDataContents)
	if err != nil {
		logging.LogError(err, "Failed to process file contents as Event data")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
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
	err = eventing.EnsureTrigger(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to ensure triggers are correct")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = eventing.ResolveDependencies(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to resolve dependencies")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	eventData.FileMetaID = fileData.ID
	err = eventing.SaveEventGroup(&eventData, operatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to save event group and event steps to database")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
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
	c.JSON(http.StatusOK, gin.H{
		"status": "success",
	})
}
