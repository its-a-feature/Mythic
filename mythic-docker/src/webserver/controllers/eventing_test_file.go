package webcontroller

import (
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
}
type EventingTestFileWebhookResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
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
	err = eventing.EnsureTrigger(&eventData)
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

	c.JSON(http.StatusOK, EventingTestFileWebhookResponse{
		Status: "success",
	})
}
