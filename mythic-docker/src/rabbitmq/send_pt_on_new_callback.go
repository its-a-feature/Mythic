package rabbitmq

import "github.com/its-a-feature/Mythic/logging"

func (r *rabbitMQConnection) SendPtOnNewCallback(newCallbackMessage PTOnNewCallbackAllData, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return err
	}
	return r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtOnNewCallbackRoutingKey(newCallbackMessage.PayloadType),
		"",
		newCallbackMessage,
		false,
		headers,
	)
}
