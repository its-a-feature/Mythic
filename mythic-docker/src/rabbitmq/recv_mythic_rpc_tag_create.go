package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTagCreateMessage struct {
	TagTypeID    int                    `json:"tagtype_id"`
	URL          string                 `json:"url"`
	Source       string                 `json:"source"`
	Data         map[string]interface{} `json:"data"`
	TaskID       *int                   `json:"task_id"`
	FileID       *int                   `json:"file_id"`
	CredentialID *int                   `json:"credential_id"`
	MythicTreeID *int                   `json:"mythic_tree_id"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTagCreateMessageResponse struct {
	Success bool             `json:"success"`
	Error   string           `json:"error"`
	Tag     MythicRPCTagData `json:"tag"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TAG_CREATE,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TAG_CREATE,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTagCreate, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTagCreate(input MythicRPCTagCreateMessage) MythicRPCTagCreateMessageResponse {
	response := MythicRPCTagCreateMessageResponse{
		Success: false,
	}
	tag := databaseStructs.Tag{
		TagTypeID: input.TagTypeID,
		URL:       input.URL,
		Source:    input.Source,
		Data:      GetMythicJSONTextFromStruct(input.Data),
	}
	operationID := 0
	err := database.DB.Get(&operationID, "SELECT operation_id FROM tagtype WHERE id = $1", tag.TagTypeID)
	if err != nil {
		response.Success = false
		response.Error = err.Error()
		return response
	}
	tag.Operation = operationID
	if input.MythicTreeID != nil {
		mythicTree := databaseStructs.MythicTree{}
		err = database.DB.Get(&mythicTree, `SELECT id FROM mythictree WHERE id=$1 AND operation_id=$2`,
			*input.MythicTreeID, operationID)
		if err != nil {
			logging.LogError(nil, "Failed to get mythictree info")
			response.Success = false
			response.Error = err.Error()
			return response
		}
		tag.MythicTree.Valid = true
		tag.MythicTree.Int64 = int64(mythicTree.ID)
	}
	if input.FileID != nil {
		fileMeta := databaseStructs.Filemeta{}
		err = database.DB.Get(&fileMeta, `SELECT id FROM filemeta WHERE id=$1 AND operation_id=$2`,
			*input.FileID, operationID)
		if err != nil {
			logging.LogError(nil, "Failed to get filemeta info")
			response.Success = false
			response.Error = err.Error()
			return response
		}
		tag.FileMeta.Valid = true
		tag.FileMeta.Int64 = int64(fileMeta.ID)
	}
	if input.TaskID != nil {
		task := databaseStructs.Task{}
		err = database.DB.Get(&task, `SELECT id FROM task WHERE id=$1 AND operation_id=$2`,
			*input.TaskID, operationID)
		if err != nil {
			logging.LogError(nil, "Failed to get task info")
			response.Success = false
			response.Error = err.Error()
			return response
		}
		tag.Task.Valid = true
		tag.Task.Int64 = int64(task.ID)
	}
	if input.CredentialID != nil {
		credential := databaseStructs.Credential{}
		err = database.DB.Get(&credential, `SELECT id FROM credential WHERE id=$1 AND operation_id=$2`,
			*input.CredentialID, operationID)
		if err != nil {
			logging.LogError(nil, "Failed to get credential info")
			response.Success = false
			response.Error = err.Error()
			return response
		}
		tag.Credential.Valid = true
		tag.Credential.Int64 = int64(credential.ID)
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO tag 
		(operation_id, data, url, source, tagtype_id, mythictree_id, filemeta_id, task_id, response_id, credential_id, keylog_id, taskartifact_id)
		VALUES 
		(:operation_id, :data, :url, :source, :tagtype_id, :mythictree_id, :filemeta_id, :task_id, :response_id, :credential_id, :keylog_id, :taskartifact_id)
		RETURNING id`)
	if err != nil {
		logging.LogError(nil, "Failed to prepare statement for adding tag")
		response.Success = false
		response.Error = err.Error()
		return response
	}
	err = statement.Get(&tag.ID, tag)
	if err != nil {
		logging.LogError(nil, "Failed to get new tag info")
		response.Success = false
		response.Error = err.Error()
		return response
	}
	response.Tag = getTagDataFromDatabaseTag(tag)
	response.Success = true
	go func() {
		EventingChannel <- EventNotification{
			Trigger:     eventing.TriggerTagCreate,
			TagID:       tag.ID,
			OperationID: tag.Operation,
		}
	}()
	return response
}
func processMythicRPCTagCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTagCreateMessage{}
	responseMsg := MythicRPCTagCreateMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCTagCreate(incomingMessage)
}
