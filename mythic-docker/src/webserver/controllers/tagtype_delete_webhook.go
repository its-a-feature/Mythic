package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// Structs defining the input we get from the user to process
type deleteTagtypeInput struct {
	Input tagtypeInput `json:"input" binding:"required"`
}
type tagtypeInput struct {
	ID int `json:"id" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func TagtypeDeleteWebhook(c *gin.Context) {
	var input deleteTagtypeInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for TagtypeDeleteWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(err, "Failed to get operatorOperation information for TagtypeDeleteWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		response := rabbitmq.TagtypeDelete(input.Input.ID, operatorOperation)
		c.JSON(http.StatusOK, response)
	}
}
