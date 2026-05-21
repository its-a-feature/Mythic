package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

func (r *rabbitMQConnection) SendPtTaskProcessResponse(taskMessage PtTaskProcessResponseMessage, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskProcessResponseRoutingKey(taskMessage.TaskData.CommandPayloadType),
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
