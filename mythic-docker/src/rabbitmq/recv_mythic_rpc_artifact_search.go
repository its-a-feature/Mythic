package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCArtifactSearchMessage struct {
	SearchArtifacts MythicRPCArtifactSearchArtifactData `json:"artifact"`
}
type MythicRPCArtifactSearchMessageResponse struct {
	Success   bool                                  `json:"success"`
	Error     string                                `json:"error"`
	Artifacts []MythicRPCArtifactSearchArtifactData `json:"artifacts"`
}
type MythicRPCArtifactSearchArtifactData struct {
	Host            *string `json:"host" mapstructure:"host" `                        // optional
	ArtifactType    *string `json:"artifact_type" mapstructure:"artifact_type"`       //optional
	ArtifactMessage *string `json:"artifact_message" mapstructure:"artifact_message"` //optional
	TaskID          *int    `json:"task_id" mapstructure:"task_id"`                   //optional
	NeedsCleanup    *bool   `json:"needs_cleanup" mapstructure:"needs_cleanup"`       // optional
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_ARTIFACT_SEARCH,
		RoutingKey: MYTHIC_RPC_ARTIFACT_SEARCH,
		Handler:    processMythicRPCArtifactSearch,
		Scopes:     []string{mythicjwt.SCOPE_RESPONSE_READ},
	})
}

// Endpoint: MYTHIC_RPC_PROCESS_SEARCH
func MythicRPCArtifactSearch(input MythicRPCArtifactSearchMessage, authContext RabbitMQAuthContext) MythicRPCArtifactSearchMessageResponse {
	response := MythicRPCArtifactSearchMessageResponse{
		Success:   false,
		Artifacts: []MythicRPCArtifactSearchArtifactData{},
	}
	paramDict := make(map[string]interface{})
	paramDict["operation_id"] = authContext.OperationID
	searchString := `SELECT * FROM taskartifact WHERE operation_id=:operation_id `
	if input.SearchArtifacts.Host != nil {
		paramDict["host"] = fmt.Sprintf("%%%s%%", *input.SearchArtifacts.Host)
		searchString += " AND host ILIKE :host "
	}
	if input.SearchArtifacts.ArtifactMessage != nil {
		paramDict["artifact"] = fmt.Sprintf("%%%s%%", *input.SearchArtifacts.ArtifactMessage)
		searchString += " AND artifact LIKE :artifact "
	}
	if input.SearchArtifacts.TaskID != nil {
		paramDict["task_id"] = *input.SearchArtifacts.TaskID
		searchString += " AND task_id=:task_id "
	}
	if input.SearchArtifacts.ArtifactType != nil {
		paramDict["base_artifact"] = fmt.Sprintf("%%%s%%", *input.SearchArtifacts.ArtifactType)
		searchString += " AND base_artifact LIKE :base_artifact "
	}
	if input.SearchArtifacts.NeedsCleanup != nil {
		paramDict["needs_cleanup"] = *input.SearchArtifacts.NeedsCleanup
		searchString += " AND needs_cleanup=:needs_cleanup "
	}
	searchString += " ORDER BY task_id DESC"
	rows, err := database.DB.NamedQuery(searchString, paramDict)
	if err != nil {
		logging.LogError(err, "Failed to search artifact information")
		response.Error = err.Error()
		return response
	}
	defer rows.Close()
	for rows.Next() {
		result := MythicRPCArtifactSearchArtifactData{}
		searchResult := databaseStructs.Taskartifact{}
		if err = rows.StructScan(&searchResult); err != nil {
			logging.LogError(err, "Failed to get row from artifacts for search")
			continue
		}
		result.NeedsCleanup = &searchResult.NeedsCleanup
		taskID := int(searchResult.TaskID.Int64)
		result.TaskID = &taskID
		result.Host = &searchResult.Host
		artifactMessage := string(searchResult.Artifact)
		result.ArtifactMessage = &artifactMessage
		result.ArtifactType = &searchResult.BaseArtifact
		response.Artifacts = append(response.Artifacts, result)
	}
	response.Success = true
	return response
}
func processMythicRPCArtifactSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCArtifactSearchMessage{}
	responseMsg := MythicRPCArtifactSearchMessageResponse{
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
	return MythicRPCArtifactSearch(incomingMessage, authContext)
}
