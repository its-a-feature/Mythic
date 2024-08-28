package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type NewCustomEventingMessageResponse struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id" mapstructure:"eventstepinstance_id"`
	Success             bool                   `json:"success" mapstructure:"success"`
	StdOut              string                 `json:"stdout" mapstructure:"stdout"`
	StdErr              string                 `json:"stderr" mapstructure:"stderr"`
	Outputs             map[string]interface{} `json:"outputs" mapstructure:"outputs"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      EVENTING_CUSTOM_FUNCTION_RESPONSE,
		RoutingKey: EVENTING_CUSTOM_FUNCTION_RESPONSE,
		Handler:    processEventingCustomFunctionResponse,
	})
}

func processEventingCustomFunctionResponse(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	c2SyncMsg := NewCustomEventingMessageResponse{}

	err := json.Unmarshal(msg.Body, &c2SyncMsg)
	if err != nil {
		logging.LogError(err, "Failed to process eventing custom function response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing custom function response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	eventingCustomFunctionResponse(c2SyncMsg)
}

func eventingCustomFunctionResponse(in NewCustomEventingMessageResponse) {
	EventingChannel <- EventNotification{
		Trigger:             eventing.TriggerCustomFunctionResponse,
		EventStepInstanceID: in.EventStepInstanceID,
		ActionSuccess:       in.Success,
		ActionStderr:        in.StdErr,
		ActionStdout:        in.StdOut,
		Outputs:             in.Outputs,
	}
}
