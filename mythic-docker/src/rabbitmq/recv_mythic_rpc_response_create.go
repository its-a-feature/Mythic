package rabbitmq

import (
	"encoding/json"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCResponseCreateMessage struct {
	TaskID   int    `json:"task_id"`
	Response []byte `json:"response"`
}
type MythicRPCResponseCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_RESPONSE_CREATE,
		RoutingKey: MYTHIC_RPC_RESPONSE_CREATE,
		Handler:    processMythicRPCPayloadResponseCreate,
	})
}

// Endpoint: MYTHIC_RPC_RESPONSE_CREATE
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCResponseCreate(input MythicRPCResponseCreateMessage) MythicRPCResponseCreateMessageResponse {
	response := MythicRPCResponseCreateMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{
		ID: input.TaskID,
	}
	if len(input.Response) == 0 {
		response.Error = "Response must have actual bytes"
		return response
	}
	err := database.DB.Get(&task, `SELECT operation_id, agent_task_id FROM task  WHERE id=$1`, input.TaskID)
	if err != nil {
		logging.LogError(err, "failed to fetch task from database")
		response.Error = err.Error()
		return response
	}
	stringOutput := string(input.Response)
	handleAgentMessagePostResponseUserOutput(task, agentMessagePostResponse{
		TaskID:     task.AgentTaskID,
		UserOutput: &stringOutput,
	}, true)
	_, _ = database.DB.Exec(`UPDATE task SET timestamp=$2 WHERE id=$1`, input.TaskID, time.Now().UTC())
	response.Success = true
	return response

}
func processMythicRPCPayloadResponseCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCResponseCreateMessage{}
	responseMsg := MythicRPCResponseCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCResponseCreate(incomingMessage)
	}
	return responseMsg
}
