package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackTokenRemoveMessage struct {
	TaskID         int                                             `json:"task_id"` //required
	CallbackTokens []MythicRPCCallbackTokenRemoveCallbackTokenData `json:"callbacktokens"`
}
type MythicRPCCallbackTokenRemoveMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCCallbackTokenRemoveCallbackTokenData = agentMessagePostResponseCallbackTokens

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACKTOKEN_REMOVE,
		RoutingKey: MYTHIC_RPC_CALLBACKTOKEN_REMOVE,
		Handler:    processMythicRPCCallbackTokenRemove,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACKTOKEN_CREATE
func MythicRPCCallbackTokenRemove(input MythicRPCCallbackTokenRemoveMessage) MythicRPCCallbackTokenRemoveMessageResponse {
	response := MythicRPCCallbackTokenRemoveMessageResponse{
		Success: false,
	}
	if len(input.CallbackTokens) == 0 {
		response.Success = true
		return response
	}
	task := databaseStructs.Task{}
	for i := 0; i < len(input.CallbackTokens); i++ {
		input.CallbackTokens[i].Action = "remove"
	}
	if err := database.DB.Get(&task, `SELECT
		task.id, task.status, task.completed, task.status_timestamp_processed, task.operator_id, task.operation_id,
		callback.host "callback.host",
		callback.user "callback.user",
		callback.id "callback.id",
		callback.display_id "callback.display_id",
		payload.payload_type_id "callback.payload.payload_type_id",
		payload.os "callback.payload.os"
		FROM task
		JOIN callback ON task.callback_id = callback.id
		JOIN payload ON callback.registered_payload_id = payload.id
		WHERE task.id = $1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	} else if err := handleAgentMessagePostResponseCallbackTokens(task, &input.CallbackTokens); err != nil {
		logging.LogError(err, "Failed to create processes in MythicRPCProcessCreate")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		return response
	}
}
func processMythicRPCCallbackTokenRemove(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackTokenRemoveMessage{}
	responseMsg := MythicRPCCallbackTokenRemoveMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackTokenRemove(incomingMessage)
	}
	return responseMsg
}
