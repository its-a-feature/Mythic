package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ReissueTaskInput struct {
	Input ReissueTask `json:"input" binding:"required"`
}

type ReissueTask struct {
	TaskDisplayID int `json:"task_display_id" binding:"required"`
}

type ReissueTaskResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func ReissueTaskWebhook(c *gin.Context) {
	reissueTask(c, false)
}

func ReissueTaskHandlerWebhook(c *gin.Context) {
	reissueTask(c, true)
}

func reissueTask(c *gin.Context, handlerRetry bool) {
	var input ReissueTaskInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for task reissue")
		c.JSON(http.StatusOK, ReissueTaskResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(nil, "Failed to get operatorOperation information for task reissue")
		c.JSON(http.StatusOK, ReissueTaskResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	task, err := getTaskByDisplayIDForOperation(input.Input.TaskDisplayID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to resolve task display id for task reissue")
		c.JSON(http.StatusOK, ReissueTaskResponse{
			Status: "error",
			Error:  "Failed to find task in current operation",
		})
		return
	}
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	if handlerRetry {
		err = rabbitmq.ReissueTaskHandler(task.ID, authContext)
	} else {
		err = rabbitmq.ReissueTask(task.ID, authContext)
	}
	if err != nil {
		c.JSON(http.StatusOK, ReissueTaskResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, ReissueTaskResponse{
		Status: "success",
	})
}
