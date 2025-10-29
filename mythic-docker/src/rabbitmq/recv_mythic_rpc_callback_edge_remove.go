package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackEdgeRemoveMessage struct {
	SourceCallbackID      int    `json:"source_callback_id"`
	DestinationCallbackID int    `json:"destination_callback_id"`
	C2ProfileName         string `json:"c2_profile_name"`
}
type MythicRPCCallbackEdgeRemoveMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_EDGE_REMOVE,
		RoutingKey: MYTHIC_RPC_CALLBACK_EDGE_REMOVE,
		Handler:    processMythicRPCCallbackEdgeRemove,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_EDGE_REMOVE
func MythicRPCCallbackEdgeRemove(input MythicRPCCallbackEdgeRemoveMessage) MythicRPCCallbackEdgeRemoveMessageResponse {
	response := MythicRPCCallbackEdgeRemoveMessageResponse{
		Success: false,
	}
	err := RemoveEdgeByIds(input.SourceCallbackID, input.DestinationCallbackID, input.C2ProfileName)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response

}
func processMythicRPCCallbackEdgeRemove(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackEdgeRemoveMessage{}
	responseMsg := MythicRPCCallbackEdgeRemoveMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackEdgeRemove(incomingMessage)
	}
	return responseMsg
}
