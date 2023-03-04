package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTokenCreateMessage struct {
	TaskID int                             `json:"task_id"` //required
	Tokens []MythicRPCTokenCreateTokenData `json:"tokens"`
}
type MythicRPCTokenCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCTokenCreateTokenData = agentMessagePostResponseToken

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TOKEN_CREATE,
		RoutingKey: MYTHIC_RPC_TOKEN_CREATE,
		Handler:    processMythicRPCTokenCreate,
	})
}

// Endpoint: MYTHIC_RPC_TOKEN_CREATE
func MythicRPCTokenCreate(input MythicRPCTokenCreateMessage) MythicRPCTokenCreateMessageResponse {
	response := MythicRPCTokenCreateMessageResponse{
		Success: false,
	}
	if len(input.Tokens) == 0 {
		response.Success = true
		return response
	}
	for i := 0; i < len(input.Tokens); i++ {
		input.Tokens[i].Action = "add"
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
	} else if err := handleAgentMessagePostResponseTokens(task, &input.Tokens); err != nil {
		logging.LogError(err, "Failed to create processes in MythicRPCProcessCreate")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		return response
	}
}
func processMythicRPCTokenCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTokenCreateMessage{}
	responseMsg := MythicRPCTokenCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCTokenCreate(incomingMessage)
	}
	return responseMsg
}
