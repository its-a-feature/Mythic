package rabbitmq

import (
	"encoding/json"
	"strings"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCArtifactCreateMessage struct {
	TaskID           int     `json:"task_id"`
	ArtifactMessage  string  `json:"message"`
	BaseArtifactType string  `json:"base_artifact"`
	ArtifactHost     *string `json:"host,omitempty"`
}
type MythicRPCArtifactCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_ARTIFACT_CREATE,
		RoutingKey: MYTHIC_RPC_ARTIFACT_CREATE,
		Handler:    processMythicRPCArtifactCreate,
		Scopes:     []string{mythicjwt.SCOPE_RESPONSE_WRITE},
	})
}

// Endpoint: MYTHIC_RPC_ARTIFACT_CREATE
func MythicRPCArtifactCreate(input MythicRPCArtifactCreateMessage, authContext RabbitMQAuthContext) MythicRPCArtifactCreateMessageResponse {
	response := MythicRPCArtifactCreateMessageResponse{
		Success: false,
	}
	taskArtifact := databaseStructs.Taskartifact{}
	taskArtifact.TaskID.Int64 = int64(input.TaskID)
	taskArtifact.TaskID.Valid = true
	taskArtifact.Artifact = []byte(input.ArtifactMessage)
	taskArtifact.BaseArtifact = input.BaseArtifactType
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT
	callback.host "callback.host"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id=$1 AND task.operation_id=$2`, input.TaskID, authContext.OperationID)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	if input.ArtifactHost != nil && *input.ArtifactHost != "" {
		taskArtifact.Host = strings.ToUpper(*input.ArtifactHost)
	} else {
		taskArtifact.Host = task.Callback.Host
	}
	taskArtifact.OperationID = authContext.OperationID
	if authContext.APITokensID > 0 {
		taskArtifact.APITokensID.Valid = true
		taskArtifact.APITokensID.Int64 = int64(authContext.APITokensID)
	}
	if authContext.EventStepInstanceID > 0 {
		taskArtifact.EventStepInstanceID.Valid = true
		taskArtifact.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO taskartifact 
			(task_id, artifact, base_artifact, host, operation_id, apitokens_id, eventstepinstance_id)
			VALUES (:task_id, :artifact, :base_artifact, :host, :operation_id, :apitokens_id, :eventstepinstance_id)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to save taskartifact data to database")
		response.Error = err.Error()
		return response
	}
	err = statement.Get(&taskArtifact.ID, taskArtifact)
	if err != nil {
		logging.LogError(err, "Failed to save taskartifact data to database")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	go emitArtifactLog(taskArtifact.ID)
	return response
}
func processMythicRPCArtifactCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCArtifactCreateMessage{}
	responseMsg := MythicRPCArtifactCreateMessageResponse{
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
	return MythicRPCArtifactCreate(incomingMessage, authContext)
}
