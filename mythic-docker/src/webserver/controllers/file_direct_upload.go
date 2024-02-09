package webcontroller

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func FileDirectUploadWebhook(c *gin.Context) {
	var agentFileID string
	if agentFileID = c.Param("file_uuid"); agentFileID == "" {
		logging.LogError(nil, "Failed to get file_uuid parameter")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "bad input"})
		return
	}
	// set this for logging later
	c.Set("file_id", agentFileID)
	file, err := c.FormFile("file")
	if err != nil {
		logging.LogError(err, "Failed to get 'file' from web request for FileDirectUploadWebhook")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Missing file in form",
		})
	}
	filemeta := databaseStructs.Filemeta{}
	if err := database.DB.Get(&filemeta, `SELECT
		"path", id
		FROM
		filemeta
		WHERE agent_file_id=$1`, agentFileID); err != nil {
		logging.LogError(err, "Failed to find file in FileDirectUploadWebhook", "agentFileID", agentFileID)
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Failed to find file",
		})
		return
	} else if err = c.SaveUploadedFile(file, filemeta.Path); err != nil {
		logging.LogError(err, "Failed to save file to disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	} else if fileData, err := os.ReadFile(filemeta.Path); err != nil {
		logging.LogError(err, "Failed to read new file off of disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	} else {
		filemeta.ChunkSize = len(fileData)
		filemeta.TotalChunks = 1
		filemeta.ChunksReceived = 1
		filemeta.Md5 = mythicCrypto.HashMD5(fileData)
		filemeta.Sha1 = mythicCrypto.HashSha1(fileData)
		fileDisk, err := os.Stat(filemeta.Path)
		if err != nil {
			logging.LogError(err, "Failed to write file to disk")
		} else {
			filemeta.Size = fileDisk.Size()
		}
		if _, err := database.DB.NamedExec(`UPDATE filemeta SET
				chunk_size=:chunk_size, md5=:md5, sha1=:sha1, total_chunks=:total_chunks, chunks_received=:chunks_received, complete=true, size=:size
				WHERE id=:id`,
			filemeta); err != nil {
			logging.LogError(err, "Failed to save metadata to database")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		} else {
			c.JSON(http.StatusOK, gin.H{"status": "success", "agent_file_id": agentFileID})
			return
		}
	}

}
