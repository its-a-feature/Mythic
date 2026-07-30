package rabbitmq

import "github.com/its-a-feature/Mythic/logging"

// SendPtTaskAgentRPC sends an asynchronous agent RPC request to the payload
// type associated with the callback, rather than the task's command payload
// type.
func (r *rabbitMQConnection) SendPtTaskAgentRPC(taskMessage PTTaskAgentRPCMessage, authContext RabbitMQAuthContext) error {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context for agent RPC")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetPtTaskAgentRPCRoutingKey(taskMessage.TaskData.PayloadType),
		"",
		taskMessage,
		false,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send agent RPC message")
		return err
	}
	return nil
}
