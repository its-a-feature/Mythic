package webcontroller

import (
	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type EventingTriggerRetryInput struct {
	Input EventingTriggerRetryMessage `json:"input" binding:"required"`
}

type EventingTriggerRetryMessage struct {
	EventGroupInstanceID int `json:"eventgroupinstance_id" binding:"required"`
}

type EventingTriggerRetryMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func EventingTriggerRetryWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingTriggerRetryInput
	response := EventingTriggerRetryMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTriggerRetryMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingTriggerRetryMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		EventGroupInstanceID: input.Input.EventGroupInstanceID,
		OperationID:          operatorOperation.CurrentOperation.ID,
		OperatorID:           operatorOperation.CurrentOperator.ID,
		Trigger:              eventing.TriggerRetry,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
