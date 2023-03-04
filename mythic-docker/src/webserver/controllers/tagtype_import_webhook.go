package webcontroller

import (
	"encoding/json"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type importTagTypesInput struct {
	Input tagTypeInputString `json:"input" binding:"required"`
}
type tagTypeInputString struct {
	TagTypeString string `json:"tagtypes" binding:"required"`
}

// this function called from webhook_endpoint through the UI or scripting
func TagtypeImportWebhook(c *gin.Context) {
	var input importTagTypesInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for TagtypeImportWebhook")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	} else if ginOperatorOperation, exists := c.Get("operatorOperation"); !exists {
		logging.LogError(nil, "Failed to get operator operation information")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "failed to get operator information",
		})
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		tagtypes := []databaseStructs.TagType{}
		if err := json.Unmarshal([]byte(input.Input.TagTypeString), &tagtypes); err != nil {
			logging.LogError(err, "Failed to unmarshal import contents into array of tagtypes")
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  "Failed to unmarshal file contents into array of tagtypes",
			})
		} else {
			response := rabbitmq.TagtypeImport(tagtypes, operatorOperation)
			c.JSON(http.StatusOK, response)
		}
	}

}
