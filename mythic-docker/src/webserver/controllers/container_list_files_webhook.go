package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type GetContainerFileListInput struct {
	Input GetContainerFileList `json:"input" binding:"required"`
}

type GetContainerFileList struct {
	ContainerName string `json:"container_name" binding:"required"`
	Path          string `json:"path"`
}

type GetContainerFileListResponse struct {
	Status  string   `json:"status"`
	Error   string   `json:"error"`
	Files   []string `json:"files"`
	Folders []string `json:"folders"`
}

func ContainerListFilesWebhook(c *gin.Context) {
	// get variables from the POST request
	var input GetContainerFileListInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendContainerRPCListFile(rabbitmq.ContainerRPCListFileMessage{
		Name: input.Input.ContainerName,
		Path: input.Input.Path,
	}, authentication.RabbitMQAuthContextFromGin(c))
	if err != nil {
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  "Failed to send message to container",
		})
		return
	}
	if !c2ProfileResponse.Success {
		logging.LogError(nil, c2ProfileResponse.Error, "Failed to get files from container")
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	}
	c.JSON(http.StatusOK, GetContainerFileListResponse{
		Status:  "success",
		Files:   c2ProfileResponse.Files,
		Folders: c2ProfileResponse.Folders,
	})
	return

}
