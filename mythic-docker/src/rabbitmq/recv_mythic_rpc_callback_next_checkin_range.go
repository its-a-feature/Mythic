package rabbitmq

import (
	"encoding/json"
	"time"

	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackNextCheckinRangeMessage struct {
	SleepInterval int       `json:"sleep_interval"`
	SleepJitter   int       `json:"sleep_jitter"`
	LastCheckin   time.Time `json:"last_checkin"`
}

type MythicRPCCallbackNextCheckinRangeMessageResponse struct {
	Success bool      `json:"success"`
	Error   string    `json:"error"`
	Min     time.Time `json:"min"`
	Max     time.Time `json:"max"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_NEXT_CHECKIN_RANGE,   // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_CALLBACK_NEXT_CHECKIN_RANGE,   // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCCallbackNextCheckinRange, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCCallbackNextCheckinRange(input MythicRPCCallbackNextCheckinRangeMessage) MythicRPCCallbackNextCheckinRangeMessageResponse {
	response := MythicRPCCallbackNextCheckinRangeMessageResponse{
		Success: true,
	}
	minAdd := input.SleepInterval
	maxAdd := input.SleepInterval
	if input.SleepJitter > 0 {
		// minimum would be sleep_interval - (sleep_jitter % of sleep_interval)
		minAdd = minAdd - ((input.SleepJitter / 100) * (input.SleepInterval))
		// maximum would be sleep_interval + (sleep_jitter % of sleep_interval)
		maxAdd = maxAdd + ((input.SleepJitter / 100) * (input.SleepInterval))
		maxAdd *= 2 // double the high end in case we're on a close boundary
	}
	response.Min = input.LastCheckin.Add(time.Duration(minAdd) * time.Second)
	response.Max = input.LastCheckin.Add(time.Duration(maxAdd) * time.Second)
	return response
}
func processMythicRPCCallbackNextCheckinRange(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackNextCheckinRangeMessage{}
	responseMsg := MythicRPCCallbackNextCheckinRangeMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackNextCheckinRange(incomingMessage)
	}
	return responseMsg
}
