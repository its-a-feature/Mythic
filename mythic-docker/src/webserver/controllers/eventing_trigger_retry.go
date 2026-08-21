package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
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
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		EventGroupInstanceID: input.Input.EventGroupInstanceID,
		OperationID:          authContext.OperationID,
		OperatorID:           authContext.OperatorID,
		APITokensID:          authContext.APITokensID,
		Trigger:              eventing.TriggerRetry,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
