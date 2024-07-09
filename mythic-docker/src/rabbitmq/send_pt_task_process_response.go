package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtTaskProcessResponse(taskMessage PtTaskProcessResponseMessage) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskProcessResponseRoutingKey(taskMessage.TaskData.CommandPayloadType),
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
