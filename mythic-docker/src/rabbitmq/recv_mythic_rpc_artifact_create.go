package rabbitmq

import (
	"encoding/json"
	"strings"

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
	})
}

// Endpoint: MYTHIC_RPC_ARTIFACT_CREATE
func MythicRPCArtifactCreate(input MythicRPCArtifactCreateMessage) MythicRPCArtifactCreateMessageResponse {
	response := MythicRPCArtifactCreateMessageResponse{
		Success: false,
	}
	taskArtifact := databaseStructs.Taskartifact{}
	taskArtifact.TaskID.Int64 = int64(input.TaskID)
	taskArtifact.TaskID.Valid = true
	taskArtifact.Artifact = []byte(input.ArtifactMessage)
	taskArtifact.BaseArtifact = input.BaseArtifactType
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
	task.operation_id,
	callback.host "callback.host"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id=$1`, input.TaskID); err != nil {
		response.Error = err.Error()
		return response
	}
	if input.ArtifactHost != nil && *input.ArtifactHost != "" {
		taskArtifact.Host = strings.ToUpper(*input.ArtifactHost)
	} else {
		taskArtifact.Host = task.Callback.Host
	}
	taskArtifact.OperationID = task.OperationID
	if statement, err := database.DB.PrepareNamed(`INSERT INTO taskartifact 
			(task_id, artifact, base_artifact, host, operation_id)
			VALUES (:task_id, :artifact, :base_artifact, :host, :operation_id)
			RETURNING id`); err != nil {
		logging.LogError(err, "Failed to save taskartifact data to database")
		response.Error = err.Error()
		return response
	} else if err = statement.Get(&taskArtifact.ID, taskArtifact); err != nil {
		logging.LogError(err, "Failed to save taskartifact data to database")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		go emitArtifactLog(taskArtifact.ID)
		return response
	}
}
func processMythicRPCArtifactCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCArtifactCreateMessage{}
	responseMsg := MythicRPCArtifactCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCArtifactCreate(incomingMessage)
	}
	return responseMsg
}
