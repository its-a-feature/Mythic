package webcontroller

import (
	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type EventingManualTriggerInput struct {
	Input EventingManualTriggerMessage `json:"input" binding:"required"`
}

type EventingManualTriggerMessage struct {
	EventGroupID int `json:"eventgroup_id" binding:"required"`
}

type EventingManualTriggerMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func EventingTriggerManualWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingManualTriggerInput
	response := EventingManualTriggerMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingManualTriggerMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingManualTriggerMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		EventGroupID: input.Input.EventGroupID,
		OperationID:  operatorOperation.CurrentOperation.ID,
		OperatorID:   operatorOperation.CurrentOperator.ID,
		Trigger:      eventing.TriggerManual,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
