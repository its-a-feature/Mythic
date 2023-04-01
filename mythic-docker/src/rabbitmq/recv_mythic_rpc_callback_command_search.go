package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/utils"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackSearchCommandMessage struct {
	CallbackID                *int      `json:"callback_id,omitempty"`
	TaskID                    *int      `json:"task_id,omitempty"`
	SearchCommandNames        *[]string `json:"command_names,omitempty"`
	SearchSupportedUIFeatures *string   `json:"supported_ui_features,omitempty"`
	SearchScriptOnly          *bool     `json:"script_only,omitempty"`
	// this is an exact match search
	SearchAttributes map[string]interface{} `json:"params,omitempty"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCCallbackSearchCommandMessageResponse struct {
	Success  bool                                `json:"success"`
	Error    string                              `json:"error"`
	Commands []MythicRPCCommandSearchCommandData `json:"commands"`
}

type MythicRPCCallbackSearchCommandData struct {
	Name                string                 `json:"cmd"`
	Version             int                    `json:"version"`
	Attributes          map[string]interface{} `json:"attributes"`
	NeedsAdmin          bool                   `json:"needs_admin"`
	HelpCmd             string                 `json:"help_cmd"`
	Description         string                 `json:"description"`
	SupportedUiFeatures []string               `json:"supported_ui_features"`
	Author              string                 `json:"author"`
	ScriptOnly          bool                   `json:"script_only"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_SEARCH_COMMAND,    // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_CALLBACK_SEARCH_COMMAND,    // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCCallbackSearchCommand, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCCallbackSearchCommand(input MythicRPCCallbackSearchCommandMessage) MythicRPCCallbackSearchCommandMessageResponse {
	response := MythicRPCCallbackSearchCommandMessageResponse{
		Success: false,
	}
	foundCommands := []MythicRPCCommandSearchCommandData{}
	loadedCommands := []databaseStructs.Loadedcommands{}
	if input.CallbackID != nil {
		if err := database.DB.Select(&loadedCommands, `SELECT
			command.needs_admin "command.needs_admin",
			command.help_cmd "command.help_cmd",
			command.description "command.description",
			command.cmd "command.cmd",
			command.payload_type_id "command.payload_type_id",
			command.version "command.version",
			command.supported_ui_features "command.supported_ui_features",
			command.author "command.author",
			command.attributes "command.attributes",
			command.script_only "command.script_only"
			FROM
			loadedcommands
			JOIN command on loadedcommands.command_id = command.id
			WHERE loadedcommands.callback_id=$1`, input.CallbackID); err != nil {
			logging.LogError(err, "Failed to search loaded commands for callback_id")
			response.Error = err.Error()
			return response
		}
	} else if input.TaskID != nil {
		task := databaseStructs.Task{ID: *input.TaskID}
		if err := database.DB.Get(&task.CallbackID, `SELECT callback_id FROM task WHERE id=$1`, task.ID); err != nil {
			logging.LogError(err, "Failed to find task number")
			response.Error = err.Error()
			return response
		} else if err := database.DB.Select(&loadedCommands, `SELECT
			command.needs_admin "command.needs_admin",
			command.help_cmd "command.help_cmd",
			command.description "command.description",
			command.cmd "command.cmd",
			command.payload_type_id "command.payload_type_id",
			command.version "command.version",
			command.supported_ui_features "command.supported_ui_features",
			command.author "command.author",
			command.attributes "command.attributes",
			command.script_only "command.script_only"
			FROM
			loadedcommands
			JOIN command on loadedcommands.command_id = command.id
			WHERE loadedcommands.callback_id=$1`, task.CallbackID); err != nil {
			logging.LogError(err, "Failed to search loaded commands for callback_id")
			response.Error = err.Error()
			return response
		}
	} else {
		response.Error = "Must supply callback_id or task_id"
		return response
	}

	for _, command := range loadedCommands {
		uiFeatures := command.Command.SupportedUiFeatures.StructValue()
		stringUIFeatures := make([]string, len(uiFeatures))
		for i, u := range uiFeatures {
			stringUIFeatures[i] = u.(string)
		}
		attributes := map[string]interface{}{}
		if err := command.Command.Attributes.Unmarshal(&attributes); err != nil {
			logging.LogError(err, "Failed to get attributes from command")
			response.Error = "Failed to get attributes from command"
			return response
		}
		if input.SearchCommandNames != nil {
			if !utils.SliceContains(*input.SearchCommandNames, command.Command.Cmd) {
				continue
			}
		}
		if input.SearchScriptOnly != nil {
			if command.Command.ScriptOnly != command.Command.ScriptOnly {
				continue
			}
		}
		if input.SearchSupportedUIFeatures != nil {
			if !utils.SliceContains(stringUIFeatures, *input.SearchSupportedUIFeatures) {
				continue
			}
		}
		if input.SearchAttributes != nil {
			matchedValues := true
			for searchKey, searchValue := range input.SearchAttributes {
				if actualValue, ok := attributes[searchKey]; ok {
					if searchValue != actualValue {
						matchedValues = false
					}
				} else {
					matchedValues = false
				}
			}
			if matchedValues {
				newSearchCommandData := MythicRPCCommandSearchCommandData{
					Name:                command.Command.Cmd,
					NeedsAdmin:          command.Command.NeedsAdmin,
					Version:             command.Version,
					HelpCmd:             command.Command.HelpCmd,
					Description:         command.Command.Description,
					Author:              command.Command.Author,
					ScriptOnly:          command.Command.ScriptOnly,
					SupportedUiFeatures: stringUIFeatures,
					Attributes:          attributes,
				}
				foundCommands = append(foundCommands, newSearchCommandData)
			}
		} else {
			newFoundCommand := MythicRPCCommandSearchCommandData{
				Name:                command.Command.Cmd,
				NeedsAdmin:          command.Command.NeedsAdmin,
				Version:             command.Version,
				HelpCmd:             command.Command.HelpCmd,
				Description:         command.Command.Description,
				Author:              command.Command.Author,
				ScriptOnly:          command.Command.ScriptOnly,
				SupportedUiFeatures: stringUIFeatures,
				Attributes:          attributes,
			}
			foundCommands = append(foundCommands, newFoundCommand)
		}
	}
	response.Success = true
	response.Commands = foundCommands
	return response
}
func processMythicRPCCallbackSearchCommand(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackSearchCommandMessage{}
	responseMsg := MythicRPCCallbackSearchCommandMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackSearchCommand(incomingMessage)
	}
	return responseMsg
}
