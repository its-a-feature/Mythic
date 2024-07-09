package webcontroller

import (
	"fmt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func EventGroupRegisterFileWebhook(c *gin.Context) {
	var eventGroupIDString string
	eventGroupIDString, exists := c.GetPostForm("eventgroup_id")
	if !exists {
		logging.LogError(nil, "Failed to get eventgroup_id parameter")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "bad input, missing eventgroup_id"})
		return
	}
	eventGroupID, err := strconv.ParseInt(eventGroupIDString, 10, 64)
	if err != nil {
		logging.LogError(err, "Failed to parse eventgroup_id as integer")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "bad input, invalid eventgroup_id"})
		return
	}
	file, err := c.FormFile("file")
	if err != nil {
		logging.LogError(err, "Failed to get 'file' from web request for EventGroupRegisterFileWebhook")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Missing file in form",
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get current operation from JWT")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Missing current operation",
		})
		return
	}
	currentOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	eventGroup := databaseStructs.EventGroup{}
	err = database.DB.Get(&eventGroup, `SELECT id, "name" FROM eventgroup WHERE 
                              operation_id=$1 AND id=$2`, currentOperation.CurrentOperation.ID, eventGroupID)
	if err != nil {
		logging.LogError(err, "Failed to get eventgroup information for your operation")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "missing eventgroup information",
		})
		return
	}
	fileUUID, filePath, err := rabbitmq.GetSaveFilePath()
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = c.SaveUploadedFile(file, filePath)
	if err != nil {
		logging.LogError(err, "Failed to save uploaded file to disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	fileData, err := os.ReadFile(filePath)
	if err != nil {
		logging.LogError(err, "Failed to read new file off of disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	fileMeta := databaseStructs.Filemeta{
		TotalChunks:      1,
		ChunksReceived:   1,
		ChunkSize:        int(file.Size),
		Path:             filePath,
		OperationID:      currentOperation.CurrentOperation.ID,
		Complete:         true,
		Comment:          fmt.Sprintf("Uploaded for eventing workflow: \"%s\"", eventGroup.Name),
		DeleteAfterFetch: false,
		AgentFileID:      fileUUID,
	}
	if cmt, exists := c.GetPostForm("comment"); exists {
		fileMeta.Comment = cmt
	}
	fileMeta.EventGroupID.Valid = true
	fileMeta.EventGroupID.Int64 = eventGroupID
	fileMeta.Filename = []byte(file.Filename)
	fileMeta.OperatorID = currentOperation.CurrentOperator.ID
	fileMeta.Md5 = mythicCrypto.HashMD5(fileData)
	fileMeta.Sha1 = mythicCrypto.HashSha1(fileData)
	fileDisk, err := os.Stat(fileMeta.Path)
	if err != nil {
		logging.LogError(err, "Failed to write file to disk")
	} else {
		fileMeta.Size = fileDisk.Size()
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,chunk_size,"path",operation_id,complete,"comment",operator_id,delete_after_fetch,md5,sha1,agent_file_id,size,eventgroup_id)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :size, :eventgroup_id)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to save metadata to database")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	err = statement.Get(&fileMeta, fileMeta)
	if err != nil {
		logging.LogError(err, "Failed to save metadata to database")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	go rabbitmq.EmitFileLog(fileMeta.ID)
	_, err = database.DB.Exec(`UPDATE eventgroup SET updated_at=$1 WHERE id=$2`,
		time.Now().UTC(), eventGroup.ID)
	if err != nil {
		logging.LogError(err, "failed to update eventgroup's updated_at time")
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "agent_file_id": fileUUID})

}
