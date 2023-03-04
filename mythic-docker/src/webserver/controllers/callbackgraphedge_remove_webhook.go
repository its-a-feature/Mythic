package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// Structs defining the input we get from the user to process
type callbackgraphedgeRemoveInput struct {
	Input callbackgraphedgeRemove `json:"input" binding:"required"`
}
type callbackgraphedgeRemove struct {
	EdgeId int `json:"edge_id" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func CallbackgraphedgeRemoveWebhook(c *gin.Context) {
	var input callbackgraphedgeRemoveInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for CallbackgraphedgeRemoveWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(err, "Failed to get operatorOperation information for CallbackgraphedgeAddWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": "Failed to get current operation. Is it set?"})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		if err := rabbitmq.RemoveEdgeById(input.Input.EdgeId, operatorOperation); err != nil {
			logging.LogError(err, "Failed to remove callback edge")
			c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		} else {
			c.JSON(http.StatusOK, gin.H{"status": "success"})
		}
	}
}
