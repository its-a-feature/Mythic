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

type MythicRPCArtifactSearchMessage struct {
	TaskID          int                                 `json:"task_id"` //required
	SearchArtifacts MythicRPCArtifactSearchArtifactData `json:"artifact"`
}
type MythicRPCArtifactSearchMessageResponse struct {
	Success   bool                                  `json:"success"`
	Error     string                                `json:"error"`
	Artifacts []MythicRPCArtifactSearchArtifactData `json:"artifacts"`
}
type MythicRPCArtifactSearchArtifactData struct {
	Host            *string `json:"host" `            // optional
	ArtifactType    *string `json:"artifact_type"`    //optional
	ArtifactMessage *string `json:"artifact_message"` //optional
	TaskID          *int    `json:"task_id"`          //optional
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_ARTIFACT_SEARCH,
		RoutingKey: MYTHIC_RPC_ARTIFACT_SEARCH,
		Handler:    processMythicRPCArtifactSearch,
	})
}

// Endpoint: MYTHIC_RPC_PROCESS_SEARCH
func MythicRPCArtifactSearch(input MythicRPCArtifactSearchMessage) MythicRPCArtifactSearchMessageResponse {
	response := MythicRPCArtifactSearchMessageResponse{
		Success:   false,
		Artifacts: []MythicRPCArtifactSearchArtifactData{},
	}
	paramDict := make(map[string]interface{})
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT 
	task.id,
	callback.operation_id "callback.operation_id"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id=$1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to search for task information when searching for artifacts")
		response.Error = err.Error()
		return response
	} else {
		paramDict["operation_id"] = task.Callback.OperationID
		searchString := `SELECT * FROM taskartifact WHERE operation_id=:operation_id `
		if input.SearchArtifacts.Host != nil {
			paramDict["host"] = fmt.Sprintf("%%%s%%", *input.SearchArtifacts.Host)
			searchString += "AND host ILIKE :host "
		}
		if input.SearchArtifacts.ArtifactMessage != nil {
			paramDict["artifact"] = fmt.Sprintf("%%%s%%", *input.SearchArtifacts.ArtifactMessage)
			searchString += "AND artifact LIKE :artifact "
		}
		if input.SearchArtifacts.TaskID != nil {
			paramDict["task_id"] = *input.SearchArtifacts.TaskID
			searchString += "AND task_id=:task_id "
		}
		if input.SearchArtifacts.ArtifactType != nil {
			paramDict["base_artifact"] = fmt.Sprintf("%%%s%%", *input.SearchArtifacts.ArtifactType)
			searchString += "AND base_artifact LIKE :base_artifact "
		}
		searchString += " ORDER BY task_id DESC"
		if rows, err := database.DB.NamedQuery(searchString, paramDict); err != nil {
			logging.LogError(err, "Failed to search artifact information")
			response.Error = err.Error()
			return response
		} else {
			for rows.Next() {
				result := MythicRPCArtifactSearchArtifactData{}
				searchResult := databaseStructs.Taskartifact{}
				if err = rows.StructScan(&searchResult); err != nil {
					logging.LogError(err, "Failed to get row from artifacts for search")
				} else if err = mapstructure.Decode(searchResult, &result); err != nil {
					logging.LogError(err, "Failed to map artifact search results into array")
				} else {
					response.Artifacts = append(response.Artifacts, result)
				}
			}
			response.Success = true
			return response
		}
	}
}
func processMythicRPCArtifactSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCArtifactSearchMessage{}
	responseMsg := MythicRPCArtifactSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCArtifactSearch(incomingMessage)
	}
	return responseMsg
}
