package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackRemoveCommandMessage struct {
	TaskID          int      `json:"task_id"`
	AgentCallbackID string   `json:"agent_callback_id"`
	Commands        []string `json:"commands"` // required
	PayloadType     string   `json:"payload_type"`
	CallbackIDs     []int    `json:"callback_ids"`
}
type MythicRPCCallbackRemoveCommandMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_REMOVE_COMMAND,
		RoutingKey: MYTHIC_RPC_CALLBACK_REMOVE_COMMAND,
		Handler:    processMythicRPCCallbackRemoveCommand,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_REMOVE_COMMAND
func MythicRPCCallbackRemoveCommand(input MythicRPCCallbackRemoveCommandMessage) MythicRPCCallbackRemoveCommandMessageResponse {
	response := MythicRPCCallbackRemoveCommandMessageResponse{
		Success: false,
	}
	CallbackID := 0
	PayloadTypeID := 0
	task := databaseStructs.Task{}
	callback := databaseStructs.Callback{}
	if input.TaskID > 0 {
		err := database.DB.Get(&task, `SELECT
				callback.id "callback.id",
				payload.payload_type_id "callback.payload.payload_type_id"
				FROM task
				JOIN callback on task.callback_id = callback.id
				JOIN payload on callback.registered_payload_id = payload.id
				WHERE task.id=$1`, input.TaskID)
		if err != nil {
			logging.LogError(err, "Failed to find task in MythicRPCCallbackAddCommand")
			response.Error = err.Error()
			return response
		}
		CallbackID = task.Callback.ID
		PayloadTypeID = task.Callback.Payload.PayloadTypeID
	} else if input.AgentCallbackID != "" {
		err := database.DB.Get(&callback, `SELECT
    		callback.id, 
    		payload.payload_type_id "callback.payload.payload_type_id"
    		FROM callback
			JOIN payload on callback.registered_payload_id = payload.id
			WHERE callback.agent_callback_id = $1`, input.AgentCallbackID)
		if err != nil {
			logging.LogError(err, "Failed to find task in MythicRPCCallbackAddCommand")
			response.Error = err.Error()
			return response
		}
		CallbackID = callback.ID
		PayloadTypeID = callback.Payload.PayloadTypeID
	}
	if input.PayloadType != "" {
		err := database.DB.Get(&PayloadTypeID, `SELECT id FROM payloadtype WHERE "name"=$1`, input.PayloadType)
		if err != nil {
			logging.LogError(err, "Failed to find payload type in MythicRPCCallbackAddCommand")
			response.Error = err.Error()
			return response
		}
	}
	commandIDs := make([]int, len(input.Commands))
	for i, command := range input.Commands {
		err := database.DB.Get(&commandIDs[i], `SELECT
		id
		FROM command
		WHERE command.cmd=$1 AND command.payload_type_id=$2`,
			command, PayloadTypeID)
		if err != nil {
			logging.LogError(err, "Failed to find command to load")
			response.Error = err.Error()
			return response
		}
	}
	if len(input.CallbackIDs) > 0 {
		for _, c := range input.CallbackIDs {
			err := CallbackRemoveCommand(c, commandIDs)
			if err != nil {
				logging.LogError(err, "Failed to remove commands to callback")
				response.Error = err.Error()
				return response
			}
		}
		response.Success = true
		return response
	}
	if CallbackID == 0 {
		response.Error = "No callback supplied"
		return response
	}
	err := CallbackRemoveCommand(CallbackID, commandIDs)
	if err != nil {
		logging.LogError(err, "Failed to remove commands to callback")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}
func CallbackRemoveCommand(callbackID int, commands []int) error {
	for _, command := range commands {
		_, err := database.DB.Exec(`DELETE FROM loadedcommands WHERE command_id=$1 AND callback_id=$2`,
			command, callbackID)
		if err != nil {
			// we got some other sort of error
			logging.LogError(err, "Failed to delete loaded command")
			return err
		}
	}
	return nil
}
func processMythicRPCCallbackRemoveCommand(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackRemoveCommandMessage{}
	responseMsg := MythicRPCCallbackRemoveCommandMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackRemoveCommand(incomingMessage)
	}
	return responseMsg
}
