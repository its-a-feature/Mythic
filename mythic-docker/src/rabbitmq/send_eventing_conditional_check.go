package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

type ConditionalCheckEventingMessage struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id"`
	FunctionName        string                 `json:"function_name"`
	ContainerName       string                 `json:"container_name"`
	Environment         map[string]interface{} `json:"environment"`
	Inputs              map[string]interface{} `json:"inputs"`
	ActionData          map[string]interface{} `json:"action_data"`
}

func (r *rabbitMQConnection) SendEventingConditionalCheckFunction(conditionalCheckMessage ConditionalCheckEventingMessage) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetEventingContainerConditionalCheckRoutingKey(conditionalCheckMessage.ContainerName),
		"",
		conditionalCheckMessage,
		false,
	); err != nil {
		logging.LogError(err, "Failed to send message")
		return err
	} else {
		return nil
	}
}
