package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtTaskOPSECPost(taskMessage PTTaskMessageAllData, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskOpsecPostCheckRoutingKey(taskMessage.CommandPayloadType),
		"",
		taskMessage,
		false,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send message")
		return err
	}
	return nil
}
