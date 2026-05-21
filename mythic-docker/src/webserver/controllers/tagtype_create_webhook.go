package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type TagTypesCreateInput struct {
	Input TagTypeCreateInput `json:"input" binding:"required"`
}
type TagTypeCreateInput struct {
	Name        string `json:"name" binding:"required"`
	Color       string `json:"color" binding:"required"`
	Description string `json:"description"`
}

// this function called from webhook_endpoint through the UI or scripting
func TagTypeCreateWebhook(c *gin.Context) {
	var input TagTypesCreateInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for TagtypeCreateWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, exists := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !exists {
		logging.LogError(nil, "Failed to get operator operation information")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "failed to get operator information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	databaseObj := databaseStructs.TagType{
		Name:        input.Input.Name,
		Color:       input.Input.Color,
		Description: input.Input.Description,
		Operation:   operatorOperation.CurrentOperation.ID,
	}
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	if authContext.APITokensID > 0 {
		databaseObj.APITokensID.Valid = true
		databaseObj.APITokensID.Int64 = int64(authContext.APITokensID)
	}
	if authContext.EventStepInstanceID > 0 {
		databaseObj.EventStepInstanceID.Valid = true
		databaseObj.EventStepInstanceID.Int64 = int64(authContext.EventStepInstanceID)
	}
	response := rabbitmq.TagtypeImport([]databaseStructs.TagType{databaseObj}, operatorOperation)
	c.JSON(http.StatusOK, response)
}
