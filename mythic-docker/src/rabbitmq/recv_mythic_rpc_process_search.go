package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/mitchellh/mapstructure"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCProcessSearchMessage struct {
	TaskID        int                               `json:"task_id"` //required
	SearchProcess MythicRPCProcessSearchProcessData `json:"process"`
}
type MythicRPCProcessSearchMessageResponse struct {
	Success   bool                                `json:"success"`
	Error     string                              `json:"error"`
	Processes []MythicRPCProcessSearchProcessData `json:"processes"`
}
type MythicRPCProcessSearchProcessData struct {
	Host            *string `json:"host" mapstructure:"host"`                           // optional
	ProcessID       *int    `json:"process_id" mapstructure:"process_id"`               // optional
	Architecture    *string `json:"architecture" mapstructure:"architecture"`           // optional
	ParentProcessID *int    `json:"parent_process_id" mapstructure:"parent_process_id"` // optional
	BinPath         *string `json:"bin_path" mapstructure:"bin_path"`                   // optional
	Name            *string `json:"name" mapstructure:"name"`                           // optional
	User            *string `json:"user" mapstructure:"user"`                           // optional
	CommandLine     *string `json:"command_line" mapstructure:"command_line"`           // optional
	IntegrityLevel  *int    `json:"integrity_level" mapstructure:"integrity_level"`     // optional
	Description     *string `json:"description" mapstructure:"description"`             // optional
	Signer          *string `json:"signer" mapstructure:"signer"`                       // optional
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PROCESS_SEARCH,
		RoutingKey: MYTHIC_RPC_PROCESS_SEARCH,
		Handler:    processMythicRPCProcessSearch,
	})
}

// Endpoint: MYTHIC_RPC_PROCESS_SEARCH
func MythicRPCProcessSearch(input MythicRPCProcessSearchMessage) MythicRPCProcessSearchMessageResponse {
	response := MythicRPCProcessSearchMessageResponse{
		Success:   false,
		Processes: []MythicRPCProcessSearchProcessData{},
	}
	paramDict := make(map[string]interface{})
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT 
	task.id, task.operation_id
	FROM task
	WHERE task.id=$1`, input.TaskID); err != nil {
		response.Error = err.Error()
		return response
	} else {
		paramDict["operation_id"] = task.OperationID
		searchString := `SELECT * FROM mythictree WHERE operation_id=:operation_id AND tree_type='process' `
		if input.SearchProcess.Host != nil {
			paramDict["host"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.Host)
			searchString += "AND host ILIKE :host "
		}
		if input.SearchProcess.ProcessID != nil {
			paramDict["process_id"] = *input.SearchProcess.ProcessID
			searchString += "AND metadata->>'process_id'=:process_id "
		}
		if input.SearchProcess.Architecture != nil {
			paramDict["architecture"] = *input.SearchProcess.Architecture
			searchString += "AND metadata->>'architecture'=:architecture "
		}
		if input.SearchProcess.ParentProcessID != nil {
			paramDict["parent_process_id"] = *input.SearchProcess.ParentProcessID
			searchString += "AND metadata->>'parent_process_id'=:parent_process_id "
		}
		if input.SearchProcess.BinPath != nil {
			paramDict["bin_path"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.BinPath)
			searchString += "AND metadata->>'bin_path' ILIKE :bin_path "
		}
		if input.SearchProcess.Name != nil {
			paramDict["name"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.Name)
			searchString += "AND name ILIKE :name "
		}
		if input.SearchProcess.User != nil {
			paramDict["user"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.User)
			searchString += "AND metadata->>\"user\" ILIKE :user "
		}
		if input.SearchProcess.CommandLine != nil {
			paramDict["command_line"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.CommandLine)
			searchString += "AND metadata->>'command_line' ILIKE :command_line "
		}
		if input.SearchProcess.IntegrityLevel != nil {
			paramDict["integrity_level"] = *input.SearchProcess.IntegrityLevel
			searchString += "AND metadata->>'integrity_level'=:integrity_level "
		}
		if input.SearchProcess.Description != nil {
			paramDict["description"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.Description)
			searchString += "AND metadata->>'description' ILIKE :description "
		}
		if input.SearchProcess.Signer != nil {
			paramDict["signer"] = fmt.Sprintf("%%%s%%", *input.SearchProcess.Signer)
			searchString += "AND metadata->>'signer' ILIKE :signer "
		}
		searchString += " ORDER BY id DESC"
		if rows, err := database.DB.NamedQuery(searchString, paramDict); err != nil {
			logging.LogError(err, "Failed to search artifact information")
			response.Error = err.Error()
			return response
		} else {
			for rows.Next() {
				searchResult := databaseStructs.MythicTree{}
				if err = rows.StructScan(&searchResult); err != nil {
					logging.LogError(err, "Failed to get row from artifacts for search")
				} else {
					returnedProcess := MythicRPCProcessSearchProcessData{}
					if err := mapstructure.Decode(searchResult.Metadata.StructValue(), &returnedProcess); err != nil {
						logging.LogError(err, "Failed to decode process search result to struct")
					} else {
						returnedProcess.Host = &searchResult.Host
						nm := string(searchResult.Name)
						returnedProcess.Name = &nm
						response.Processes = append(response.Processes, returnedProcess)
					}
				}
			}
			response.Success = true
			return response
		}
	}
}
func processMythicRPCProcessSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCProcessSearchMessage{}
	responseMsg := MythicRPCProcessSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCProcessSearch(incomingMessage)
	}
	return responseMsg
}
