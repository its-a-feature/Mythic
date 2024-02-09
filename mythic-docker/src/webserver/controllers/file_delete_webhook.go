package webcontroller

import (
	"net/http"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type DeleteFileInput struct {
	Input DeleteFile `json:"input" binding:"required"`
}

type DeleteFile struct {
	FileId int `json:"file_id" binding:"required"`
}

type DeleteFileResponse struct {
	Status     string `json:"status"`
	Error      string `json:"error"`
	FileIDs    []int  `json:"file_ids"`
	PayloadIDs []int  `json:"payload_ids"`
}

func DeleteFileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input DeleteFileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, DeleteFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	filemeta := databaseStructs.Filemeta{}
	deletedFileIDs := []int{}
	deletedPayloadIDs := []int{}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, DeleteFileResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	err := database.DB.Get(&filemeta, `SELECT
		path, is_payload, id
		FROM filemeta 
		WHERE
		id=$1 and operation_id=$2
		`, input.Input.FileId, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get file data from database", "file_id", input.Input.FileId)
		c.JSON(http.StatusOK, DeleteFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if err := os.Remove(filemeta.Path); err != nil {
		logging.LogError(err, "Failed to remove file")
	} else {
		deletedFileIDs = append(deletedFileIDs, filemeta.ID)
	}
	if filemeta.IsPayload {
		payload := databaseStructs.Payload{}
		if err := database.DB.Get(&payload, `SELECT id FROM payload WHERE file_id=$1`, filemeta.ID); err != nil {
			logging.LogError(err, "Failed to fetch payload for associated file_id")
		} else {
			payload.Deleted = true
			deletedPayloadIDs = append(deletedPayloadIDs, payload.ID)
			if _, err := database.DB.Exec(`UPDATE payload SET deleted=true WHERE id=$1`, payload.ID); err != nil {
				logging.LogError(err, "Failed to update payload deleted status")
			}
		}
	}
	if _, err := database.DB.Exec(`UPDATE filemeta SET deleted=true WHERE id=$1`, filemeta.ID); err != nil {
		logging.LogError(err, "Failed to update filemeta deleted status")
	}
	linkedFiles := []databaseStructs.Filemeta{}
	if err := database.DB.Select(&linkedFiles, `SELECT
			id, path, is_payload
			FROM filemeta
			WHERE
			path=$1`, filemeta.Path); err != nil {
		logging.LogError(err, "Failed to select related files with the same path", "path", filemeta.Path)
	} else {
		for _, file := range linkedFiles {
			deletedFileIDs = append(deletedFileIDs, file.ID)
			if file.IsPayload {
				payload := databaseStructs.Payload{}
				if err := database.DB.Get(&payload, `SELECT id FROM payload WHERE file_id=$1`, file.ID); err != nil {
					logging.LogError(err, "Failed to fetch payload for associated file_id")
				} else {
					payload.Deleted = true
					deletedPayloadIDs = append(deletedPayloadIDs, payload.ID)
					if _, err := database.DB.Exec(`UPDATE payload SET deleted=true WHERE id=$1`, payload.ID); err != nil {
						logging.LogError(err, "Failed to update payload deleted status")
					}
				}
			}
			if _, err := database.DB.Exec(`UPDATE filemeta SET deleted=true WHERE id=$1`, file.ID); err != nil {
				logging.LogError(err, "Failed to update filemeta deleted status")
			}
		}
	}
	c.JSON(http.StatusOK, DeleteFileResponse{
		Status:     "success",
		FileIDs:    deletedFileIDs,
		PayloadIDs: deletedPayloadIDs,
	})
	return

}
