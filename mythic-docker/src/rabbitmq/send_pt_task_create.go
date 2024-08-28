package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtTaskCreate(taskMessage PTTaskMessageAllData) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskCreateRoutingKey(taskMessage.CommandPayloadType),
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
