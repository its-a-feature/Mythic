package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCredentialCreateMessage struct {
	TaskID      int                                       `json:"task_id"` //required
	Credentials []MythicRPCCredentialCreateCredentialData `json:"credentials"`
}
type MythicRPCCredentialCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCCredentialCreateCredentialData = agentMessagePostResponseCredentials

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CREDENTIAL_CREATE,
		RoutingKey: MYTHIC_RPC_CREDENTIAL_CREATE,
		Handler:    processMythicRPCCredentialCreate,
	})
}

// Endpoint: MYTHIC_RPC_CREDENTIAL_CREATE
func MythicRPCCredentialCreate(input MythicRPCCredentialCreateMessage) MythicRPCCredentialCreateMessageResponse {
	response := MythicRPCCredentialCreateMessageResponse{
		Success: false,
	}
	if len(input.Credentials) == 0 {
		response.Success = true
		return response
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
	task.operation_id,
	task.operator_id,
	task.id,
	callback.host "callback.host"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id = $1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	} else if err := handleAgentMessagePostResponseCredentials(task, &input.Credentials); err != nil {
		logging.LogError(err, "Failed to create credentials in MythicRPCCredentialCreate")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		return response
	}
}
func processMythicRPCCredentialCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCredentialCreateMessage{}
	responseMsg := MythicRPCCredentialCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCredentialCreate(incomingMessage)
	}
	return responseMsg
}
