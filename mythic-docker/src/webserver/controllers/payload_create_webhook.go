package webcontroller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// Structs defining the input we get from the user to process
type BuildPayloadInput struct {
	Input BuildPayloadPayloadDefinition `json:"input" binding:"required"`
}
type BuildPayloadPayloadDefinition struct {
	PayloadDefinition string `json:"payloadDefinition" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func CreatePayloadWebhook(c *gin.Context) {
	var input BuildPayloadInput
	payloadConfig := rabbitmq.PayloadConfiguration{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for CreatePayloadWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreatePayloadWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	err = json.Unmarshal([]byte(input.Input.PayloadDefinition), &payloadConfig)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal payload definition", "input", input.Input.PayloadDefinition)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	// now actually create the payload
	newUUID, _, err := rabbitmq.RegisterNewPayload(payloadConfig, operatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to register payload for CreatePayloadWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success", "uuid": newUUID})
	return

}
