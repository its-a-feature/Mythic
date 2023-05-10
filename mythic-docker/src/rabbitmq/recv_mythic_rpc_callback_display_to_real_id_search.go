package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackDisplayToRealIdSearchMessage struct {
	CallbackDisplayID int     `json:"callback_display_id"`
	OperationName     *string `json:"operation_name"`
	OperationID       *int    `json:"operation_id"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCCallbackDisplayToRealIdSearchMessageResponse struct {
	Success    bool   `json:"success"`
	Error      string `json:"error"`
	CallbackID int    `json:"callback_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_DISPLAY_TO_REAL_ID_SEARCH, // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_CALLBACK_DISPLAY_TO_REAL_ID_SEARCH, // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCCallbackDisplayToRealIdSearch, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCCallbackDisplayToRealIdSearch(input MythicRPCCallbackDisplayToRealIdSearchMessage) MythicRPCCallbackDisplayToRealIdSearchMessageResponse {
	response := MythicRPCCallbackDisplayToRealIdSearchMessageResponse{
		Success: false,
	}
	searchString := ""
	if input.OperationName != nil {
		searchString = `SELECT 
    		callback.id 
			FROM 
			callback
			JOIN operation on callback.operation_id = operation.id
			WHERE callback.display_id=$1 AND operation.name=$2`
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, searchString, input.CallbackDisplayID, *input.OperationName); err != nil {
			logging.LogError(err, "Failed to find task based on task id and operation name")
			response.Error = err.Error()
			return response
		} else {
			response.CallbackID = callback.ID
			response.Success = true
			return response
		}
	} else if input.OperationID != nil {
		searchString = `SELECT 
    		callback.id 
			FROM 
			callback
			WHERE callback.display_id=$1 AND callback.operation_id=$2`
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, searchString, input.CallbackDisplayID, *input.OperationID); err != nil {
			logging.LogError(err, "Failed to find task based on task id and operation id")
			response.Error = err.Error()
			return response
		} else {
			response.CallbackID = callback.ID
			response.Success = true
			return response
		}
	} else {
		response.Error = "Must specify operation name or operation id"
		return response
	}
}
func processMythicRPCCallbackDisplayToRealIdSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackDisplayToRealIdSearchMessage{}
	responseMsg := MythicRPCCallbackDisplayToRealIdSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackDisplayToRealIdSearch(incomingMessage)
	}
	return responseMsg
}
