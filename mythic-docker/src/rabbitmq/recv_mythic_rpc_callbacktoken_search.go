package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackTokenSearchMessage struct {
	TaskID          *int    `json:"task_id"` //required
	CallbackID      *int    `json:"callback_id"`
	AgentCallbackID *string `json:"agent_callback_id"`
}
type MythicRPCCallbackTokenSearchMessageResponse struct {
	Success        bool                            `json:"success"`
	Error          string                          `json:"error"`
	CallbackTokens []databaseStructs.Callbacktoken `json:"callbacktokens"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACKTOKEN_SEARCH,
		RoutingKey: MYTHIC_RPC_CALLBACKTOKEN_SEARCH,
		Handler:    processMythicRPCCallbackTokenSearch,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACKTOKEN_CREATE
func MythicRPCCallbackTokenSearch(input MythicRPCCallbackTokenSearchMessage) MythicRPCCallbackTokenSearchMessageResponse {
	response := MythicRPCCallbackTokenSearchMessageResponse{
		Success: false,
	}
	callbackID := 0
	if input.TaskID != nil {
		task := databaseStructs.Task{}
		err := database.DB.Get(&task, `SELECT
		task.id, task.callback_id
		FROM task
		WHERE task.id = $1`, input.TaskID)
		if err != nil {
			logging.LogError(err, "Failed to fetch task")
			response.Error = err.Error()
			return response
		}
		callbackID = task.CallbackID
	} else if input.CallbackID != nil {
		callbackID = *input.CallbackID
	} else if input.AgentCallbackID != nil {
		callback := databaseStructs.Callback{}
		err := database.DB.Get(&callback, `SELECT
			callback.id
			FROM callback
			WHERE callback.agent_callback_id = $1`, input.AgentCallbackID)
		if err != nil {
			logging.LogError(err, "Failed to fetch callback")
			response.Error = err.Error()
			return response
		}
		callbackID = callback.ID
	} else {
		response.Error = "Missing TaskID, CallbackID, or AgentCallbackID"
		return response
	}
	callbackTokens := []databaseStructs.Callbacktoken{}
	err := database.DB.Select(&callbackTokens,
		`SELECT 
    			callbacktoken.id, callbacktoken.token_id, callbacktoken.callback_id, callbacktoken.task_id,
    			callbacktoken.deleted, callbacktoken.host, callbacktoken.timestamp_created,
    			token.id "token.id", token.task_id "token.task_id", token.deleted "token.deleted",
    			token.host "token.host", 
    			token.description "token.description", 
    			token.operation_id "token.operation_id", 
    			token.timestamp "token.timestamp", 
    			token.token_id "token.token_id", 
    			token.user "token.user",
    			token.groups "token.groups",
    			token.privileges "token.privileges",
    			token.thread_id "token.thread_id",
    			token.process_id "token.process_id",
    			token.session_id "token.session_id",
    			token.logon_sid "token.logon_sid",
    			token.integrity_level_sid "token.integrity_level_sid",
    			token.app_container_sid "token.app_container_sid",
    			token.app_container_number "token.app_container_number",
    			token.default_dacl "token.default_dacl",
    			token.restricted "token.restricted",
    			token.handle "token.handle",
    			token.capabilities "token.capabilities"
				FROM callbacktoken 
				JOIN token ON callbacktoken.token_id = token.id
				WHERE 
					callbacktoken.callback_id = $1 AND callbacktoken.deleted = false`, callbackID)
	if err != nil {
		logging.LogError(err, "Failed to fetch callbacktoken")
		response.Error = err.Error()
		return response
	}
	response.CallbackTokens = callbackTokens
	response.Success = true
	return response
}
func processMythicRPCCallbackTokenSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackTokenSearchMessage{}
	responseMsg := MythicRPCCallbackTokenSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackTokenSearch(incomingMessage)
	}
	return responseMsg
}
