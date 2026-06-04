package webcontroller

import (
	"fmt"
	"net/http"
	"slices"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
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
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
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
	"callback_display_id", "payload_id", "task_display_id", "filemeta_id", "response_id",
}

type resolvedTriggerContext struct {
	key string
	id  int
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
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
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
	resolvedContexts := make([]resolvedTriggerContext, 0, len(input.Input.TriggerContextIDs))
	for _, id := range input.Input.TriggerContextIDs {
		switch input.Input.TriggerContextType {
		case "callback_display_id":
			callback, err := getCallbackByDisplayIDForOperation(id, operatorOperation.CurrentOperation.ID)
			if err != nil {
				logging.LogError(err, "Failed to resolve callback display id for manual eventing trigger")
				c.JSON(http.StatusOK, EventingManualTriggerMessageResponse{
					Status: "error",
					Error:  "Failed to find callback in current operation",
				})
				return
			}
			resolvedContexts = append(resolvedContexts, resolvedTriggerContext{key: "callback_id", id: callback.ID})
		case "task_display_id":
			task, err := getTaskByDisplayIDForOperation(id, operatorOperation.CurrentOperation.ID)
			if err != nil {
				logging.LogError(err, "Failed to resolve task display id for manual eventing trigger")
				c.JSON(http.StatusOK, EventingManualTriggerMessageResponse{
					Status: "error",
					Error:  "Failed to find task in current operation",
				})
				return
			}
			resolvedContexts = append(resolvedContexts, resolvedTriggerContext{key: "task_id", id: task.ID})
		default:
			resolvedContexts = append(resolvedContexts, resolvedTriggerContext{key: input.Input.TriggerContextType, id: id})
		}
	}
	go func() {
		for _, context := range resolvedContexts {
			localKeywordEnvData := make(map[string]interface{}, len(input.Input.KeywordEnvData))
			for key, value := range input.Input.KeywordEnvData {
				localKeywordEnvData[key] = value
			}
			localKeywordEnvData[context.key] = context.id
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
