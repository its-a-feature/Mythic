package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCPayloadAddCommandMessage struct {
	PayloadUUID string   `json:"payload_uuid"` //required
	Commands    []string `json:"commands"`     // required
}
type MythicRPCPayloadAddCommandMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PAYLOAD_ADD_COMMAND,
		RoutingKey: MYTHIC_RPC_PAYLOAD_ADD_COMMAND,
		Handler:    processMythicRPCPayloadAddCommand,
		Scopes:     []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
	})
}

// Endpoint: MYTHIC_RPC_PAYLOAD_ADD_COMMAND
func MythicRPCPayloadAddCommand(input MythicRPCPayloadAddCommandMessage, authContext RabbitMQAuthContext) MythicRPCPayloadAddCommandMessageResponse {
	response := MythicRPCPayloadAddCommandMessageResponse{
		Success: false,
	}
	payload := databaseStructs.Payload{}
	err := database.DB.Get(&payload, `SELECT 
    payload.id, payload_type_id
	FROM payload
	WHERE uuid=$1 AND operation_id=$2`, input.PayloadUUID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to fetch payload in MythicRPCPayloadAddCommand")
		response.Error = err.Error()
		return response
	}
	err = PayloadAddCommand(payload.ID, payload.PayloadTypeID, input.Commands)
	if err != nil {
		logging.LogError(err, "Failed to add commands to callback")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}
func PayloadAddCommand(PayloadID int, payloadtypeID int, commands []string) error {
	for _, command := range commands {
		// first check if the command is already loaded
		// if not, try to add it as a loaded command
		databaseCommand := databaseStructs.Command{}
		loadedCommand := databaseStructs.Payloadcommand{}
		if err := database.DB.Get(&databaseCommand, `SELECT
		id, "version"
		FROM command
		WHERE command.cmd=$1 AND command.payload_type_id=$2`,
			command, payloadtypeID); err != nil {
			logging.LogError(err, "Failed to find command to load")
			return errors.New("Failed to find command: " + command)
		} else if err := database.DB.Get(&loadedCommand, `SELECT id
		FROM payloadcommand
		WHERE command_id=$1 AND payload_id=$2`,
			databaseCommand.ID, PayloadID); err == nil {
			continue
		} else if err == sql.ErrNoRows {
			// this never existed, so let's add it as a loaded command
			loadedCommand.Version = databaseCommand.Version
			loadedCommand.PayloadID = PayloadID
			loadedCommand.CommandID = databaseCommand.ID
			if _, err := database.DB.NamedExec(`INSERT INTO payloadcommand 
			("version", payload_id, command_id)
			VALUES (:version, :payload_id, :command_id)`,
				loadedCommand); err != nil {
				logging.LogError(err, "Failed to mark command as loaded in payload")
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
func processMythicRPCPayloadAddCommand(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCPayloadAddCommandMessage{}
	responseMsg := MythicRPCPayloadAddCommandMessageResponse{
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
	return MythicRPCPayloadAddCommand(incomingMessage, authContext)
}
