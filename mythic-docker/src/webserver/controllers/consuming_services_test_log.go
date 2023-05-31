package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
)

// Structs defining the input we get from the user to process
type consumingServicesTestLogInput struct {
	Input consumingServicesTestLog `json:"input" binding:"required"`
}
type consumingServicesTestLog struct {
	ServiceType string `json:"service_type" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func ConsumingServicesTestLog(c *gin.Context) {
	var input consumingServicesTestLogInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for consumingServicesTestLogInput")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(err, "Failed to get operatorOperation information for ConsumingServicesTestLog")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		messageData := make(map[string]interface{})
		switch input.Input.ServiceType {
		case rabbitmq.LOG_TYPE_CALLBACK:
		case rabbitmq.LOG_TYPE_CREDENTIAL:
		case rabbitmq.LOG_TYPE_PAYLOAD:
		case rabbitmq.LOG_TYPE_KEYLOG:
		case rabbitmq.LOG_TYPE_FILE:
		case rabbitmq.LOG_TYPE_TASK:
		case rabbitmq.LOG_TYPE_ARTIFACT:
		case rabbitmq.LOG_TYPE_RESPONSE:
		default:

		}
		if err = rabbitmq.RabbitMQConnection.EmitSiemMessage(rabbitmq.LoggingMessage{
			OperationID:   operatorOperation.CurrentOperation.ID,
			OperationName: operatorOperation.CurrentOperation.Name,
			Action:        input.Input.ServiceType,
			Data:          messageData,
		}); err != nil {
			c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		} else {
			c.JSON(http.StatusOK, gin.H{"status": "success"})
		}

	}
}
