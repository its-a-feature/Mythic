package webcontroller

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type GetContainerFileInput struct {
	Input GetContainerFile `json:"input" binding:"required"`
}

type GetContainerFile struct {
	Filename      string `json:"filename" binding:"required"`
	ContainerName string `json:"container_name" binding:"required"`
}

type GetContainerFileResponse struct {
	Status   string `json:"status"`
	Filename string `json:"filename"`
	Data     string `json:"data"`
	Error    string `json:"error"`
	Version  string `json:"version"`
}

func ContainerDownloadFileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input GetContainerFileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendContainerRPCGetFile(rabbitmq.ContainerGetFileMessage{
		Filename: input.Input.Filename,
		Name:     input.Input.ContainerName,
	})
	if err != nil {
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status: "error",
			Error:  "Failed to send message to container",
		})
		return
		// check the response from the RPC call for success or error
	}
	if !c2ProfileResponse.Success {
		logging.LogError(nil, string(c2ProfileResponse.Message), "Failed to get file from container")
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	}
	base64Contents := base64.RawStdEncoding.EncodeToString(c2ProfileResponse.Message)
	c.JSON(http.StatusOK, GetContainerFileResponse{
		Status:   "success",
		Filename: input.Input.Filename,
		Data:     base64Contents,
	})
	return

}
