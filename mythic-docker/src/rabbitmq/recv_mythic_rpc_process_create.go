package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCProcessCreateMessage struct {
	TaskID    int                                 `json:"task_id"` //required
	Processes []MythicRPCProcessCreateProcessData `json:"processes"`
}
type MythicRPCProcessCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCProcessCreateProcessData = agentMessagePostResponseProcesses

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PROCESS_CREATE,
		RoutingKey: MYTHIC_RPC_PROCESS_CREATE,
		Handler:    processMythicRPCProcessCreate,
	})
}

// Endpoint: MYTHIC_RPC_PROCESS_CREATE
func MythicRPCProcessCreate(input MythicRPCProcessCreateMessage) MythicRPCProcessCreateMessageResponse {
	response := MythicRPCProcessCreateMessageResponse{
		Success: false,
	}
	if len(input.Processes) == 0 {
		response.Success = true
		return response
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
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
		WHERE task.id = $1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	} else if err := HandleAgentMessagePostResponseProcesses(task, &input.Processes, int(task.APITokensID.Int64)); err != nil {
		logging.LogError(err, "Failed to create processes in MythicRPCProcessCreate")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		return response
	}
}
func processMythicRPCProcessCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCProcessCreateMessage{}
	responseMsg := MythicRPCProcessCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCProcessCreate(incomingMessage)
	}
	return responseMsg
}
