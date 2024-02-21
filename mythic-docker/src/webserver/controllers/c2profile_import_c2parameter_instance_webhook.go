package webcontroller

import (
	"github.com/its-a-feature/Mythic/database"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// Structs defining the input we get from the user to process
type createC2ParameterInstanceInputFile struct {
	Input c2InstanceDefinitionFile `json:"input" binding:"required"`
}
type c2InstanceDefinitionFile struct {
	InstanceName  string                 `json:"instance_name" binding:"required"`
	C2ProfileName string                 `json:"c2profile_name" binding:"required"`
	Config        map[string]interface{} `json:"c2_instance" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func ImportC2ParameterInstanceWebhook(c *gin.Context) {
	var input createC2ParameterInstanceInputFile
	var structInput rabbitmq.CreateC2InstanceInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for ImportC2ParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CreateC2ParameterInstanceWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	c2Profile := databaseStructs.C2profile{}
	err = database.DB.Get(&c2Profile, `SELECT id FROM c2profile WHERE "name"=$1`, input.Input.C2ProfileName)
	if err != nil {
		logging.LogError(err, "Failed to find C2 Profile", "input", input.Input.C2ProfileName)
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	structInput.InstanceName = input.Input.InstanceName
	structInput.Parameters = input.Input.Config
	structInput.C2ID = c2Profile.ID
	response := rabbitmq.CreateC2Instance(structInput, operatorOperation)
	c.JSON(http.StatusOK, response)
}
