package webcontroller

import (
	"errors"
	"github.com/its-a-feature/Mythic/database"
	"net/http"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type SendExternalWebhookInput struct {
	Input ExternalWebhook `json:"input" binding:"required"`
}

type ExternalWebhook struct {
	WebhookType string            `json:"webhook_type"`
	WebhookData map[string]string `json:"webhook_data" binding:"required"`
}

type SendExternalWebhookResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func SendExternalWebhookWebhook(c *gin.Context) {
	// get variables from the POST request
	var input SendExternalWebhookInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, SendExternalWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, SendExternalWebhookResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		webhookDataMap := make(map[string]interface{})
		for key, entry := range input.Input.WebhookData {
			if strings.HasSuffix(key, "_id") {
				if taskIdInt, err := strconv.Atoi(entry); err != nil {
					logging.LogError(err, "Failed to convert task_id to int", "_id value", entry)
				} else {
					if key == "task_id" && taskIdInt > 0 {
						// need to convert this from display_id to task_id
						task := databaseStructs.Task{DisplayID: taskIdInt, OperationID: operatorOperation.CurrentOperation.ID}
						if err := database.DB.Get(&task, `SELECT id FROM task WHERE display_id=$1 AND operation_id=$2`,
							task.DisplayID, task.OperationID); err != nil {
							logging.LogError(err, "Failed to find task given id and operation")
							c.JSON(http.StatusOK, SendExternalWebhookResponse{
								Status: "error",
								Error:  "Failed to locate task",
							})
							return
						} else {
							webhookDataMap["task_id"] = task.ID
							webhookDataMap["display_id"] = taskIdInt
						}

					} else {
						webhookDataMap[key] = taskIdInt
					}

				}
			} else {
				webhookDataMap[key] = entry
			}

		}
		webhookMessage := rabbitmq.WebhookMessage{
			OperationID:      operatorOperation.CurrentOperation.ID,
			OperationName:    operatorOperation.CurrentOperation.Name,
			OperationWebhook: operatorOperation.CurrentOperation.Webhook,
			OperationChannel: operatorOperation.CurrentOperation.Channel,
			OperatorUsername: operatorOperation.CurrentOperator.Username,
			Data:             webhookDataMap,
			Action:           input.Input.WebhookType,
		}
		switch input.Input.WebhookType {
		case rabbitmq.WEBHOOK_TYPE_NEW_CALLBACK:
		case rabbitmq.WEBHOOK_TYPE_NEW_FEEDBACK:
		case "new_custom":
			fallthrough
		case "":
			webhookMessage.Action = rabbitmq.WEBHOOK_TYPE_CUSTOM
		default:
			logging.LogError(errors.New("Unknown webhook type for SendExternalWebhookWebhook"),
				"Failed to find webhook type", "webhook_type", input.Input.WebhookType)
			c.JSON(http.StatusOK, SendExternalWebhookResponse{
				Status: "error",
				Error:  "unknown webhook_type - try 'new_custom' or ''",
			})
			return
		}
		go rabbitmq.RabbitMQConnection.EmitWebhookMessage(webhookMessage)
		c.JSON(http.StatusOK, SendExternalWebhookResponse{
			Status: "success",
		})
		return
	}

}
