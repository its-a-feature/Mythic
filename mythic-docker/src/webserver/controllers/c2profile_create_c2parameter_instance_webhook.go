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
type createC2ParameterInstanceInput struct {
	Input c2InstanceDefinition `json:"input" binding:"required"`
}
type c2InstanceDefinition struct {
	InstanceName string `json:"instance_name" binding:"required"`
	C2ProfileID  int    `json:"c2profile_id" binding:"required"`
	Config       string `json:"c2_instance" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func CreateC2ParameterInstanceWebhook(c *gin.Context) {
	var input createC2ParameterInstanceInput
	var structInput rabbitmq.CreateC2InstanceInput
	var parameters map[string]interface{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for CreateC2ParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreateC2ParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	err = json.Unmarshal([]byte(input.Input.Config), &parameters)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal c2 instance definition, should be key value pairs", "input", input.Input.Config)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	structInput.InstanceName = input.Input.InstanceName
	structInput.Parameters = parameters
	structInput.C2ID = input.Input.C2ProfileID
	response := rabbitmq.CreateC2Instance(structInput, operatorOperation)
	c.JSON(http.StatusOK, response)
}
