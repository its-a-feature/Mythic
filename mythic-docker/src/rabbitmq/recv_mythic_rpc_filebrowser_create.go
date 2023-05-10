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
	if err := database.DB.Get(&task, `SELECT
	callback.operation_id "callback.operation_id",
	callback.host "callback.host"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id = $1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	} else if err := handleAgentMessagePostResponseFileBrowser(task, &input.FileBrowser); err != nil {
		logging.LogError(err, "Failed to create processes in MythicRPCProcessCreate")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		return response
	}
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
