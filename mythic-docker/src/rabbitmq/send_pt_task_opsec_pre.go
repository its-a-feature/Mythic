package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtTaskOPSECPre(taskMessage PTTaskMessageAllData, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskOpsecPreCheckRoutingKey(taskMessage.CommandPayloadType),
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
