package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
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
		Scopes:     []string{mythicjwt.SCOPE_RESPONSE_READ},
	})
}

// Endpoint: MYTHIC_RPC_RESPONSE_SEARCH
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCResponseSearch(input MythicRPCResponseSearchMessage, authContext RabbitMQAuthContext) MythicRPCResponseSearchMessageResponse {
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
	err := database.DB.Get(&task, `SELECT 
	operation_id, display_id, id
	FROM task
	WHERE id=$1 AND operation_id=$2`, input.TaskID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to fetch task for MythicRPCResponseSearch")
		response.Error = err.Error()
		return response
	}
	err = database.DB.Select(&results, `SELECT 
		id, response, task_id 
		FROM response
		WHERE operation_id=$1 AND response LIKE $2 AND task_id=$3 ORDER BY id DESC`,
		authContext.OperationID, responseSearch, input.TaskID)
	if err != nil {
		logging.LogError(err, "Failed to fetch responses for MythicRPCResponseSearch")
		response.Error = err.Error()
		return response
	}
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
func processMythicRPCPayloadResponseSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCResponseSearchMessage{}
	responseMsg := MythicRPCResponseSearchMessageResponse{
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
	return MythicRPCResponseSearch(incomingMessage, authContext)
}
