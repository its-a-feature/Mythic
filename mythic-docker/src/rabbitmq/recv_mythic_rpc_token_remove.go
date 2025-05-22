package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTokenRemoveMessage struct {
	TaskID int                             `json:"task_id"` //required
	Tokens []MythicRPCTokenRemoveTokenData `json:"tokens"`
}
type MythicRPCTokenRemoveMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCTokenRemoveTokenData = agentMessagePostResponseToken

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TOKEN_REMOVE,
		RoutingKey: MYTHIC_RPC_TOKEN_REMOVE,
		Handler:    processMythicRPCTokenRemove,
	})
}

// Endpoint: MYTHIC_RPC_TOKEN_REMOVE
func MythicRPCTokenRemove(input MythicRPCTokenRemoveMessage) MythicRPCTokenRemoveMessageResponse {
	response := MythicRPCTokenRemoveMessageResponse{
		Success: false,
	}
	if len(input.Tokens) == 0 {
		response.Success = true
		return response
	}
	for i := 0; i < len(input.Tokens); i++ {
		input.Tokens[i].Action = "remove"
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
	callback.operation_id "callback.operation_id",
	callback.host "callback.host",
	task.callback_id "task.callback_id"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id = $1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	} else if err := handleAgentMessagePostResponseTokens(task, &input.Tokens); err != nil {
		logging.LogError(err, "Failed to create processes in MythicRPCProcessCreate")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		return response
	}
}
func processMythicRPCTokenRemove(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTokenRemoveMessage{}
	responseMsg := MythicRPCTokenRemoveMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCTokenRemove(incomingMessage)
	}
	return responseMsg
}
