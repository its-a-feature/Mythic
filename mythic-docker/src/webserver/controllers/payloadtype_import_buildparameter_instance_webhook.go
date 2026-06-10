package webcontroller

import (
	"net/http"

	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type createBuildParameterInstanceInputFile struct {
	Input buildParameterInstanceDefinitionFile `json:"input" binding:"required"`
}
type buildParameterInstanceDefinitionFile struct {
	InstanceName    string                 `json:"instance_name" binding:"required"`
	PayloadTypeName string                 `json:"payload_type_name" binding:"required"`
	Config          map[string]interface{} `json:"build_parameter_instance" binding:"required"`
}

func ImportBuildParameterInstanceWebhook(c *gin.Context) {
	var input createBuildParameterInstanceInputFile
	var structInput rabbitmq.CreateBuildParameterInstanceInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for ImportBuildParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for ImportBuildParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	payloadType := databaseStructs.Payloadtype{}
	err = database.DB.Get(&payloadType, `SELECT id FROM payloadtype WHERE "name"=$1`, input.Input.PayloadTypeName)
	if err != nil {
		logging.LogError(err, "Failed to find Payload Type", "input", input.Input.PayloadTypeName)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	structInput.InstanceName = input.Input.InstanceName
	structInput.Parameters = input.Input.Config
	structInput.PayloadTypeID = payloadType.ID
	response := rabbitmq.CreateBuildParameterInstance(structInput, operatorOperation)
	c.JSON(http.StatusOK, response)
}
