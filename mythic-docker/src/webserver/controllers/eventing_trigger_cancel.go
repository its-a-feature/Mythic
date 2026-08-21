package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type EventingTriggerCancelInput struct {
	Input EventingTriggerCancelMessage `json:"input" binding:"required"`
}

type EventingTriggerCancelMessage struct {
	EventGroupInstanceID int `json:"eventgroupinstance_id" binding:"required"`
}

type EventingTriggerCancelMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func EventingTriggerCancelWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingTriggerCancelInput
	response := EventingTriggerCancelMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTriggerCancelMessageResponse{
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
		Trigger:              eventing.TriggerCancel,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
