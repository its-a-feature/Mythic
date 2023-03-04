package webcontroller

import (
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

// Structs defining the input we get from the user to process
type RequestOpsecBypassInput struct {
	Input RequestOpsecBypass `json:"input" binding:"required"`
}
type RequestOpsecBypass struct {
	TaskID int `json:"task_id" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func RequestOpsecBypassWebhook(c *gin.Context) {
	var input RequestOpsecBypassInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for RequestOpsecBypassWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(err, "Failed to get operatorOperation information for RequestOpsecBypassWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		c.JSON(http.StatusOK, rabbitmq.RequestOpsecBypass(rabbitmq.RequestOpsecBypassMessage{
			TaskID:            input.Input.TaskID,
			OperatorOperation: operatorOperation,
		}))
		return
	}
}
