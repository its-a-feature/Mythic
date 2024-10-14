package webcontroller

import (
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

func DownloadFileAuthWebhook(c *gin.Context) {
	// get variables from the POST request
	fileId := c.Param("file_uuid")
	if fileId == "" {
		logging.LogError(nil, "Failed to get required parameters")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "bad input"})
		return
	}
	// set this for logging later
	c.Set("file_id", fileId)
	// get the associated database information
	filemeta := databaseStructs.Filemeta{}
	//logging.LogDebug("about to fetch file for preview", "file id", input.Input.FileId)
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get userID"})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get calling user information from database")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get user info"})
		return
	}
	err = database.DB.Get(&filemeta, `SELECT
			"path", filename, id, operation_id
			FROM filemeta 
			WHERE
			filemeta.agent_file_id=$1 AND filemeta.operation_id=$2 AND deleted=false
			`, fileId, user.CurrentOperationID.Int64)
	if err != nil {
		logging.LogError(err, "Failed to get file data from database", "fileid", fileId)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to find file"})
		return
	}
	if !strings.Contains(c.Request.URL.Path, "screencaptures") {
		go tagFileAs(filemeta.ID, user.Username, filemeta.OperationID, tagTypeDownload, nil, c, false)
	}
	c.FileAttachment(filemeta.Path, string(filemeta.Filename))
	logging.LogDebug("Downloading a file to the user", "path", filemeta.Path, "filename", filemeta.Filename)
	c.Status(http.StatusOK)
	return
}
