package webcontroller

import (
	"archive/zip"
	"io"
	"net/http"
	"os"
	"path/filepath"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type DownloadBulkFilesInput struct {
	Input DownloadBulkFiles `json:"input" binding:"required"`
}

type DownloadBulkFiles struct {
	Files []string `json:"files" binding:"required"`
}

type DownloadBulkFilesResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
	FileID string `json:"file_id"`
}

func DownloadBulkFilesWebhook(c *gin.Context) {
	// get variables from the POST request
	var input DownloadBulkFilesInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, DownloadBulkFilesResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	bulkDownloadUUID := uuid.New().String()
	builkDownloadPath := filepath.Join(".", "files", bulkDownloadUUID)
	if archive, err := os.Create(builkDownloadPath); err != nil {
		logging.LogError(err, "Failed to create temp file for archive on disk")
		c.JSON(http.StatusOK, DownloadBulkFilesResponse{
			Status: "error",
			Error:  "Failed to create temp file for archive on disk",
		})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(err, "Failed to get operatorOperation information for ConsumingServicesTestLog")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		defer archive.Close()
		zipWriter := zip.NewWriter(archive)
		for _, fileUUID := range input.Input.Files {
			filemeta := databaseStructs.Filemeta{}
			if err := database.DB.Get(&filemeta,
				`SELECT * FROM filemeta WHERE 
				filemeta.agent_file_id=$1 AND 
				filemeta.deleted=false AND
				filemeta.operation_id=$2`,
				fileUUID, operatorOperation.CurrentOperation.ID); err != nil {
				logging.LogError(err, "Failed to get file from database")
				c.JSON(http.StatusOK, DownloadBulkFilesResponse{
					Status: "error",
					Error:  "Failed to get database information on specified files",
				})
				return
			} else if file, err := os.Open(filemeta.Path); err != nil {
				logging.LogError(err, "Failed to open file", "path", filemeta.Path)
				c.JSON(http.StatusOK, DownloadBulkFilesResponse{
					Status: "error",
					Error:  "Failed to get read file from disk",
				})
				return
			} else if fileWriter, err := zipWriter.Create(string(filemeta.Filename)); err != nil {
				logging.LogError(err, "Failed to create file entry in zip")
				c.JSON(http.StatusOK, DownloadBulkFilesResponse{
					Status: "error",
					Error:  "Failed to create file entry in zip",
				})
				return
			} else if _, err := io.Copy(fileWriter, file); err != nil {
				logging.LogError(err, "Failed to write file entry in zip")
				c.JSON(http.StatusOK, DownloadBulkFilesResponse{
					Status: "error",
					Error:  "Failed to write file entry in zip",
				})
				return
			}
		}
		zipWriter.Close()
		zipFileMeta := databaseStructs.Filemeta{
			Path:           builkDownloadPath,
			TotalChunks:    1,
			ChunksReceived: 1,
			Complete:       true,
			OperationID:    operatorOperation.CurrentOperation.ID,
			AgentFileID:    bulkDownloadUUID,
		}
		zipFileMeta.Filename = []byte("BulkFileDownload.zip")
		zipFileMeta.OperatorID = operatorOperation.CurrentOperator.ID
		if _, err := database.DB.NamedExec(`INSERT INTO filemeta
		("path", filename, total_chunks, chunks_received, complete, operation_id, operator_id, agent_file_id)
		VALUES (:path, :filename, :total_chunks, :chunks_received, :complete, :operation_id, :operator_id, :agent_file_id)
		`, zipFileMeta); err != nil {
			logging.LogError(err, "Failed to save zip entry in database")
			c.JSON(http.StatusOK, DownloadBulkFilesResponse{
				Status: "error",
				Error:  "Failed to save zip entry in database",
			})
			return
		} else {
			c.JSON(http.StatusOK, DownloadBulkFilesResponse{
				Status: "success",
				FileID: bulkDownloadUUID,
			})
		}
	}
}
