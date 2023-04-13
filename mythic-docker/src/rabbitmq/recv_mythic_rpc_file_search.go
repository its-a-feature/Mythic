package rabbitmq

import (
	"encoding/json"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileSearchMessage struct {
	TaskID              int    `json:"task_id"`
	CallbackID          int    `json:"callback_id"`
	Filename            string `json:"filename"`
	OperationId         int    `json:"operation_id"`
	LimitByCallback     bool   `json:"limit_by_callback"`
	MaxResults          int    `json:"max_results"`
	Comment             string `json:"comment"`
	AgentFileID         string `json:"file_id"`
	IsPayload           bool   `json:"is_payload"`
	IsDownloadFromAgent bool   `json:"is_download_from_agent"`
	IsScreenshot        bool   `json:"is_screenshot"`
}
type FileData struct {
	AgentFileId         string    `json:"agent_file_id"`
	Filename            string    `json:"filename"`
	Comment             string    `json:"comment"`
	Complete            bool      `json:"complete"`
	IsPayload           bool      `json:"is_payload"`
	IsDownloadFromAgent bool      `json:"is_download_from_agent"`
	IsScreenshot        bool      `json:"is_screenshot"`
	FullRemotePath      string    `json:"full_remote_path"`
	Host                string    `json:"host"`
	TaskID              int       `json:"task_id"`
	Md5                 string    `json:"md5"`
	Sha1                string    `json:"sha1"`
	Timestamp           time.Time `json:"timestamp"`
	Command             string    `json:"cmd"`
	Tags                []string  `json:"tags"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCFileSearchMessageResponse struct {
	Success bool       `json:"success"`
	Error   string     `json:"error"`
	Files   []FileData `json:"files"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILE_SEARCH,
		RoutingKey: MYTHIC_RPC_FILE_SEARCH,
		Handler:    processMythicRPCFileSearch,
	})
}

func MythicRPCFileSearch(input MythicRPCFileSearchMessage) MythicRPCFileSearchMessageResponse {
	response := MythicRPCFileSearchMessageResponse{
		Success: false,
	}
	var callbackId int
	var operationId int
	if input.AgentFileID != "" {
		// the search is for a specific fileID, so just fetch it and return
		fileMeta := databaseStructs.Filemeta{}
		if err := database.DB.Get(&fileMeta, `SELECT 
    		filemeta.*
			FROM filemeta 
			WHERE filemeta.agent_file_id=$1`, input.AgentFileID); err != nil {
			logging.LogError(err, "Failed to get specified file in MythicRPCFileSearch")
			response.Error = err.Error()
			return response
		} else {
			response.Success = true
			response.Files = append(response.Files, convertFileMetaToFileData(fileMeta))
			return response
		}
	} else if input.CallbackID > 0 {
		callback := databaseStructs.Callback{ID: input.CallbackID}
		if err := database.DB.Get(&callback, `SELECT operation_id, id FROM callback WHERE id=$1`, callback.ID); err != nil {
			logging.LogError(err, "Failed to get operation in MythicRPCFileSearch")
			response.Error = err.Error()
			return response
		} else {
			operationId = callback.OperationID
			callbackId = input.CallbackID
		}
	} else if input.TaskID > 0 {
		task := databaseStructs.Task{ID: input.TaskID}
		if err := database.DB.Get(&task, `SELECT operation_id, callback_id FROM task WHERE id=$1`, task.ID); err != nil {
			logging.LogError(err, "Failed to get task from Mythic")
			response.Error = err.Error()
			return response
		} else {
			operationId = task.OperationID
			callbackId = task.CallbackID
		}
	} else if input.OperationId == 0 {
		response.Success = false
		response.Error = "Must supply callbackID or operationID if not searching for a specific file"
		return response
	} else {
		operationId = input.OperationId
		callbackId = 0
	}
	files := []databaseStructs.Filemeta{}
	if input.Comment != "" {
		if input.Comment == "*" {
			input.Comment = "%_%"
		} else {
			input.Comment = "%" + input.Comment + "%"
		}
		searchString := `SELECT 
    		filemeta.*
			FROM filemeta 
			WHERE filemeta.comment LIKE $1 AND is_payload=$2 AND is_download_from_agent=$3 AND is_screenshot=$4 AND deleted=false and filemeta.operation_id=$5
			ORDER BY id DESC`
		searchParameters := []interface{}{
			input.Filename, input.IsPayload, input.IsDownloadFromAgent, input.IsScreenshot, operationId,
		}
		if input.MaxResults > 0 {
			searchString += ` LIMIT $6`
			searchParameters = append(searchParameters, input.MaxResults)
		}
		if err := database.DB.Select(&files, searchString, searchParameters...); err != nil {
			response.Error = err.Error()
			logging.LogError(err, "Failed to get files by comment in MythicRPCFileSearch")
			return response
		}
	} else {
		if input.Filename == "" {
			input.Filename = "%_%"
		} else {
			input.Filename = "%" + input.Filename + "%"
		}
		searchString := `SELECT 
			*
			FROM filemeta 
			WHERE filename LIKE $1 AND is_payload=$2 AND is_download_from_agent=$3 AND is_screenshot=$4 AND deleted=false AND operation_id=$5
			ORDER BY id DESC `
		searchParameters := []interface{}{
			input.Filename, input.IsPayload, input.IsDownloadFromAgent, input.IsScreenshot, operationId,
		}
		if input.MaxResults > 0 {
			searchString += ` LIMIT $6`
			searchParameters = append(searchParameters, input.MaxResults)
		}
		if err := database.DB.Select(&files, searchString, searchParameters...); err != nil {
			response.Error = err.Error()
			logging.LogError(err, "Failed to get files by filename in MythicRPCFileSearch")
			return response
		}
	}

	finalFiles := []FileData{}
	for _, file := range files {
		if input.LimitByCallback {
			if file.TaskID.Valid {
				var fileCallbackID int
				if err := database.DB.Get(&fileCallbackID, `SELECT callback_id FROM task WHERE id=$1`, file.TaskID.Int64); err != nil {
					logging.LogError(err, "Failed to get the task information for callback")
				} else if fileCallbackID == callbackId {
					finalFiles = append(finalFiles, convertFileMetaToFileData(file))
				}
			}
		} else {
			finalFiles = append(finalFiles, convertFileMetaToFileData(file))
		}
	}
	response.Success = true
	response.Files = finalFiles
	return response

}
func convertFileMetaToFileData(filemeta databaseStructs.Filemeta) FileData {
	data := FileData{}
	data.Filename = string(filemeta.Filename)
	data.AgentFileId = filemeta.AgentFileID
	data.Comment = filemeta.Comment
	data.Complete = filemeta.Complete
	data.IsDownloadFromAgent = filemeta.IsDownloadFromAgent
	data.IsPayload = filemeta.IsPayload
	data.IsScreenshot = filemeta.IsScreenshot
	data.FullRemotePath = string(filemeta.FullRemotePath)
	data.Host = filemeta.Host
	data.TaskID = int(filemeta.TaskID.Int64)
	data.Md5 = filemeta.Md5
	data.Sha1 = filemeta.Sha1
	data.Timestamp = filemeta.Timestamp
	if filemeta.TaskID.Valid {
		if err := database.DB.Get(&data.Command, `SELECT
    		command_name
    		FROM task
    		WHERE id=$1`, filemeta.TaskID.Int64); err != nil {
			logging.LogError(err, "Failed to get command name from task associated with file")
		}
	}
	return data
}
func processMythicRPCFileSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileSearchMessage{}
	responseMsg := MythicRPCFileSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCFileSearch(incomingMessage)
	}
	return responseMsg
}
