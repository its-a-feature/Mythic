package rabbitmq

import (
	"crypto/md5"
	"crypto/sha1"
	"encoding/json"
	"fmt"
	"os"
	"strings"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileCreateMessage struct {
	TaskID              int    `json:"task_id"`
	FileContents        []byte `json:"file_contents"`
	DeleteAfterFetch    bool   `json:"delete_after_fetch"`
	Filename            string `json:"filename"`
	IsScreenshot        bool   `json:"is_screenshot"`
	IsDownloadFromAgent bool   `json:"is_download"`
	RemotePathOnTarget  []byte `json:"remote_path"`
	TargetHostName      string `json:"host"`
	Comment             string `json:"comment"`
}
type MythicRPCFileCreateMessageResponse struct {
	Success     bool   `json:"success"`
	Error       string `json:"error"`
	AgentFileId string `json:"agent_file_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILE_CREATE,
		RoutingKey: MYTHIC_RPC_FILE_CREATE,
		Handler:    processMythicRPCFileCreate,
	})
}

// Endpoint: MYTHIC_RPC_FILE_CREATE
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCFileCreate(input MythicRPCFileCreateMessage) MythicRPCFileCreateMessageResponse {
	response := MythicRPCFileCreateMessageResponse{
		Success: false,
	}
	var err error
	task := databaseStructs.Task{}
	fileData := databaseStructs.Filemeta{
		AgentFileID:         uuid.New().String(),
		TotalChunks:         1,
		ChunksReceived:      1,
		ChunkSize:           len(input.FileContents),
		Complete:            true,
		Comment:             input.Comment,
		DeleteAfterFetch:    input.DeleteAfterFetch,
		IsScreenshot:        input.IsScreenshot,
		IsDownloadFromAgent: input.IsDownloadFromAgent,
		IsPayload:           false,
	}
	fileData.FullRemotePath = input.RemotePathOnTarget
	fileData.Filename = []byte(uuid.New().String())
	fileData.AgentFileID, fileData.Path, err = GetSaveFilePath()
	if err != nil {
		response.Error = err.Error()
		return response
	}
	if input.TaskID > 0 {
		if err := database.DB.Get(&task, `SELECT
		task.operator_id, 
		callback.operation_id "callback.operation_id",
		callback.host "callback.host"
		FROM
		task
		JOIN callback ON task.callback_id = callback.id
		WHERE
		task.id=$1`, input.TaskID); err != nil {
			response.Error = "Must supply a valid task ID"
			return response
		} else {
			if len(input.Filename) != 0 {
				fileData.Filename = []byte(input.Filename)
			}
			if input.TargetHostName == "" {
				fileData.Host = task.Callback.Host
			} else {
				fileData.Host = strings.ToUpper(input.TargetHostName)
			}
			if input.Comment == "" {
				fileData.Comment = fmt.Sprintf("Created from task %d", input.TaskID)
			}
			fileData.TaskID.Int64 = int64(input.TaskID)
			fileData.TaskID.Valid = true
			fileData.OperationID = task.Callback.OperationID
			fileData.OperatorID = task.OperatorID
			if err := os.WriteFile(fileData.Path, input.FileContents, 0600); err != nil {
				logging.LogError(err, "Failed to write file to disk")
				response.Error = err.Error()
				return response
			} else {
				sha1Sum := sha1.Sum(input.FileContents)
				fileData.Sha1 = fmt.Sprintf("%x", sha1Sum)
				md5Sum := md5.Sum(input.FileContents)
				fileData.Md5 = fmt.Sprintf("%x", md5Sum)
				if statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta 
			(filename,total_chunks,chunks_received,chunk_size,path,operation_id,complete,comment,operator_id,delete_after_fetch,md5,sha1,agent_file_id,full_remote_path,task_id,is_screenshot,is_download_from_agent,host)
			VALUES (:filename, :total_chunks, :chunks_received, :chunk_size, :path, :operation_id, :complete, :comment, :operator_id, :delete_after_fetch, :md5, :sha1, :agent_file_id, :full_remote_path, :task_id, :is_screenshot, :is_download_from_agent, :host)
			RETURNING id`); err != nil {
					logging.LogError(err, "Failed to save file metadata to database")
					response.Error = err.Error()
					return response
				} else if err = statement.Get(&fileData.ID, fileData); err != nil {
					logging.LogError(err, "Failed to save file to database")
					response.Error = err.Error()
					return response
				} else {
					logging.LogDebug("creating new file", "filedata", fileData)
					response.Success = true
					response.AgentFileId = fileData.AgentFileID
					go EmitFileLog(fileData.ID)
					return response
				}
			}
		}
	} else {
		response.Error = "Must supply a task ID"
		return response
	}
}
func processMythicRPCFileCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileCreateMessage{}
	responseMsg := MythicRPCFileCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCFileCreate(incomingMessage)
	}
	return responseMsg
}
