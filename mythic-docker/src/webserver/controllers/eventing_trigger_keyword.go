package webcontroller

import (
	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
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
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingTriggerKeywordMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		OperationID:    operatorOperation.CurrentOperation.ID,
		OperatorID:     operatorOperation.CurrentOperator.ID,
		Trigger:        eventing.TriggerKeyword,
		Keyword:        input.Input.Keyword,
		KeywordEnvData: input.Input.KeywordEnvData,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}
