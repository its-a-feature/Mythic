package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackAddCommandMessage struct {
	TaskID   int      `json:"task_id"`  // required
	Commands []string `json:"commands"` // required
}
type MythicRPCCallbackAddCommandMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_ADD_COMMAND,
		RoutingKey: MYTHIC_RPC_CALLBACK_ADD_COMMAND,
		Handler:    processMythicRPCCallbackAddCommand,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_ADD_COMMAND
func MythicRPCCallbackAddCommand(input MythicRPCCallbackAddCommandMessage) MythicRPCCallbackAddCommandMessageResponse {
	response := MythicRPCCallbackAddCommandMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
		task.operator_id,
		callback.id "callback.id",
		payload.payload_type_id "callback.payload.payload_type_id"
		FROM task
		JOIN callback on task.callback_id = callback.id
		JOIN payload on callback.registered_payload_id = payload.id
		WHERE task.id=$1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to find task in MythicRPCCallbackAddCommand")
		response.Error = err.Error()
		return response
	} else {
		if err := CallbackAddCommand(task.Callback.ID, task.Callback.Payload.PayloadTypeID, task.OperatorID, input.Commands); err != nil {
			logging.LogError(err, "Failed to add commands to callback")
			response.Error = err.Error()
			return response
		} else {
			response.Success = true
			return response
		}
	}

}
func CallbackAddCommand(callbackID int, payloadtypeID int, operatorID int, commands []string) error {
	for _, command := range commands {
		logging.LogDebug("trying to add command", "cmd", command)
		// first check if the command is already loaded
		// if not, try to add it as a loaded command
		databaseCommand := databaseStructs.Command{}
		loadedCommand := databaseStructs.Loadedcommands{}
		if err := database.DB.Get(&databaseCommand, `SELECT
		id, "version"
		FROM command
		WHERE command.cmd=$1 AND command.payload_type_id=$2`,
			command, payloadtypeID); err != nil {
			logging.LogError(err, "Failed to find command to load")
			return errors.New("Failed to find command: " + command)
		} else if err := database.DB.Get(&loadedCommand, `SELECT id
		FROM loadedcommands
		WHERE command_id=$1 AND callback_id=$2`,
			databaseCommand.ID, callbackID); err == nil {
			continue
		} else if err == sql.ErrNoRows {
			// this never existed, so let's add it as a loaded command
			loadedCommand.Version = databaseCommand.Version
			loadedCommand.CallbackID = callbackID
			loadedCommand.CommandID = databaseCommand.ID
			loadedCommand.OperatorID = operatorID
			if _, err := database.DB.NamedExec(`INSERT INTO loadedcommands 
			("version", callback_id, command_id, operator_id)
			VALUES (:version, :callback_id, :command_id, :operator_id)`,
				loadedCommand); err != nil {
				logging.LogError(err, "Failed to mark command as loaded in callback")
				return err
			} else {
				continue
			}
		} else {
			// we got some other sort of error
			logging.LogError(err, "Failed to query database for loaded command")
			return err
		}
	}
	return nil
}
func processMythicRPCCallbackAddCommand(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackAddCommandMessage{}
	responseMsg := MythicRPCCallbackAddCommandMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackAddCommand(incomingMessage)
	}
	return responseMsg
}
