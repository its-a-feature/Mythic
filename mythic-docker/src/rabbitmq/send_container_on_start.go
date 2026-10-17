package rabbitmq

import (
	"github.com/its-a-feature/Mythic/logging"
)

type ContainerOnStartMessage struct {
	ContainerName string `json:"container_name"`
	OperationID   int    `json:"operation_id"`
	OperationName string `json:"operation_name"`
	ServerName    string `json:"server_name"`
	APIToken      string `json:"apitoken"`
}

func (r *rabbitMQConnection) SendContainerOnStart(onStartMessage ContainerOnStartMessage, authContext RabbitMQAuthContext) (string, error) {
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return "", err
	}
	authContextToken, _ := rabbitMQHeaderString(headers, MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER)
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetContainerOnStartRoutingKey(onStartMessage.ContainerName),
		"",
		onStartMessage,
		true,
		headers,
	)
	if err != nil {
		if authContextToken != "" {
			InvalidateRabbitMQAuthContextToken(authContextToken)
		}
		logging.LogError(err, "Failed to send message")
		return "", err
	}
	return authContextToken, nil
}
