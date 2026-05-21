package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

type TaskInterceptMessage struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id"`
	TaskID              int                    `json:"task_id"`
	CallbackID          int                    `json:"callback_id"`
	ContainerName       string                 `json:"container_name"`
	Environment         map[string]interface{} `json:"environment"`
	Inputs              map[string]interface{} `json:"inputs"`
	ActionData          map[string]interface{} `json:"action_data"`
}

func (r *rabbitMQConnection) SendEventingTaskIntercept(customFunctionMessage TaskInterceptMessage, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetEventingContainerTaskInterceptRoutingKey(customFunctionMessage.ContainerName),
		"",
		customFunctionMessage,
		false,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send message")
		return err
	}
	return nil
}
