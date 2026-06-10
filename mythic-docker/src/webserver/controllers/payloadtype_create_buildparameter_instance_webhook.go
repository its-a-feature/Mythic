package webcontroller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type createBuildParameterInstanceInput struct {
	Input buildParameterInstanceDefinition `json:"input" binding:"required"`
}
type buildParameterInstanceDefinition struct {
	InstanceName  string `json:"instance_name" binding:"required"`
	PayloadTypeID int    `json:"payload_type_id" binding:"required"`
	Config        string `json:"build_parameter_instance" binding:"required"`
}

func CreateBuildParameterInstanceWebhook(c *gin.Context) {
	var input createBuildParameterInstanceInput
	var structInput rabbitmq.CreateBuildParameterInstanceInput
	var parameters map[string]interface{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for CreateBuildParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreateBuildParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	err = json.Unmarshal([]byte(input.Input.Config), &parameters)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal build parameter instance definition, should be key value pairs", "input", input.Input.Config)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	structInput.InstanceName = input.Input.InstanceName
	structInput.Parameters = parameters
	structInput.PayloadTypeID = input.Input.PayloadTypeID
	response := rabbitmq.CreateBuildParameterInstance(structInput, operatorOperation)
	c.JSON(http.StatusOK, response)
}
