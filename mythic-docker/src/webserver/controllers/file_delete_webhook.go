package webcontroller

import (
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
	"os"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type DeleteFileInput struct {
	Input DeleteFile `json:"input" binding:"required"`
}

type DeleteFile struct {
	FileId  int   `json:"file_id"`
	FileIDs []int `json:"file_ids"`
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
	fileIDsToProcess := input.Input.FileIDs
	if input.Input.FileId > 0 {
		fileIDsToProcess = append(fileIDsToProcess, input.Input.FileId)
	}
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

	err, deletedFileIDs, deletedPayloadIDs := DeleteFilesHelper(fileIDsToProcess, operatorOperation)
	if err != nil {
		c.JSON(http.StatusOK, DeleteFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, DeleteFileResponse{
		Status:     "success",
		FileIDs:    deletedFileIDs,
		PayloadIDs: deletedPayloadIDs,
	})
	return

}

func DeleteFilesHelper(fileIDsToProcess []int, operatorOperation *databaseStructs.Operatoroperation) (error, []int, []int) {
	deletedFileIDs := []int{}
	deletedPayloadIDs := []int{}
	for _, fileID := range fileIDsToProcess {
		filemeta := databaseStructs.Filemeta{}
		err := database.DB.Get(&filemeta, `SELECT
		path, is_payload, id, eventgroup_id
		FROM filemeta 
		WHERE
		id=$1 and operation_id=$2
		`, fileID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to get file data from database", "file_id", fileID)
			return err, deletedFileIDs, deletedPayloadIDs
		}
		if err := os.Remove(filemeta.Path); err != nil {
			logging.LogError(err, "Failed to remove file")
		} else {
			deletedFileIDs = append(deletedFileIDs, filemeta.ID)
		}
		if filemeta.IsPayload {
			payload := databaseStructs.Payload{}
			if err := database.DB.Get(&payload, `SELECT id, uuid FROM payload WHERE file_id=$1`, filemeta.ID); err != nil {
				logging.LogError(err, "Failed to fetch payload for associated file_id")
			} else {
				payload.Deleted = true
				deletedPayloadIDs = append(deletedPayloadIDs, payload.ID)
				if _, err := database.DB.Exec(`UPDATE payload SET deleted=true WHERE id=$1`, payload.ID); err != nil {
					logging.LogError(err, "Failed to update payload deleted status")
				}
				// make sure to invalidate existing cache entries based on this payload UUID so new callbacks can't be created
				go rabbitmq.InvalidateCachedUUIDInfo(payload.UuID)
			}
		}
		if filemeta.EventGroupID.Valid {
			_, err = database.DB.Exec(`UPDATE eventgroup SET updated_at=$1 WHERE id=$2`,
				time.Now().UTC(), filemeta.EventGroupID.Int64)
			if err != nil {
				logging.LogError(err, "Failed to update eventgroup updated status")
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
					if err := database.DB.Get(&payload, `SELECT id, uuid FROM payload WHERE file_id=$1`, file.ID); err != nil {
						logging.LogError(err, "Failed to fetch payload for associated file_id")
					} else {
						payload.Deleted = true
						deletedPayloadIDs = append(deletedPayloadIDs, payload.ID)
						if _, err := database.DB.Exec(`UPDATE payload SET deleted=true WHERE id=$1`, payload.ID); err != nil {
							logging.LogError(err, "Failed to update payload deleted status")
						}
						go rabbitmq.InvalidateCachedUUIDInfo(payload.UuID)
					}
				}
				if _, err := database.DB.Exec(`UPDATE filemeta SET deleted=true WHERE id=$1`, file.ID); err != nil {
					logging.LogError(err, "Failed to update filemeta deleted status")
				}
			}
		}
	}
	return nil, deletedFileIDs, deletedPayloadIDs
}
