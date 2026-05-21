package webcontroller

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

func TaskUploadFileWebhook(c *gin.Context) {
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(nil, "Failed to get current operation from JWT")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Missing current operation",
		})
		return
	}
	currentOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Missing file in form",
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
		Comment:          "Uploaded as part of tasking",
		DeleteAfterFetch: false,
		AgentFileID:      fileUUID,
	}
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	if authContext.APITokensID > 0 {
		fileMeta.APITokensID.Valid = true
		fileMeta.APITokensID.Int64 = int64(authContext.APITokensID)
	}
	if authContext.EventStepInstanceID > 0 {
		fileMeta.EventStepInstanceID.Valid = true
		fileMeta.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	if cmt, exists := c.GetPostForm("comment"); exists {
		fileMeta.Comment = cmt
	}
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
			(filename,total_chunks,chunks_received,chunk_size,"path",operation_id,complete,"comment",operator_id,delete_after_fetch,md5,sha1,agent_file_id,size,apitokens_id,eventstepinstance_id)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :size, :apitokens_id, :eventstepinstance_id)
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
	c.JSON(http.StatusOK, gin.H{"status": "success", "agent_file_id": fileUUID})
	return
}
