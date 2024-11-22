package webcontroller

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type WriteContainerFileInput struct {
	Input WriteContainerFile `json:"input" binding:"required"`
}

type WriteContainerFile struct {
	Filename      string `json:"file_path" binding:"required"`
	ContainerName string `json:"container_name" binding:"required"`
	Data          string `json:"data" binding:"required"`
}

type WriteContainerFileResponse struct {
	Status  string `json:"status"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func ContainerWriteFileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input WriteContainerFileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	fileContents, err := base64.StdEncoding.DecodeString(input.Input.Data)
	if err != nil {
		logging.LogError(err, "Failed to base64 decode file contents")
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  "Failed to base64 decode file contents",
		})
		return
	}
	c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendContainerRPCWriteFile(rabbitmq.ContainerWriteFileMessage{
		Filename: input.Input.Filename,
		Name:     input.Input.ContainerName,
		Contents: fileContents,
	})
	if err != nil {
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  "Failed to send message to container",
		})
		return
		// check the response from the RPC call for success or error
	}
	if !c2ProfileResponse.Success {
		logging.LogError(nil, c2ProfileResponse.Error, "Failed to write file to container")
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	}
	if input.Input.Filename == "config.json" {
		go rabbitmq.RestartC2ServerAfterUpdate(input.Input.ContainerName, false)
	}
	go rabbitmq.CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(input.Input.ContainerName)
	c.JSON(http.StatusOK, WriteContainerFileResponse{
		Status: "success",
	})
	return

}
