package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

type ResponseInterceptMessage struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id"`
	ResponseID          int                    `json:"response_id"`
	CallbackID          int                    `json:"callback_id"`
	CallbackDisplayID   int                    `json:"callback_display_id"`
	AgentCallbackID     string                 `json:"agent_callback_id"`
	ContainerName       string                 `json:"container_name"`
	Environment         map[string]interface{} `json:"environment"`
	Inputs              map[string]interface{} `json:"inputs"`
	ActionData          map[string]interface{} `json:"action_data"`
}

func (r *rabbitMQConnection) SendEventingResponseIntercept(customFunctionMessage ResponseInterceptMessage) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetEventingContainerResponseInterceptRoutingKey(customFunctionMessage.ContainerName),
		"",
		customFunctionMessage,
		false,
	); err != nil {
		logging.LogError(err, "Failed to send message")
		return err
	} else {
		return nil
	}
}
