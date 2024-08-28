package webcontroller

import (
	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
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
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingTriggerRetryFromStepMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		OperationID:         operatorOperation.CurrentOperation.ID,
		OperatorID:          operatorOperation.CurrentOperator.ID,
		EventStepInstanceID: input.Input.EventStepInstanceID,
		Trigger:             eventing.TriggerRetryFromStep,
		RetryAllEventGroups: input.Input.RetryAllFailedGroupInstances,
	}

	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
