package webcontroller

import (
	"fmt"
	"net/http"

	"github.com/its-a-feature/Mythic/rabbitmq"

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
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		c.AbortWithStatus(http.StatusUnauthorized)
		return
	}
	err = database.DB.Get(&filemeta, `SELECT
			"path", filename, id, operation_id
			FROM filemeta 
			WHERE
			filemeta.agent_file_id=$1 AND filemeta.operation_id=$2
			`, agentFileID, user.CurrentOperationID.Int64)
	if err != nil {
		err = database.DB.Get(&payload, `SELECT
    			filemeta.path "filemeta.path",
    			filemeta.filename "filemeta.filename",
    			filemeta.id "filemeta.id",
    			filemeta.operation_id "filemeta.operation_id"
    			FROM payload
    			JOIN filemeta ON payload.file_id = filemeta.id 
    			WHERE payload.uuid=$1 AND payload.operation_id=$2`, agentFileID, user.CurrentOperationID.Int64)
		if err != nil {
			logging.LogError(err, "Failed to get file data from database")
			message := fmt.Sprintf("Attempt to download unknown file: %s", agentFileID)
			go rabbitmq.SendAllOperationsMessage(message, 0, "", database.MESSAGE_LEVEL_INFO, true)
			c.AbortWithStatus(http.StatusNotFound)
			return
		}
		go tagFileAs(payload.Filemeta.ID, user.Username, payload.Filemeta.OperationID, tagTypePreview, nil, c, false)
		c.File(payload.Filemeta.Path)
		return
	}
	go tagFileAs(filemeta.ID, user.Username, filemeta.OperationID, tagTypePreview, nil, c, false)
	c.File(filemeta.Path)
	return
}
