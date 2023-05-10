package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCObjectActionFakeNotRealMessage struct {
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCObjectActionFakeNotRealMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_BLANK,                        // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_BLANK,                        // swap out with routing key in rabbitmq.constants.go file
		Handler:    processFakeMythicRPCObjectActionNotReal, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

//MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCObjectActionFakeNotReal(input MythicRPCObjectActionFakeNotRealMessage) MythicRPCObjectActionFakeNotRealMessageResponse {
	response := MythicRPCObjectActionFakeNotRealMessageResponse{}
	return response
}
func processFakeMythicRPCObjectActionNotReal(msg amqp.Delivery) interface{} {
	logging.LogDebug("got message", "routingKey", msg.RoutingKey, "message", msg)
	incomingMessage := MythicRPCObjectActionFakeNotRealMessage{}
	responseMsg := MythicRPCObjectActionFakeNotRealMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCObjectActionFakeNotReal(incomingMessage)
	}
	return responseMsg
}
