package webcontroller

import (
	"fmt"
	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
	"slices"
	"strings"
)

type EventingManualTriggerInput struct {
	Input EventingManualTriggerMessage `json:"input" binding:"required"`
}

type EventingManualTriggerMessage struct {
	EventGroupID   int                    `json:"eventgroup_id" binding:"required"`
	KeywordEnvData map[string]interface{} `json:"env_data"`
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
		EventGroupID:   input.Input.EventGroupID,
		OperationID:    operatorOperation.CurrentOperation.ID,
		OperatorID:     operatorOperation.CurrentOperator.ID,
		Trigger:        eventing.TriggerManual,
		KeywordEnvData: input.Input.KeywordEnvData,
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return

}

type EventingManualTriggerBulkInput struct {
	Input EventingManualTriggerBulkMessage `json:"input" binding:"required"`
}

type EventingManualTriggerBulkMessage struct {
	EventGroupID       int                    `json:"eventgroup_id" binding:"required"`
	KeywordEnvData     map[string]interface{} `json:"env_data"`
	TriggerContextType string                 `json:"trigger_context_type" binding:"required"`
	TriggerContextIDs  []int                  `json:"trigger_context_ids" binding:"required"`
}

type EventingManualTriggerBulkMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

var validTriggerContextTypes = []string{
	"callback_id", "payload_id", "task_id", "filemeta_id", "response_id",
}

func EventingTriggerManualBulkWebhook(c *gin.Context) {
	// get variables from the POST request
	var input EventingManualTriggerBulkInput
	response := EventingManualTriggerBulkMessageResponse{}
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
	if !slices.Contains(validTriggerContextTypes, input.Input.TriggerContextType) {
		c.JSON(http.StatusOK, EventingManualTriggerMessageResponse{
			Status: "error",
			Error:  fmt.Sprintf("trigger_context_type must be one of the following: %s", strings.Join(validTriggerContextTypes, ", ")),
		})
		return
	}
	go func() {
		for _, id := range input.Input.TriggerContextIDs {
			localKeywordEnvData := make(map[string]interface{}, len(input.Input.KeywordEnvData))
			for key, value := range input.Input.KeywordEnvData {
				localKeywordEnvData[key] = value
			}
			localKeywordEnvData[input.Input.TriggerContextType] = id
			rabbitmq.EventingChannel <- rabbitmq.EventNotification{
				EventGroupID:   input.Input.EventGroupID,
				OperationID:    operatorOperation.CurrentOperation.ID,
				OperatorID:     operatorOperation.CurrentOperator.ID,
				Trigger:        eventing.TriggerManual,
				KeywordEnvData: localKeywordEnvData,
			}
		}
	}()
	response.Status = "success"
	c.JSON(http.StatusOK, response)
	return
}
