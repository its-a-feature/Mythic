package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskDisplayToRealIdSearchMessage struct {
	TaskDisplayID int     `json:"task_display_id"`
	OperationName *string `json:"operation_name"`
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
		Scopes:     []string{mythicjwt.SCOPE_TASK_READ},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskDisplayToRealIdSearch(input MythicRPCTaskDisplayToRealIdSearchMessage, authContext RabbitMQAuthContext) MythicRPCTaskDisplayToRealIdSearchMessageResponse {
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
			WHERE task.display_id=$1 AND operation.name=$2 AND task.operation_id=$3`
		task := databaseStructs.Task{}
		err := database.DB.Get(&task, searchString, input.TaskDisplayID, *input.OperationName, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to find task based on task id and operation name")
			response.Error = err.Error()
			return response
		}
		response.TaskID = task.ID
		response.Success = true
		return response
	}
	searchString = `SELECT 
    		task.id 
			FROM 
			task
			WHERE task.display_id=$1 AND task.operation_id=$2`
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, searchString, input.TaskDisplayID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to find task based on task id and operation id")
		response.Error = err.Error()
		return response
	}
	response.TaskID = task.ID
	response.Success = true
	return response
}
func processMythicRPCTaskDisplayToRealIdSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskDisplayToRealIdSearchMessage{}
	responseMsg := MythicRPCTaskDisplayToRealIdSearchMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCTaskDisplayToRealIdSearch(incomingMessage, authContext)
}
