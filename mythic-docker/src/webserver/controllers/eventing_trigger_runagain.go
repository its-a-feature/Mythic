package webcontroller

import (
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type EventingTriggerRunAgainInput struct {
	Input EventingTriggerRunAgainMessage `json:"input" binding:"required"`
}

type EventingTriggerRunAgainMessage struct {
	EventGroupInstanceID int `json:"eventgroupinstance_id" binding:"required"`
}

type EventingTriggerRunAgainMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func EventingTriggerRunAgainWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingTriggerRunAgainInput
	response := EventingTriggerRunAgainMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTriggerRunAgainMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingTriggerRunAgainMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	eventGroupInstance := databaseStructs.EventGroupInstance{}
	err = database.DB.Get(&eventGroupInstance, `SELECT id, eventgroup_id FROM
                             eventgroupinstance 
                             WHERE id=$1 AND operation_id=$2`, input.Input.EventGroupInstanceID,
		operatorOperation.CurrentOperation.ID)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		EventGroupInstanceID: input.Input.EventGroupInstanceID,
		EventGroupID:         eventGroupInstance.EventGroupID,
		OperationID:          operatorOperation.CurrentOperation.ID,
		OperatorID:           operatorOperation.CurrentOperator.ID,
		Trigger:              eventing.TriggerRunAgain,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
