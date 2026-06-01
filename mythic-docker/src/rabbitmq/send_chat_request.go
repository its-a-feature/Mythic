package rabbitmq

import (
	"time"

	"github.com/its-a-feature/Mythic/logging"
)

type ChatContainerContextMessage struct {
	ID                int       `db:"id" json:"id" mapstructure:"id"`
	AuthorType        string    `db:"author_type" json:"author_type" mapstructure:"author_type"`
	SenderDisplayName string    `db:"sender_display_name" json:"sender_display_name" mapstructure:"sender_display_name"`
	Message           string    `db:"message" json:"message" mapstructure:"message"`
	CreatedAt         time.Time `db:"created_at" json:"created_at" mapstructure:"created_at"`
}

type ChatContainerRequestMessage struct {
	ContainerName     string                        `json:"container_name" mapstructure:"container_name"`
	OperationID       int                           `json:"operation_id" mapstructure:"operation_id"`
	ChannelID         int                           `json:"channel_id" mapstructure:"channel_id"`
	APITokenID        int                           `json:"apitokens_id" mapstructure:"apitokens_id"`
	ChannelName       string                        `json:"channel_name" mapstructure:"channel_name"`
	ChannelSlug       string                        `json:"channel_slug" mapstructure:"channel_slug"`
	RequestID         int                           `json:"request_id" mapstructure:"request_id"`
	RequestMessageID  int                           `json:"request_message_id" mapstructure:"request_message_id"`
	ResponseMessageID int                           `json:"response_message_id" mapstructure:"response_message_id"`
	Model             string                        `json:"model" mapstructure:"model"`
	Prompt            string                        `json:"prompt" mapstructure:"prompt"`
	Config            map[string]interface{}        `json:"config" mapstructure:"config"`
	Context           []ChatContainerContextMessage `json:"context" mapstructure:"context"`
	Secrets           map[string]interface{}        `json:"secrets" mapstructure:"secrets"`
}

type ChatContainerCancelRequestMessage struct {
	ContainerName     string `json:"container_name" mapstructure:"container_name"`
	OperationID       int    `json:"operation_id" mapstructure:"operation_id"`
	ChannelID         int    `json:"channel_id" mapstructure:"channel_id"`
	RequestID         int    `json:"request_id" mapstructure:"request_id"`
	ResponseMessageID int    `json:"response_message_id" mapstructure:"response_message_id"`
	Reason            string `json:"reason" mapstructure:"reason"`
	CancelledBy       int    `json:"cancelled_by" mapstructure:"cancelled_by"`
}

func (r *rabbitMQConnection) SendChatContainerRequest(containerName string, chatMessage ChatContainerRequestMessage, authContext RabbitMQAuthContext) error {
	chatMessage.ContainerName = containerName
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context for chat request")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetChatContainerRequestRoutingKey(containerName),
		"",
		chatMessage,
		false,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send chat request", "container", containerName, "request_id", chatMessage.RequestID)
		return err
	}
	return nil
}

func (r *rabbitMQConnection) SendChatContainerCancelRequest(containerName string, cancelMessage ChatContainerCancelRequestMessage, authContext RabbitMQAuthContext) error {
	cancelMessage.ContainerName = containerName
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context for chat cancellation")
		return err
	}
	err = r.SendStructMessage(
		MYTHIC_EXCHANGE,
		GetChatContainerCancelRoutingKey(containerName),
		"",
		cancelMessage,
		false,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send chat cancellation", "container", containerName, "request_id", cancelMessage.RequestID)
		return err
	}
	return nil
}
