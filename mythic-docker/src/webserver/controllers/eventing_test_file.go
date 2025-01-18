package webcontroller

import (
	"encoding/json"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"net/http"
)

type EventingTestFileWebhookInput struct {
	Input EventingTestFileInput `json:"input" binding:"required"`
}

type EventingTestFileInput struct {
	FileContents string `json:"file_contents" binding:"required"`
	FormatOutput string `json:"output_format"`
}
type EventingTestFileWebhookResponse struct {
	Status          string                 `json:"status"`
	Error           string                 `json:"error"`
	ParsedWorkflow  map[string]interface{} `json:"parsed_workflow"`
	FormattedOutput string                 `json:"formatted_output"`
}

func EventingTestFileWebhook(c *gin.Context) {
	var input EventingTestFileWebhookInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// parse the file
	eventData, err := eventing.Ingest([]byte(input.Input.FileContents))
	if err != nil {
		logging.LogError(err, "Failed to process file contents as Event data")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = eventing.EnsureActions(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to ensure actions are correct")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = eventing.EnsureTrigger(&eventData, true)
	if err != nil {
		logging.LogError(err, "Failed to ensure triggers are correct")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = eventing.ResolveDependencies(&eventData)
	if err != nil {
		logging.LogError(err, "Failed to resolve dependencies")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	workflowBytes, err := json.Marshal(eventData)
	if err != nil {
		logging.LogError(err, "Failed to marshal workflow to json")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	workflowMap := map[string]interface{}{}
	err = json.Unmarshal(workflowBytes, &workflowMap)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal workflow to map")
		c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	formattedOutput := input.Input.FileContents
	if input.Input.FormatOutput != "" {
		formattedOutput, err = getFormattedEventingFile(&eventData, true, input.Input.FormatOutput)
		if err != nil {
			logging.LogError(err, "Failed to unmarshal workflow to requested format")
			c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
	}
	c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
		Status:          "success",
		ParsedWorkflow:  workflowMap,
		FormattedOutput: formattedOutput,
	})
}
