package webcontroller

import (
	"net/http"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
)

// Structs defining the input we get from the user to process
type custombrowserExportFunctionInput struct {
	Input custombrowserExportFunction `json:"input" binding:"required"`
}
type custombrowserExportFunction struct {
	TreeType      string `json:"tree_type"`
	Host          string `json:"host"`
	Path          string `json:"path"`
	CallbackGroup string `json:"callback_group"`
}

// this function called from webhook_endpoint through the UI or scripting
func CustomBrowserExportFunctionWebhook(c *gin.Context) {
	var input custombrowserExportFunctionInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for custombrowserExportFunctionInput")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(err, "Failed to get operatorOperation information for custombrowserExportFunctionInput")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)

	err = rabbitmq.RabbitMQConnection.SendCbExportFunction(rabbitmq.ExportFunctionMessage{
		TreeType:         input.Input.TreeType,
		ContainerName:    input.Input.TreeType,
		Host:             input.Input.Host,
		Path:             input.Input.Path,
		OperationID:      operatorOperation.CurrentOperation.ID,
		OperatorID:       operatorOperation.CurrentOperator.ID,
		OperatorUsername: operatorOperation.CurrentOperator.Username,
		CallbackGroup:    input.Input.CallbackGroup,
	})
	if err != nil {
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	c.JSON(http.StatusOK, gin.H{"status": "success"})
	return
}
