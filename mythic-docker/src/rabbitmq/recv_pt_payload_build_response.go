package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
)

// PAYLOAD_BUILD STRUCTS

type PayloadBuildMessage struct {
	PayloadType        string                  `json:"payload_type"`
	CommandList        []string                `json:"commands"`
	Filename           string                  `json:"filename"`
	BuildParameters    map[string]interface{}  `json:"build_parameters"`
	C2Profiles         []PayloadBuildC2Profile `json:"c2profiles"`
	WrappedPayload     *[]byte                 `json:"wrapped_payload,omitempty"`
	WrappedPayloadUUID *string                 `json:"wrapped_payload_uuid,omitempty"`
	SelectedOS         string                  `json:"selected_os"`
	PayloadUUID        string                  `json:"uuid"`
	OperationID        int                     `json:"operation_id"`
	OperatorID         int                     `json:"operator_id"`
	PayloadFileUUID    string                  `json:"payload_file_uuid"`
	Secrets            map[string]interface{}  `json:"secrets"`
}

type PayloadBuildC2Profile struct {
	Name  string `json:"name"`
	IsP2P bool   `json:"is_p2p"`
	ID    int    `json:"id"`
	// parameter name: parameter value
	Parameters map[string]interface{} `json:"parameters"`
}

type PAYLOAD_BUILD_STATUS = string

const (
	PAYLOAD_BUILD_STATUS_SUCCESS PAYLOAD_BUILD_STATUS = "success"
	PAYLOAD_BUILD_STATUS_ERROR                        = "error"
)

type PayloadBuildResponse struct {
	PayloadUUID        string    `json:"uuid"`
	Success            bool      `json:"success"`
	Payload            *[]byte   `json:"payload,omitempty"`
	AgentFileID        *string   `json:"agent_file_id"`
	UpdatedFilename    *string   `json:"updated_filename,omitempty"`
	UpdatedCommandList *[]string `json:"updated_command_list,omitempty"`
	BuildStdErr        string    `json:"build_stderr"`
	BuildStdOut        string    `json:"build_stdout"`
	BuildMessage       string    `json:"build_message"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      "mythic_consume_payload_build",
		RoutingKey: PT_BUILD_RESPONSE_ROUTING_KEY,
		Handler:    processPayloadBuildResponse,
	})

}

// handle payload build response messages coming back on the queue
func processPayloadBuildResponse(msg amqp.Delivery) {
	logging.LogInfo("got message", "routingKey", msg.RoutingKey)
	payloadBuildResponse := PayloadBuildResponse{}
	err := json.Unmarshal(msg.Body, &payloadBuildResponse)
	if err != nil {
		logging.LogError(err, "Failed to process payload build response message")
		return
	}
	//logging.LogInfo("got build response", "buildMsg", payloadBuildResponse)
	databasePayload := databaseStructs.Payload{}
	err = database.DB.Get(&databasePayload, `SELECT 
			payload.build_message, payload.build_stderr, payload.build_stdout, payload.id, payload.build_phase,
			payload.eventstepinstance_id, payload.operation_id, payload.operator_id, payload.payload_type_id,
			filemeta.filename "filemeta.filename",
			filemeta.id "filemeta.id"
			FROM payload 
			JOIN filemeta ON payload.file_id = filemeta.id
			WHERE uuid=$1 
			LIMIT 1`, payloadBuildResponse.PayloadUUID)
	if err != nil {
		logging.LogError(err, "Failed to get payload from the database")
		return
	}
	_, err = database.DB.Exec(`UPDATE apitokens SET deleted=true AND active=false WHERE payload_id=$1`, databasePayload.ID)
	if err != nil {
		logging.LogError(err, "Failed to update the apitokens to set to deleted")
	}
	databasePayload.BuildMessage += payloadBuildResponse.BuildMessage
	databasePayload.BuildStderr += payloadBuildResponse.BuildStdErr
	databasePayload.BuildStdout += payloadBuildResponse.BuildStdOut
	if payloadBuildResponse.Success {
		databasePayload.BuildPhase = PAYLOAD_BUILD_STATUS_SUCCESS
	} else {
		databasePayload.BuildPhase = PAYLOAD_BUILD_STATUS_ERROR
	}
	if payloadBuildResponse.UpdatedFilename != nil {
		databasePayload.Filemeta.Filename = []byte(*payloadBuildResponse.UpdatedFilename)
		if _, err := database.DB.NamedExec(`UPDATE filemeta SET 
                    filename=:filename
                    WHERE id=:id`, databasePayload.Filemeta); err != nil {
			logging.LogError(err, "Failed to update filename for payload")
		}
	}
	// update the payload in the database
	if _, updateError := database.DB.NamedExec(`UPDATE payload SET 
				build_phase=:build_phase, build_stderr=:build_stderr, build_message=:build_message, build_stdout=:build_stdout
				WHERE id=:id`, databasePayload,
	); updateError != nil {
		logging.LogError(updateError, "Failed to update payload's build status")
		return
	}
	database.UpdateRemainingBuildSteps(databasePayload)
	if databasePayload.BuildPhase == PAYLOAD_BUILD_STATUS_SUCCESS {
		// process the additional UpdatedCommands
		if err := updateLoadedCommandsFromPayloadBuild(databasePayload, payloadBuildResponse.UpdatedCommandList); err != nil {
			database.UpdatePayloadWithError(databasePayload, err)
			//database.UpdateRemainingBuildSteps(databasePayload)
		}
	}
	EventingChannel <- EventNotification{
		Trigger:             eventing.TriggerPayloadBuildFinish,
		EventStepInstanceID: int(databasePayload.EventStepInstanceID.Int64),
		PayloadID:           databasePayload.ID,
		OperationID:         databasePayload.OperationID,
		OperatorID:          databasePayload.OperatorID,
		ActionSuccess:       databasePayload.BuildPhase == PAYLOAD_BUILD_STATUS_SUCCESS,
		ActionStdout:        databasePayload.BuildStdout,
		ActionStderr:        databasePayload.BuildStderr,
	}
	logging.LogDebug("Finished processing payload build response message")
	go emitPayloadLog(databasePayload.ID)
}

func updateLoadedCommandsFromPayloadBuild(databasePayload databaseStructs.Payload, newCommandList *[]string) error {
	if newCommandList == nil {
		return nil
	}
	// if newCommandList isn't empty, then we need to diff and update what commands are actually loaded
	databasePayloadCommand := databaseStructs.Payloadcommand{}
	seenCommands := []string{}
	if rows, err := database.DB.NamedQuery(`SELECT
		payloadcommand.id,
		command.cmd "command.cmd",
		command.id "command.id"
		FROM payloadcommand
		JOIN command ON payloadcommand.command_id = command.id
		WHERE payloadcommand.payload_id = :id
	`, databasePayload); err != nil {
		logging.LogError(err, "Failed to get payload commands when trying to update loaded commands for payload build response")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&databasePayloadCommand); err != nil {
				logging.LogError(err, "Failed to get row from payloadcommand when trying to process payload build response")
				return err
			} else {
				found := false
				for _, newCommand := range *newCommandList {
					if newCommand == databasePayloadCommand.Command.Cmd {
						found = true
						seenCommands = append(seenCommands, newCommand)
						break
					}
				}
				if !found {
					// we are looking at a command in the database that we don't see in our newCommandList
					// so we need to delete it
					if _, err = database.DB.NamedExec("DELETE FROM payloadcommand WHERE id=:id", databasePayloadCommand); err != nil {
						logging.LogError(err, "Failed to delete payloadcommand mapping", "command", databasePayloadCommand.Command.Cmd)
						return err
					}
				}
			}
		}
		for _, newCommand := range *newCommandList {
			if !utils.SliceContains(seenCommands, newCommand) {
				// this new command is one we haven't seen before when looping through the database commands
				// so we need to add it
				// first we have to find it in the database
				databaseCommand := databaseStructs.Command{}
				if err := database.DB.Get(&databaseCommand, `SELECT
				id, "version"
				FROM command
				WHERE cmd=$1 and payload_type_id=$2
				`, newCommand, databasePayload.PayloadTypeID); err != nil {
					logging.LogError(err, "Failed to get command to associate with payload", "command", newCommand)
				} else {
					// then insert the new mapping
					payloadCommand := databaseStructs.Payloadcommand{
						CommandID: databaseCommand.ID,
						PayloadID: databasePayload.ID,
						Version:   databaseCommand.Version,
					}
					if _, err := database.DB.NamedExec(`
					INSERT INTO payloadcommand
					(payload_id, command_id, "version")
					VALUES
					(:payload_id, :command_id, :version)
					`, payloadCommand); err != nil {
						logging.LogError(err, "Failed to associate command with payload", "command", databaseCommand)
						return err
					}
				}

			}
		}
	}
	return nil
}
