package rabbitmq

func (r *rabbitMQConnection) SendPtOnNewCallback(newCallbackMessage PTOnNewCallbackAllData) error {
	if err := r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtOnNewCallbackRoutingKey(newCallbackMessage.PayloadType),
		"",
		newCallbackMessage,
		false,
	); err != nil {
		return err
	} else {
		return nil
	}
}
