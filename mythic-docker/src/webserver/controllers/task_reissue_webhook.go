package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ReissueTaskInput struct {
	Input ReissueTask `json:"input" binding:"required"`
}

type ReissueTask struct {
	TaskID int `json:"task_id" binding:"required"`
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
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	var err error
	if handlerRetry {
		err = rabbitmq.ReissueTaskHandler(input.Input.TaskID, authContext)
	} else {
		err = rabbitmq.ReissueTask(input.Input.TaskID, authContext)
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
