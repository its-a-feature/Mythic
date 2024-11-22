package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ContainerRemoveFileInput struct {
	Input ContainerRemoveFile `json:"input" binding:"required"`
}

type ContainerRemoveFile struct {
	Filename      string `json:"filename" binding:"required"`
	ContainerName string `json:"container_name" binding:"required"`
}

type RemoveContainerFileResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func ContainerRemoveFileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ContainerRemoveFileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusOK, RemoveContainerFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendContainerRPCRemoveFile(rabbitmq.ContainerRemoveFileMessage{
		Filename: input.Input.Filename,
		Name:     input.Input.ContainerName,
	})
	if err != nil {
		c.JSON(http.StatusOK, RemoveContainerFileResponse{
			Status: "error",
			Error:  "Failed to send message to container",
		})
		return
		// check the response from the RPC call for success or error
	}
	if !c2ProfileResponse.Success {
		logging.LogError(nil, c2ProfileResponse.Error, "Failed to get file from container")
		c.JSON(http.StatusOK, RemoveContainerFileResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	}
	go rabbitmq.CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(input.Input.ContainerName)
	c.JSON(http.StatusOK, RemoveContainerFileResponse{Status: "success"})
	return
}
