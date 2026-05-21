package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileSearchMessage struct {
	TaskID              int    `json:"task_id"`
	CallbackID          int    `json:"callback_id"`
	Filename            string `json:"filename"`
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
		Scopes:     []string{mythicjwt.SCOPE_FILE_READ},
	})
}

func MythicRPCFileSearch(input MythicRPCFileSearchMessage, authContext RabbitMQAuthContext) MythicRPCFileSearchMessageResponse {
	response := MythicRPCFileSearchMessageResponse{
		Success: false,
	}
	callbackId := 0
	if input.AgentFileID != "" {
		// the search is for a specific fileID, so just fetch it and return
		fileMeta := databaseStructs.Filemeta{}
		err := database.DB.Get(&fileMeta, `SELECT 
    		filemeta.*
			FROM filemeta 
			WHERE filemeta.agent_file_id=$1 AND filemeta.operation_id=$2`, input.AgentFileID, authContext.OperationID)
		if errors.Is(err, sql.ErrNoRows) {
			payload := databaseStructs.Payload{}
			err = database.DB.Get(&payload, `SELECT
    			filemeta.path "filemeta.path",
    			filemeta.filename "filemeta.filename",
    			filemeta.id "filemeta.id",
    			filemeta.operation_id "filemeta.operation_id"
    			FROM payload
    			JOIN filemeta ON payload.file_id = filemeta.id 
    			WHERE payload.uuid=$1 AND payload.operation_id=$2`, input.AgentFileID, authContext.OperationID)
			if errors.Is(err, sql.ErrNoRows) {
				logging.LogError(err, "Failed to get file data from the database, it's not a payload uuid or file uuid")
				response.Error = err.Error()
				return response
			}
			if err != nil {
				logging.LogError(err, "Failed to get file data from database")
				response.Error = err.Error()
				return response
			}
		}
		if err != nil {
			logging.LogError(err, "Failed to get specified file in MythicRPCFileSearch")
			response.Error = err.Error()
			return response
		}
		response.Success = true
		response.Files = append(response.Files, convertFileMetaToFileData(fileMeta))
		return response

	}
	if input.CallbackID > 0 {
		callback := databaseStructs.Callback{ID: input.CallbackID}
		err := database.DB.Get(&callback, `
			SELECT operation_id, id 
			FROM callback 
			WHERE id=$1 AND operation_id=$2`, callback.ID, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to get operation in MythicRPCFileSearch")
			response.Error = err.Error()
			return response
		}
		callbackId = input.CallbackID
	} else if input.TaskID > 0 {
		task := databaseStructs.Task{ID: input.TaskID}
		err := database.DB.Get(&task, `SELECT 
    		operation_id, callback_id 
			FROM task 
			WHERE id=$1 AND operation_id=$2`, task.ID, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to get task from Mythic")
			response.Error = err.Error()
			return response
		}
		callbackId = task.CallbackID
	}
	files := []databaseStructs.Filemeta{}
	comment := "%%"
	filename := "%%"
	if input.Comment != "" && input.Comment != "*" {
		comment = "%" + input.Comment + "%"
	}
	if input.Filename != "" && input.Filename != "*" {
		filename = "%" + input.Filename + "%"
	}
	searchString := `SELECT 
    		filemeta.*
			FROM filemeta 
			WHERE filemeta.comment LIKE $1 AND filemeta.filename LIKE $2 AND is_payload=$3 AND is_download_from_agent=$4 AND 
			      is_screenshot=$5 AND deleted=false and filemeta.operation_id=$6 and filemeta.copy_of_file_id is NULL 
			ORDER BY id DESC`
	searchParameters := []interface{}{
		comment, filename, input.IsPayload, input.IsDownloadFromAgent, input.IsScreenshot, authContext.OperationID,
	}
	if input.MaxResults > 0 && !input.LimitByCallback {
		searchString += ` LIMIT $7`
		searchParameters = append(searchParameters, input.MaxResults)
	}
	if err := database.DB.Select(&files, searchString, searchParameters...); err != nil {
		response.Error = err.Error()
		logging.LogError(err, "Failed to get files by comment in MythicRPCFileSearch")
		return response
	}

	finalFiles := []FileData{}
	totalFound := 0
	//logging.LogInfo("found results", "length", len(files), "callbackid", input.CallbackID)
	for _, file := range files {
		if input.LimitByCallback {
			if file.TaskID.Valid {
				var fileCallbackID int
				if err := database.DB.Get(&fileCallbackID, `
					SELECT callback_id 
					FROM task 
					WHERE id=$1 AND operation_id=$2`, file.TaskID.Int64, authContext.OperationID); err != nil {
					logging.LogError(err, "Failed to get the task information for callback")
				} else if fileCallbackID == callbackId {
					//logging.LogInfo("found matching callback_id", "filename", string(file.Filename), "maxResults", input.MaxResults)
					if input.MaxResults > 0 && totalFound < input.MaxResults {
						finalFiles = append(finalFiles, convertFileMetaToFileData(file))
						totalFound += 1
					} else if input.MaxResults <= 0 {
						finalFiles = append(finalFiles, convertFileMetaToFileData(file))
					}
				}
			} else {
				// this means this file wasn't directly uploaded _just_ for this callback, but could be used in this callback anyway
				tasks := []databaseStructs.Task{}
				fileIDSearch := "%" + file.AgentFileID + "%"
				err := database.DB.Select(&tasks, `SELECT id FROM task WHERE
                        callback_id=$1 AND params LIKE $2 AND (status='success' OR status='completed') LIMIT 1`, callbackId, fileIDSearch)
				if err != nil {
					logging.LogError(err, "failed to search for tasks with params that include file id")
				} else if len(tasks) > 0 {
					if input.MaxResults > 0 && totalFound < input.MaxResults {
						finalFiles = append(finalFiles, convertFileMetaToFileData(file))
						totalFound += 1
					} else if input.MaxResults <= 0 {
						finalFiles = append(finalFiles, convertFileMetaToFileData(file))
					}
				}
			}

		} else {
			finalFiles = append(finalFiles, convertFileMetaToFileData(file))
		}
	}
	response.Success = true
	response.Files = finalFiles
	//logging.LogInfo("final files length", "length", len(finalFiles))
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
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCFileSearch(incomingMessage, authContext)
}
