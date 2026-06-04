package webcontroller

import (
	"net/http"

	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/rabbitmq"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

// Structs defining the input we get from the user to process
type RequestOpsecBypassInput struct {
	Input RequestOpsecBypass `json:"input" binding:"required"`
}
type RequestOpsecBypass struct {
	TaskDisplayID int `json:"task_display_id" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func RequestOpsecBypassWebhook(c *gin.Context) {
	var input RequestOpsecBypassInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for RequestOpsecBypassWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for RequestOpsecBypassWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	task, err := getTaskByDisplayIDForOperation(input.Input.TaskDisplayID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to resolve task display id for RequestOpsecBypassWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to find task in current operation"})
		return
	}
	c.JSON(http.StatusOK, rabbitmq.RequestOpsecBypass(rabbitmq.RequestOpsecBypassMessage{
		TaskID:            task.ID,
		OperatorOperation: operatorOperation,
		AuthContext:       authentication.RabbitMQAuthContextFromGin(c),
	}))
	return
}
