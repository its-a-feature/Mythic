package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCHandleAgentJsonMessage struct {
	CallbackID        *int                   `json:"callback_id"`
	AgentCallbackID   *string                `json:"agent_callback_id"`
	AgentMessage      map[string]interface{} `json:"agent_message"`
	UpdateCheckinTime bool                   `json:"update_checkin_time"`
}
type MythicRPCHandleAgentJsonMessageResponse struct {
	Success       bool                   `json:"success"`
	Error         string                 `json:"error"`
	AgentResponse map[string]interface{} `json:"agent_response"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_HANDLE_AGENT_JSON,
		RoutingKey: MYTHIC_RPC_HANDLE_AGENT_JSON,
		Handler:    processMythicRPCHandleAgentJson,
	})
}

// Endpoint: MYTHIC_RPC_HANDLE_AGENT_JSON
func MythicRPCHandleAgentJson(input MythicRPCHandleAgentJsonMessage) MythicRPCHandleAgentJsonMessageResponse {
	response := MythicRPCHandleAgentJsonMessageResponse{
		Success: false,
	}
	callback := databaseStructs.Callback{}
	if input.CallbackID != nil {
		err := database.DB.Get(&callback, `SELECT 
    		operation_id, id, display_id, agent_callback_id 
			FROM callback 
			WHERE id=$1`, *input.CallbackID)
		if err != nil {
			response.Success = false
			response.Error = err.Error()
			return response
		}
	} else if input.AgentCallbackID != nil {
		err := database.DB.Get(&callback, `SELECT 
			operation_id, id, display_id, agent_callback_id 
			FROM callback 
			WHERE agent_callback_id=$1`, *input.AgentCallbackID)
		if err != nil {
			response.Success = false
			response.Error = err.Error()
			return response
		}
	} else {
		response.Error = "Need to supply callback_id or agent_callback_id"
		response.Success = false
		return response
	}
	uUIDInfo := cachedUUIDInfo{
		OperationID:       callback.OperationID,
		CallbackID:        callback.ID,
		CallbackDisplayID: callback.DisplayID,
		UUID:              callback.AgentCallbackID,
		UUIDType:          UUIDTYPECALLBACK,
	}
	processedResponse := recursiveProcessAgentMessageResponse{
		TrackingID:    "",
		AgentUUIDSize: 36,
		OuterUuid:     callback.AgentCallbackID,
	}
	responseMsg := processAgentMessageContent(&AgentMessageRawInput{
		C2Profile:         "MythicRPC",
		RemoteIP:          fmt.Sprintf("Callback %d", callback.DisplayID),
		Base64Response:    false,
		UpdateCheckinTime: input.UpdateCheckinTime,
		TrackingID:        "",
	}, &uUIDInfo, input.AgentMessage, &processedResponse)
	if processedResponse.Err != nil {
		response.Success = false
		response.Error = processedResponse.Err.Error()
		return response
	}
	response.AgentResponse = responseMsg
	response.Success = true
	return response
}
func processMythicRPCHandleAgentJson(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCHandleAgentJsonMessage{}
	responseMsg := MythicRPCHandleAgentJsonMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCHandleAgentJson(incomingMessage)
	}
	return responseMsg
}
