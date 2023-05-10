package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskDisplayToRealIdSearchMessage struct {
	TaskDisplayID int     `json:"task_display_id"`
	OperationName *string `json:"operation_name"`
	OperationID   *int    `json:"operation_id"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTaskDisplayToRealIdSearchMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	TaskID  int    `json:"task_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TASK_DISPLAY_TO_REAL_ID_SEARCH, // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TASK_DISPLAY_TO_REAL_ID_SEARCH, // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTaskDisplayToRealIdSearch, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskDisplayToRealIdSearch(input MythicRPCTaskDisplayToRealIdSearchMessage) MythicRPCTaskDisplayToRealIdSearchMessageResponse {
	response := MythicRPCTaskDisplayToRealIdSearchMessageResponse{
		Success: false,
	}
	searchString := ""
	if input.OperationName != nil {
		searchString = `SELECT 
    		task.id 
			FROM 
			task
			JOIN operation on task.operation_id = operation.id
			WHERE task.display_id=$1 AND operation.name=$2`
		task := databaseStructs.Task{}
		if err := database.DB.Get(&task, searchString, input.TaskDisplayID, *input.OperationName); err != nil {
			logging.LogError(err, "Failed to find task based on task id and operation name")
			response.Error = err.Error()
			return response
		} else {
			response.TaskID = task.ID
			response.Success = true
			return response
		}
	} else if input.OperationID != nil {
		searchString = `SELECT 
    		task.id 
			FROM 
			task
			WHERE task.display_id=$1 AND task.operation_id=$2`
		task := databaseStructs.Task{}
		if err := database.DB.Get(&task, searchString, input.TaskDisplayID, *input.OperationID); err != nil {
			logging.LogError(err, "Failed to find task based on task id and operation id")
			response.Error = err.Error()
			return response
		} else {
			response.TaskID = task.ID
			response.Success = true
			return response
		}
	} else {
		response.Error = "Must specify operation name or operation id"
		return response
	}
}
func processMythicRPCTaskDisplayToRealIdSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskDisplayToRealIdSearchMessage{}
	responseMsg := MythicRPCTaskDisplayToRealIdSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCTaskDisplayToRealIdSearch(incomingMessage)
	}
	return responseMsg
}
