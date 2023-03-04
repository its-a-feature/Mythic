package rabbitmq

import (
	"database/sql"
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCPayloadRemoveCommandMessage struct {
	PayloadUUID string   `json:"payload_uuid"` //required
	Commands    []string `json:"commands"`     // required
}
type MythicRPCPayloadRemoveCommandMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PAYLOAD_REMOVE_COMMAND,
		RoutingKey: MYTHIC_RPC_PAYLOAD_REMOVE_COMMAND,
		Handler:    processMythicRPCPayloadRemoveCommand,
	})
}

// Endpoint: MYTHIC_RPC_PAYLOAD_REMOVE_COMMAND
func MythicRPCPayloadRemoveCommand(input MythicRPCPayloadRemoveCommandMessage) MythicRPCPayloadRemoveCommandMessageResponse {
	response := MythicRPCPayloadRemoveCommandMessageResponse{
		Success: false,
	}
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT payload.id, payload.payload_type_id 
	FROM payload
	WHERE uuid=$1`, input.PayloadUUID); err != nil {
		logging.LogError(err, "Failed to fetch callback in MythicRPCPayloadRemoveCommand")
		response.Error = err.Error()
		return response
	} else {
		if err := PayloadRemoveCommand(payload.ID, payload.PayloadTypeID, input.Commands); err != nil {
			logging.LogError(err, "Failed to remove commands in payload")
			response.Error = err.Error()
			return response
		} else {
			response.Success = true
			return response
		}
	}
}
func PayloadRemoveCommand(PayloadID int, payloadtypeID int, commands []string) error {
	for _, command := range commands {
		// first check if the command is already loaded
		databaseCommand := databaseStructs.Command{}
		loadedCommand := databaseStructs.Payloadcommand{}
		if err := database.DB.Get(&databaseCommand, `SELECT
		id, "version"
		FROM command
		WHERE command.cmd=$1 AND command.payload_type_id=$2`,
			command, payloadtypeID); err != nil {
			logging.LogError(err, "Failed to find command to load")
			return err
		} else if err := database.DB.Get(&loadedCommand, `SELECT id
		FROM payloadcommand
		WHERE command_id=$1 AND payload_id=$2`,
			databaseCommand.ID, PayloadID); err == nil {
			// the command is loaded, so remove it
			if _, err := database.DB.NamedExec(`DELETE FROM payloadcommand WHERE id=:id`, loadedCommand); err != nil {
				logging.LogError(err, "Failed to remove command from payload")
				return err
			}
		} else if err == sql.ErrNoRows {
			// this never existed, so move on
			continue
		} else {
			// we got some other sort of error
			logging.LogError(err, "Failed to query database for loaded command")
			return err
		}
	}
	return nil
}
func processMythicRPCPayloadRemoveCommand(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCPayloadRemoveCommandMessage{}
	responseMsg := MythicRPCPayloadRemoveCommandMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCPayloadRemoveCommand(incomingMessage)
	}
	return responseMsg
}
