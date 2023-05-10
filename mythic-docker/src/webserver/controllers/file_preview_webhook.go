package webcontroller

import (
	"encoding/base64"
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type PreviewFileInput struct {
	Input PreviewFile `json:"input" binding:"required"`
}

type PreviewFile struct {
	FileId string `json:"file_id" binding:"required"`
}

type PreviewFileResponse struct {
	Status         string `json:"status"`
	Error          string `json:"error"`
	Base64Contents string `json:"contents"`
}

func PreviewFileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input PreviewFileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	filemeta := databaseStructs.Filemeta{}
	//logging.LogDebug("about to fetch file for preview", "file id", input.Input.FileId)
	if userID, err := GetUserIDFromGin(c); err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if user, err := database.GetUserFromID(userID); err != nil {
		logging.LogError(err, "Failed to get calling user information from database")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if err := database.DB.Get(&filemeta, `SELECT
	path
	FROM filemeta 
	WHERE
	filemeta.agent_file_id=$1 AND filemeta.operation_id=$2 AND deleted=false
	`, input.Input.FileId, user.CurrentOperationID.Int64); err != nil {
		logging.LogError(err, "Failed to get file data from database")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if file, err := os.Open(filemeta.Path); err != nil {
		logging.LogError(err, "Failed to open file from disk")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else {
		defer file.Close()
		content := make([]byte, 512000)
		if bytesRead, err := file.Read(content); err != nil {
			logging.LogError(err, "Failed to read file from disk")
			c.JSON(http.StatusOK, PreviewFileResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else {
			base64Contents := base64.RawStdEncoding.EncodeToString(content[:bytesRead])
			c.JSON(http.StatusOK, PreviewFileResponse{
				Status:         "success",
				Base64Contents: base64Contents,
			})
			return
		}
	}
}
