package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtTaskCompletionFunction(taskMessage PTTaskCompletionFunctionMessage) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskCompletionHandlerRoutingKey(taskMessage.TaskData.CommandPayloadType),
		"",
		taskMessage,
		false,
	); err != nil {
		logging.LogError(err, "Failed to send message")
		return err
	} else {
		return nil
	}
}
