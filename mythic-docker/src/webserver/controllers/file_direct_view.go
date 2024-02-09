package webcontroller

import (
	"fmt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func FileDirectViewWebhook(c *gin.Context) {
	agentFileID := c.Param("file_uuid")
	if agentFileID == "" {
		logging.LogError(nil, "Failed to get file_uuid parameter")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "bad input"})
		return
	}
	// set this for logging later
	c.Set("file_id", agentFileID)
	// get the associated database information
	filemeta := databaseStructs.Filemeta{}
	payload := databaseStructs.Payload{}
	err := database.DB.Get(&filemeta, `SELECT
			"path", filename
			FROM filemeta 
			WHERE
			filemeta.agent_file_id=$1
			`, agentFileID)
	if err != nil {
		err = database.DB.Get(&payload, `SELECT
    			filemeta.path "filemeta.path",
    			filemeta.filename "filemeta.filename"
    			FROM payload
    			JOIN filemeta ON payload.file_id = filemeta.id 
    			WHERE payload.uuid=$1`, agentFileID)
		if err != nil {
			logging.LogError(err, "Failed to get file data from database")
			message := fmt.Sprintf("Attempt to download unknown file: %s", agentFileID)
			go rabbitmq.SendAllOperationsMessage(message, 0, "", database.MESSAGE_LEVEL_WARNING)
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		c.File(payload.Filemeta.Path)
		return
	}
	c.File(filemeta.Path)
	return
}
