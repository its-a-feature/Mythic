package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type EventingTriggerRetryFromStepInput struct {
	Input EventingTriggerRetryFromStepMessage `json:"input" binding:"required"`
}

type EventingTriggerRetryFromStepMessage struct {
	EventStepInstanceID          int  `json:"eventstepinstance_id" binding:"required"`
	RetryAllFailedGroupInstances bool `json:"retry_all_groups"`
}

type EventingTriggerRetryFromStepMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func EventingTriggerRetryFromStepWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingTriggerRetryFromStepInput
	response := EventingTriggerRetryFromStepMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTriggerRetryFromStepMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		OperationID:         authContext.OperationID,
		OperatorID:          authContext.OperatorID,
		APITokensID:         authContext.APITokensID,
		EventStepInstanceID: input.Input.EventStepInstanceID,
		Trigger:             eventing.TriggerRetryFromStep,
		RetryAllEventGroups: input.Input.RetryAllFailedGroupInstances,
	}

	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
