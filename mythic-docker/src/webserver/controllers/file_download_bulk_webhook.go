package webcontroller

import (
	"archive/zip"
	"fmt"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"io"
	"net/http"
	"os"
	"path/filepath"
	"strings"

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
	archive, err := os.Create(builkDownloadPath)
	if err != nil {
		logging.LogError(err, "Failed to create temp file for archive on disk")
		c.JSON(http.StatusOK, DownloadBulkFilesResponse{
			Status: "error",
			Error:  "Failed to create temp file for archive on disk",
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for ConsumingServicesTestLog")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	defer archive.Close()
	// set this for logging later
	c.Set("file_ids", input.Input.Files)
	zipWriter := zip.NewWriter(archive)
	for _, fileUUID := range input.Input.Files {
		filemeta := databaseStructs.Filemeta{}
		err = database.DB.Get(&filemeta,
			`SELECT * FROM filemeta WHERE 
				filemeta.agent_file_id=$1 AND 
				filemeta.deleted=false AND
				filemeta.operation_id=$2`,
			fileUUID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to get file from database")
			c.JSON(http.StatusOK, DownloadBulkFilesResponse{
				Status: "error",
				Error:  "Failed to get database information on specified files",
			})
			return
		}
		go tagFileAs(filemeta.ID, operatorOperation.CurrentOperator.Username, filemeta.OperationID, tagTypeDownload, nil, c, false)
		file, err := os.Open(filemeta.Path)
		if err != nil {
			logging.LogError(err, "Failed to open file", "path", filemeta.Path)
			c.JSON(http.StatusOK, DownloadBulkFilesResponse{
				Status: "error",
				Error:  "Failed to get read file from disk",
			})
			return
		}
		// construct a new filename that's HOST_filename_uuid.extension to help with unique-ness
		stringFileName := string(filemeta.Filename)
		justFileName := strings.TrimSuffix(stringFileName, filepath.Ext(stringFileName))
		justFileExtension := "." + filepath.Ext(stringFileName)
		if justFileExtension == "." {
			justFileExtension = ""
		}
		hostName := filemeta.Host
		if hostName == "" {
			hostName = "UNKNOWN"
		}
		newFileName := fmt.Sprintf("%s_%s_%s%s", hostName, justFileName, filemeta.AgentFileID, justFileExtension)
		fileWriter, err := zipWriter.Create(newFileName)
		if err != nil {
			logging.LogError(err, "Failed to create file entry in zip")
			c.JSON(http.StatusOK, DownloadBulkFilesResponse{
				Status: "error",
				Error:  "Failed to create file entry in zip",
			})
			return
		}
		_, err = io.Copy(fileWriter, file)
		if err != nil {
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
	fileSize, err := os.Stat(builkDownloadPath)
	if err != nil {
		logging.LogError(err, "Failed to get file size on disk")
	} else {
		zipFileMeta.Size = fileSize.Size()
		zipFileMeta.ChunkSize = int(zipFileMeta.Size)
	}
	fileData, err := os.ReadFile(zipFileMeta.Path)
	if err != nil {
		logging.LogError(err, "Failed to read new file off of disk")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	zipFileMeta.Md5 = mythicCrypto.HashMD5(fileData)
	zipFileMeta.Sha1 = mythicCrypto.HashSha1(fileData)
	zipFileMeta.Filename = []byte("BulkFileDownload.zip")
	zipFileMeta.OperatorID = operatorOperation.CurrentOperator.ID
	_, err = database.DB.NamedExec(`INSERT INTO filemeta
		("path", filename, total_chunks, chunks_received, complete, operation_id, operator_id, agent_file_id, size, md5, sha1, chunk_size)
		VALUES (:path, :filename, :total_chunks, :chunks_received, :complete, :operation_id, :operator_id, :agent_file_id, :size, :md5, :sha1, :chunk_size)
		`, zipFileMeta)
	if err != nil {
		logging.LogError(err, "Failed to save zip entry in database")
		c.JSON(http.StatusOK, DownloadBulkFilesResponse{
			Status: "error",
			Error:  "Failed to save zip entry in database",
		})
		return
	}
	c.JSON(http.StatusOK, DownloadBulkFilesResponse{
		Status: "success",
		FileID: bulkDownloadUUID,
	})
}
