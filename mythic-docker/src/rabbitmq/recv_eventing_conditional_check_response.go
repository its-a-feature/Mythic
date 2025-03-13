package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type ConditionalCheckEventingMessageResponse struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id" mapstructure:"eventstepinstance_id"`
	Success             bool                   `json:"success" mapstructure:"success"`
	StdOut              string                 `json:"stdout" mapstructure:"stdout"`
	StdErr              string                 `json:"stderr" mapstructure:"stderr"`
	Outputs             map[string]interface{} `json:"outputs" mapstructure:"outputs"`
	SkipStep            bool                   `json:"skip_step" mapstructure:"skip_step"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      EVENTING_CONDITIONAL_CHECK_RESPONSE,
		RoutingKey: EVENTING_CONDITIONAL_CHECK_RESPONSE,
		Handler:    processEventingConditionalCheckResponse,
	})
}

func processEventingConditionalCheckResponse(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	c2SyncMsg := ConditionalCheckEventingMessageResponse{}

	err := json.Unmarshal(msg.Body, &c2SyncMsg)
	if err != nil {
		logging.LogError(err, "Failed to process eventing custom function response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing conditional check response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	eventingConditionalCheckProcess(c2SyncMsg)
}

func eventingConditionalCheckProcess(in ConditionalCheckEventingMessageResponse) {
	EventingChannel <- EventNotification{
		Trigger:             eventing.TriggerConditionalCheckResponse,
		EventStepInstanceID: in.EventStepInstanceID,
		ActionSuccess:       in.Success,
		ActionStderr:        in.StdErr,
		ActionStdout:        in.StdOut,
		Outputs:             in.Outputs,
		SkipStep:            in.SkipStep,
	}
}
