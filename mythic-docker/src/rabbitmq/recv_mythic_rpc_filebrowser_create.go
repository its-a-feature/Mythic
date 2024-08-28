package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCFileBrowserCreateMessage struct {
	TaskID      int                                       `json:"task_id"` //required
	FileBrowser MythicRPCFileBrowserCreateFileBrowserData `json:"filebrowser"`
}
type MythicRPCFileBrowserCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCFileBrowserCreateFileBrowserData = agentMessagePostResponseFileBrowser

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_FILEBROWSER_CREATE,
		RoutingKey: MYTHIC_RPC_FILEBROWSER_CREATE,
		Handler:    processMythicRPCFileBrowserCreate,
	})
}

// Endpoint: MYTHIC_RPC_FILEBROWSER_CREATE
func MythicRPCFileBrowserCreate(input MythicRPCFileBrowserCreateMessage) MythicRPCFileBrowserCreateMessageResponse {
	response := MythicRPCFileBrowserCreateMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT
		task.id, task.status, task.completed, task.status_timestamp_processed, task.operator_id, task.operation_id,
		task.apitokens_id, task.eventstepinstance_id,
		callback.host "callback.host",
		callback.user "callback.user",
		callback.id "callback.id",
		callback.display_id "callback.display_id",
		payload.payload_type_id "callback.payload.payload_type_id",
		payload.os "callback.payload.os"
		FROM task
		JOIN callback ON task.callback_id = callback.id
		JOIN payload ON callback.registered_payload_id = payload.id
		WHERE task.id = $1`, input.TaskID)
	if err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	}
	err = HandleAgentMessagePostResponseFileBrowser(task, &input.FileBrowser, int(task.APITokensID.Int64))
	if err != nil {
		logging.LogError(err, "Failed to create processes in MythicRPCFileBrowserCreate")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}
func processMythicRPCFileBrowserCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCFileBrowserCreateMessage{}
	responseMsg := MythicRPCFileBrowserCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCFileBrowserCreate(incomingMessage)
	}
	return responseMsg
}
