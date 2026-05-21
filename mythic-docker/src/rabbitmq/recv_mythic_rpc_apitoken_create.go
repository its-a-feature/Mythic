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

type MythicRPCAPITokenCreateMessage struct {
	AgentTaskID     *string  `json:"agent_task_id"`
	AgentCallbackID *string  `json:"agent_callback_id"`
	PayloadUUID     *string  `json:"payload_uuid"`
	Scopes          []string `json:"scopes"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCAPITokenCreateMessageResponse struct {
	Success  bool   `json:"success"`
	Error    string `json:"error"`
	APIToken string `json:"apitoken"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_APITOKEN_CREATE,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_APITOKEN_CREATE,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCAPITokenCreate, // points to function that takes in amqp.Delivery and returns interface{}
		Scopes:     []string{mythicjwt.SCOPE_APITOKEN_WRITE},
	})
}

func MythicRPCAPITokenCreate(input MythicRPCAPITokenCreateMessage, authContext RabbitMQAuthContext) MythicRPCAPITokenCreateMessageResponse {
	response := MythicRPCAPITokenCreateMessageResponse{
		Success: false,
	}
	normalizedScopes, err := mythicjwt.NormalizeAPITokenScopes(input.Scopes)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	// save off the access_token as an API token and then return it
	apiToken := databaseStructs.Apitokens{
		TokenValue: "",
		Active:     true,
		Scopes:     normalizedScopes,
		OperatorID: authContext.OperatorID,
		CreatedBy:  authContext.OperatorID,
	}
	if authContext.EventStepInstanceID > 0 {
		apiToken.EventStepInstanceID.Valid = true
		apiToken.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	if input.AgentTaskID != nil {
		task := databaseStructs.Task{AgentTaskID: *input.AgentTaskID}
		err = database.DB.Get(&task, `SELECT 
    		id, operator_id, operation_id, display_id, completed
			FROM task 
			WHERE agent_task_id=$1 AND operation_id=$2`, task.AgentTaskID, authContext.OperationID)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		if task.Completed {
			response.Error = fmt.Sprintf("Cannot create API token for completed task %d", task.DisplayID)
			return response
		}
		apiToken.TokenType = mythicjwt.AUTH_METHOD_TASK
		apiToken.TaskID.Valid = true
		apiToken.TaskID.Int64 = int64(task.ID)
		apiToken.Name = fmt.Sprintf("Generated Task API Token via MythicRPC for Task %d", task.DisplayID)
	} else if input.PayloadUUID != nil {
		payload := databaseStructs.Payload{UuID: *input.PayloadUUID}
		err = database.DB.Get(&payload, `SELECT 
    		id, operator_id, operation_id, deleted, build_phase
			FROM payload 
			WHERE uuid=$1 AND operation_id=$2`, payload.UuID, authContext.OperationID)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		if payload.Deleted || payload.BuildPhase == "success" || payload.BuildPhase == "error" {
			response.Error = fmt.Sprintf("Cannot create API token for payloads deleted or already finished building")
			return response
		}
		apiToken.TokenType = mythicjwt.AUTH_METHOD_PAYLOAD
		apiToken.PayloadID.Valid = true
		apiToken.PayloadID.Int64 = int64(payload.ID)
		apiToken.Name = fmt.Sprintf("Generated Payload API Token via MythicRPC for Payload %s", payload.UuID)
	} else if input.AgentCallbackID != nil {
		callback := databaseStructs.Callback{}
		callback.AgentCallbackID = *input.AgentCallbackID
		err = database.DB.Get(&callback, `SELECT 
    		operation_id, id, display_id 
			FROM callback 
			WHERE agent_callback_id=$1 AND operation_id=$2`, callback.AgentCallbackID, authContext.OperationID)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		apiToken.TokenType = mythicjwt.AUTH_METHOD_CALLBACK
		apiToken.CallbackID.Valid = true
		apiToken.CallbackID.Int64 = int64(callback.ID)
	} else {
		response.Error = "No task or callback information provided, can't generate apitoken"
		return response
	}
	defaultScopes := authContext.SourceScopes
	if len(defaultScopes) == 0 {
		response.Error = "missing RabbitMQ auth context source scopes"
		return response
	}
	err = mythicjwt.CanGrantAPITokenScopes(defaultScopes, normalizedScopes)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO apitokens
		(token_value, operator_id, token_type, active, "name", created_by, task_id, callback_id, payload_id, scopes, eventstepinstance_id)
		VALUES
		(:token_value, :operator_id, :token_type, :active, :name, :created_by, :task_id, :callback_id, :payload_id, :scopes, :eventstepinstance_id)
		RETURNING id`)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	err = statement.Get(&apiToken.ID, apiToken)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	accessToken, storedAPITokenValue, err := mythicjwt.GenerateOpaqueAPIToken()
	if err != nil {
		response.Error = err.Error()
		expireAPIToken(apiToken.ID)
		return response
	}
	apiToken.TokenValue = storedAPITokenValue
	_, err = database.DB.Exec(`UPDATE apitokens SET token_value=$1 WHERE id=$2`, apiToken.TokenValue, apiToken.ID)
	if err != nil {
		response.Error = err.Error()
		expireAPIToken(apiToken.ID)
		return response
	}
	response.Success = true
	response.APIToken = accessToken
	if apiToken.TokenType == mythicjwt.AUTH_METHOD_CALLBACK || apiToken.TokenType == mythicjwt.AUTH_METHOD_PAYLOAD {
		// deactivate the token after 5 min (should be a short-lived use)
		go expireAPITokenAfterShortLivedTTL(apiToken.ID)
	}
	return response
}
func processMythicRPCAPITokenCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCAPITokenCreateMessage{}
	responseMsg := MythicRPCAPITokenCreateMessageResponse{
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
	return MythicRPCAPITokenCreate(incomingMessage, authContext)
}
