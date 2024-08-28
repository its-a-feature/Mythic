package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
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
	ginOperatorOperation, exists := c.Get("operatorOperation")
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
	APITokenID, ok := c.Get("apitokens-id")
	if ok {
		if APITokenID.(int) > 0 {
			databaseObj.APITokensID.Valid = true
			databaseObj.APITokensID.Int64 = int64(APITokenID.(int))
		}
	}
	response := rabbitmq.TagtypeImport([]databaseStructs.TagType{databaseObj}, operatorOperation)
	c.JSON(http.StatusOK, response)
}
