package webcontroller

import (
	"fmt"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func FileDirectDownloadWebhook(c *gin.Context) {
	if agentFileID := c.Param("file_uuid"); agentFileID == "" {
		logging.LogError(nil, "Failed to get file_uuid parameter")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "bad input"})
		return
	} else {
		// get the associated database information
		filemeta := databaseStructs.Filemeta{}
		payload := databaseStructs.Payload{}
		if err := database.DB.Get(&filemeta, `SELECT
			"path", filename
			FROM filemeta 
			WHERE
			filemeta.agent_file_id=$1 and deleted=false
			`, agentFileID); err != nil {
			if err := database.DB.Get(&payload, `SELECT
    			filemeta.path "filemeta.path",
    			filemeta.filename "filemeta.filename"
    			FROM payload
    			JOIN filemeta ON payload.file_id = filemeta.id 
    			WHERE payload.uuid=$1`, agentFileID); err != nil {
				logging.LogError(err, "Failed to get file data from database")
				message := fmt.Sprintf("Attempt to download unknown file: %s", agentFileID)
				go database.SendAllOperationsMessage(message, 0, "", database.MESSAGE_LEVEL_WARNING)
				c.AbortWithStatus(http.StatusNotFound)
				return
			} else {
				c.FileAttachment(payload.Filemeta.Path, string(payload.Filemeta.Filename))
				return
			}

		} else {
			c.FileAttachment(filemeta.Path, string(filemeta.Filename))
			return
		}
	}

}
