package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
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
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	eventGroupInstance := databaseStructs.EventGroupInstance{}
	err = database.DB.Get(&eventGroupInstance, `SELECT id, eventgroup_id FROM
                             eventgroupinstance 
                             WHERE id=$1 AND operation_id=$2`,
		input.Input.EventGroupInstanceID, authContext.OperationID)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		EventGroupInstanceID: input.Input.EventGroupInstanceID,
		EventGroupID:         eventGroupInstance.EventGroupID,
		OperationID:          authContext.OperationID,
		OperatorID:           authContext.OperatorID,
		APITokensID:          authContext.APITokensID,
		Trigger:              eventing.TriggerRunAgain,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
