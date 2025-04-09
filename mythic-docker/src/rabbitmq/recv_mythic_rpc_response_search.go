package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCResponseSearchMessage struct {
	TaskID   int    `json:"task_id"`
	Response string `json:"response"`
}
type MythicRPCResponseSearchMessageResponse struct {
	Success   bool                `json:"success"`
	Error     string              `json:"error"`
	Responses []MythicRPCResponse `json:"responses"`
}
type MythicRPCResponse struct {
	ResponseID int    `json:"response_id"`
	Response   []byte `json:"response"`
	TaskID     int    `json:"task_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_RESPONSE_SEARCH,
		RoutingKey: MYTHIC_RPC_RESPONSE_SEARCH,
		Handler:    processMythicRPCPayloadResponseSearch,
	})
}

// Endpoint: MYTHIC_RPC_RESPONSE_SEARCH
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCResponseSearch(input MythicRPCResponseSearchMessage) MythicRPCResponseSearchMessageResponse {
	response := MythicRPCResponseSearchMessageResponse{
		Success: false,
	}
	results := []databaseStructs.Response{}
	responseSearch := input.Response
	if responseSearch == "" {
		responseSearch = "%_%"
	} else {
		responseSearch = "%" + responseSearch + "%"
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT 
	operation_id, display_id, id
	FROM task
	WHERE id=$1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task for MythicRPCResponseSearch")
		response.Error = err.Error()
		return response
	} else if err := database.DB.Select(&results, `SELECT 
	id, response, task_id 
	FROM response
	WHERE operation_id=$1 AND response LIKE $2 AND task_id=$3 ORDER BY id DESC`,
		task.OperationID, responseSearch, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch responses for MythicRPCResponseSearch")
		response.Error = err.Error()
		return response
	} else {
		for _, resp := range results {
			response.Responses = append(response.Responses, MythicRPCResponse{
				ResponseID: resp.ID,
				Response:   resp.Response,
				TaskID:     resp.TaskID,
			})
		}
		response.Success = true
		return response
	}
}
func processMythicRPCPayloadResponseSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCResponseSearchMessage{}
	responseMsg := MythicRPCResponseSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCResponseSearch(incomingMessage)
	}
	return responseMsg
}
