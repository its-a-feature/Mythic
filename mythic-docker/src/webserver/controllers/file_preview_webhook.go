package webcontroller

import (
	"database/sql"
	"encoding/base64"
	"errors"
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
	Size           int64  `json:"size"`
	Host           string `json:"host"`
	FullRemotePath string `json:"full_remote_path"`
	Filename       string `json:"filename"`
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
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get calling user information from database")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// set this for logging later
	c.Set("file_id", input.Input.FileId)
	err = database.DB.Get(&filemeta, `SELECT
	path, id, operation_id, size, host, filename, full_remote_path
	FROM filemeta 
	WHERE
	filemeta.agent_file_id=$1 AND filemeta.operation_id=$2 AND deleted=false
	`, input.Input.FileId, user.CurrentOperationID.Int64)
	if errors.Is(err, sql.ErrNoRows) {
		logging.LogError(err, "Failed to get file data from database", "agent_file_id", input.Input.FileId, "operation", user.CurrentOperationID.Int64)
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  "File is deleted",
		})
		return
	}
	if err != nil {
		logging.LogError(err, "Failed to get file data from database")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	go tagFileAs(filemeta.ID, user.Username, filemeta.OperationID, tagTypePreview, nil, c, false)
	file, err := os.Open(filemeta.Path)
	if err != nil {
		logging.LogError(err, "Failed to open file from disk")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	defer file.Close()
	content := make([]byte, 512000)
	bytesRead, err := file.Read(content)
	if err != nil {
		logging.LogError(err, "Failed to read file from disk")
		c.JSON(http.StatusOK, PreviewFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	base64Contents := base64.RawStdEncoding.EncodeToString(content[:bytesRead])
	c.JSON(http.StatusOK, PreviewFileResponse{
		Status:         "success",
		Base64Contents: base64Contents,
		Size:           filemeta.Size,
		Host:           filemeta.Host,
		Filename:       string(filemeta.Filename),
		FullRemotePath: string(filemeta.FullRemotePath),
	})
	return

}
