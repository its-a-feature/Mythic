package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
)

// Structs defining the input we get from the user to process
type consumingServicesTestInput struct {
	Input consumingServicesTest `json:"input" binding:"required"`
}
type consumingServicesTest struct {
	ServiceType string `json:"service_type" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func ConsumingServicesTestWebhook(c *gin.Context) {
	var input consumingServicesTestInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for consumingServicesTestInput")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(err, "Failed to get operatorOperation information for consumingServicesTestInput")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		messageData := make(map[string]interface{})
		switch input.Input.ServiceType {
		case rabbitmq.WEBHOOK_TYPE_NEW_STARTUP:
			messageData["startup_message"] = "Mythic started!"
		case rabbitmq.WEBHOOK_TYPE_NEW_FEEDBACK:
			messageData["feedback_type"] = "bug"
			messageData["message"] = "oh snap! :snap: We found a bug!"
		case rabbitmq.WEBHOOK_TYPE_NEW_CALLBACK:
			messageData["description"] = "This is a test callback notification!"
		case rabbitmq.WEBHOOK_TYPE_ALERT:
			messageData["source"] = "MythicTest"
			messageData["message"] = "This is a test alert!"
		case rabbitmq.WEBHOOK_TYPE_CUSTOM:
			messageData["some data"] = "some value"
			messageData["some other data"] = "some other value"
		default:

		}
		if err = rabbitmq.RabbitMQConnection.EmitWebhookMessage(rabbitmq.WebhookMessage{
			OperationID:      operatorOperation.CurrentOperation.ID,
			OperationName:    operatorOperation.CurrentOperation.Name,
			OperationWebhook: operatorOperation.CurrentOperation.Webhook,
			OperationChannel: operatorOperation.CurrentOperation.Channel,
			OperatorUsername: operatorOperation.CurrentOperator.Username,
			Action:           input.Input.ServiceType,
			Data:             messageData,
		}); err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		} else {
			c.JSON(http.StatusOK, gin.H{"status": "success"})
		}

	}
}
