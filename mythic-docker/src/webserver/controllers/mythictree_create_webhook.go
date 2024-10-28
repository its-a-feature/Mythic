package webcontroller

import (
	"github.com/its-a-feature/Mythic/database"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type MythictreeCreateInput struct {
	Input MythictreeCreate `json:"input" binding:"required"`
}
type MythictreeCreate struct {
	TaskId         int                                                 `json:"task_id" binding:"required"`
	FileBrowser    *rabbitmq.MythicRPCFileBrowserCreateFileBrowserData `json:"file_browser"`
	ProcessBrowser *[]rabbitmq.MythicRPCProcessCreateProcessData       `json:"process_browser"`
}

// this function called from webhook_endpoint through the UI or scripting
func MythictreeCreateWebhook(c *gin.Context) {
	var input MythictreeCreateInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for FileMetaCreateWebhook")
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
	apitokenId := 0
	APITokenID, ok := c.Get("apitokens-id")
	if ok {
		if APITokenID.(int) > 0 {
			apitokenId = APITokenID.(int)
		}
	}
	task := databaseStructs.Task{}
	err = database.DB.Get(&task, `SELECT
		task.id, task.status, task.completed, task.status_timestamp_processed, task.operator_id, task.operation_id,
		task.apitokens_id, task.eventstepinstance_id,
		callback.host "callback.host",
		callback.user "callback.user",
		callback.id "callback.id",
		callback.mythictree_groups "callback.mythictree_groups",
		callback.display_id "callback.display_id",
		payload.payload_type_id "callback.payload.payload_type_id",
		payload.os "callback.payload.os"
		FROM task
		JOIN callback ON task.callback_id = callback.id
		JOIN payload ON callback.registered_payload_id = payload.id
		WHERE task.id = $1 AND task.operation_id = $2`, input.Input.TaskId, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to fetch task")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "failed to get task information",
		})
		return
	}
	if input.Input.FileBrowser != nil {
		err = rabbitmq.HandleAgentMessagePostResponseFileBrowser(task, input.Input.FileBrowser, apitokenId)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}
	}
	if input.Input.ProcessBrowser != nil {
		err = rabbitmq.HandleAgentMessagePostResponseProcesses(task, input.Input.ProcessBrowser, apitokenId)
		if err != nil {
			c.JSON(http.StatusOK, gin.H{
				"status": "error",
				"error":  err.Error(),
			})
			return
		}
	}

	c.JSON(http.StatusOK, gin.H{"status": "success"})
}
