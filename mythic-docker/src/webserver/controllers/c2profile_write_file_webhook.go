package webcontroller

import (
	"encoding/base64"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type WriteContainerFileInput struct {
	Input WriteContainerFile `json:"input" binding:"required"`
}

type WriteContainerFile struct {
	Filename    string `json:"file_path" binding:"required"`
	C2ProfileID int    `json:"id" binding:"required"`
	Data        string `json:"data" binding:"required"`
}

type WriteContainerFileResponse struct {
	Status  string `json:"status"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func C2ProfileWriteFileWebhook(c *gin.Context) {
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
	c2profile := databaseStructs.C2profile{}

	err := database.DB.Get(&c2profile, `SELECT "name" FROM c2profile WHERE id=$1`, input.Input.C2ProfileID)
	if err != nil {
		logging.LogError(err, "Failed to fetch c2 profile from database by ID", "id", input.Input.C2ProfileID)
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  "Failed to find C2 Profile",
		})
		return
		// send the RPC request to the container
	}
	fileContents, err := base64.StdEncoding.DecodeString(input.Input.Data)
	if err != nil {
		logging.LogError(err, "Failed to base64 decode file contents")
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  "Failed to base64 decode file contents",
		})
		return
	}
	c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCWriteFile(rabbitmq.C2WriteFileMessage{
		Filename: input.Input.Filename,
		Name:     c2profile.Name,
		Contents: fileContents,
	})
	if err != nil {
		logging.LogError(err, "Failed to send C2ProfileWriteFileWebhook to c2 profile", "c2_profile", c2profile.Name)
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  "Failed to send message to C2 Profile container",
		})
		return
		// check the response from the RPC call for success or error
	}
	if !c2ProfileResponse.Success {
		logging.LogError(nil, c2ProfileResponse.Error, "Failed to write file to c2 container")
		c.JSON(http.StatusOK, WriteContainerFileResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	}
	go rabbitmq.RestartC2ServerAfterUpdate(c2profile.Name, false)
	c.JSON(http.StatusOK, WriteContainerFileResponse{
		Status: "success",
	})
	return

}
