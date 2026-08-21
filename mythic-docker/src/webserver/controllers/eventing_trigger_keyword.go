package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type EventingTriggerKeywordInput struct {
	Input EventingTriggerKeywordMessage `json:"input" binding:"required"`
}

type EventingTriggerKeywordMessage struct {
	Keyword        string                 `json:"keyword" binding:"required"`
	KeywordEnvData map[string]interface{} `json:"keywordEnvData"`
}

type EventingTriggerKeywordMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func EventingTriggerKeywordWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingTriggerKeywordInput
	response := EventingTriggerKeywordMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTriggerKeywordMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		OperationID:    authContext.OperationID,
		OperatorID:     authContext.OperatorID,
		APITokensID:    authContext.APITokensID,
		Trigger:        eventing.TriggerKeyword,
		Keyword:        input.Input.Keyword,
		KeywordEnvData: input.Input.KeywordEnvData,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
