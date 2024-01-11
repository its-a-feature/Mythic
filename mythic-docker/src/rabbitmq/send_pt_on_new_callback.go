package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtOnNewCallback(newCallbackMessage PTOnNewCallbackAllData) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtOnNewCallbackRoutingKey(newCallbackMessage.PayloadType),
		"",
		newCallbackMessage,
		false,
	); err != nil {
		logging.LogError(err, "Failed to send message")
		return err
	} else {
		return nil
	}
}
