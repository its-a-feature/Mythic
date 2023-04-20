package rabbitmq

import (
	"encoding/json"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCOperationEventLogCreateMessage struct {
	// three optional ways to specify the operation
	TaskId          *int    `json:"task_id"`
	CallbackId      *int    `json:"callback_id"`
	CallbackAgentId *string `json:"callback_agent_id"`
	OperationId     *int    `json:"operation_id"`
	// the data to store
	Message      string                 `json:"message"`
	MessageLevel database.MESSAGE_LEVEL `json:"level"` //info or warning
}
type MythicRPCOperationEventLogCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_EVENTLOG_CREATE,
		RoutingKey: MYTHIC_RPC_EVENTLOG_CREATE,
		Handler:    processMythicRPCOperationEventLogCreate,
	})
}

// Endpoint: MYTHIC_RPC_OPERATIONEVENTLOG_CREATE
func MythicRPCOperationEventLogCreate(input MythicRPCOperationEventLogCreateMessage) MythicRPCOperationEventLogCreateMessageResponse {
	response := MythicRPCOperationEventLogCreateMessageResponse{
		Success: false,
	}
	operationId := 0
	if input.TaskId != nil {
		task := databaseStructs.Task{}
		if err := database.DB.Get(&task, `SELECT operation_id FROM task WHERE id=$1`, input.TaskId); err != nil {
			logging.LogError(err, "Failed to find task for creating operation event log")
			response.Error = err.Error()
			return response
		} else {
			operationId = task.OperationID
		}
	} else if input.CallbackId != nil {
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, `SELECT operation_id FROM callback WHERE id=$1`, input.CallbackId); err != nil {
			logging.LogError(err, "Failed to find callback for creating operation event log")
			response.Error = err.Error()
			return response
		} else {
			operationId = callback.OperationID
		}
	} else if input.CallbackAgentId != nil {
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, `SELECT operation_id FROM callback WHERE agent_callback_id=$1`, input.CallbackAgentId); err != nil {
			logging.LogError(err, "Failed to find callback for creating operation event log")
			response.Error = err.Error()
			return response
		} else {
			operationId = callback.OperationID
		}
	} else if input.OperationId != nil {
		operationId = *input.OperationId
	}
	SendAllOperationsMessage(input.Message, operationId, "", input.MessageLevel)
	response.Success = true
	return response
}
func processMythicRPCOperationEventLogCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCOperationEventLogCreateMessage{}
	responseMsg := MythicRPCOperationEventLogCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCOperationEventLogCreate(incomingMessage)
	}
	return responseMsg
}
