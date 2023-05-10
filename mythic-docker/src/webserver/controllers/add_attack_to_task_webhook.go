package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
)

type AddAttackToTaskWebhookInput struct {
	Input AddAttackToTaskWebhookData `json:"input" binding:"required"`
}

type AddAttackToTaskWebhookData struct {
	TNum          string `json:"t_num" binding:"required"`
	TaskDisplayID int    `json:"task_display_id" binding:"required"`
}

type AddAttackToTaskWebhookResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func AddAttackToTaskWebhook(c *gin.Context) {
	// get variables from the POST request
	var input AddAttackToTaskWebhookInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, AddAttackToTaskWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, AddAttackToTaskWebhookResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	} else {
		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		if err := rabbitmq.AddAttackToTask(input.Input.TNum, input.Input.TaskDisplayID, operatorOperation.CurrentOperation.ID); err != nil {
			c.JSON(http.StatusOK, AddAttackToTaskWebhookResponse{
				Status: "error",
				Error:  err.Error(),
			})

		} else {
			c.JSON(http.StatusOK, AddAttackToTaskWebhookResponse{
				Status: "success",
			})
		}
	}
}
