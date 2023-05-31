package webcontroller

import (
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
)

type consumingServicesListConsumersOutput struct {
	Webhooks map[string]uint `json:"webhooks"`
	Loggers  map[string]uint `json:"loggers"`
}

// this function called from webhook_endpoint through the UI or scripting
func ConsumingServicesListConsumers(c *gin.Context) {
	consumers := consumingServicesListConsumersOutput{
		Webhooks: make(map[string]uint),
		Loggers:  make(map[string]uint),
	}
	consumers.Loggers[rabbitmq.LOG_TYPE_CALLBACK], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_CALLBACK))

	consumers.Loggers[rabbitmq.LOG_TYPE_ARTIFACT], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_ARTIFACT))

	consumers.Loggers[rabbitmq.LOG_TYPE_CREDENTIAL], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_CREDENTIAL))

	consumers.Loggers[rabbitmq.LOG_TYPE_FILE], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_FILE))

	consumers.Loggers[rabbitmq.LOG_TYPE_KEYLOG], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_KEYLOG))

	consumers.Loggers[rabbitmq.LOG_TYPE_PAYLOAD], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_PAYLOAD))

	consumers.Loggers[rabbitmq.LOG_TYPE_TASK], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_TASK))

	consumers.Loggers[rabbitmq.LOG_TYPE_RESPONSE], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetLoggingRoutingKey(rabbitmq.LOG_TYPE_RESPONSE))

	consumers.Webhooks[rabbitmq.WEBHOOK_TYPE_NEW_CALLBACK], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetWebhookRoutingKey(rabbitmq.WEBHOOK_TYPE_NEW_CALLBACK))

	consumers.Webhooks[rabbitmq.WEBHOOK_TYPE_NEW_FEEDBACK], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetWebhookRoutingKey(rabbitmq.WEBHOOK_TYPE_NEW_FEEDBACK))

	consumers.Webhooks[rabbitmq.WEBHOOK_TYPE_NEW_STARTUP], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetWebhookRoutingKey(rabbitmq.WEBHOOK_TYPE_NEW_STARTUP))

	consumers.Webhooks[rabbitmq.WEBHOOK_TYPE_ALERT], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetWebhookRoutingKey(rabbitmq.WEBHOOK_TYPE_ALERT))

	consumers.Webhooks[rabbitmq.WEBHOOK_TYPE_CUSTOM], _ = rabbitmq.RabbitMQConnection.GetNumberOfConsumersDirectChannels(
		rabbitmq.MYTHIC_TOPIC_EXCHANGE, "topic", rabbitmq.GetWebhookRoutingKey(rabbitmq.WEBHOOK_TYPE_CUSTOM))

	c.JSON(http.StatusOK, consumers)
}
