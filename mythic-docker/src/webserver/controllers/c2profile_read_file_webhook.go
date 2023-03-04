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

type GetContainerFileInput struct {
	Input GetContainerFile `json:"input" binding:"required"`
}

type GetContainerFile struct {
	Filename    string `json:"filename" binding:"required"`
	C2ProfileID int    `json:"id" binding:"required"`
}

type GetContainerFileResponse struct {
	Status   string `json:"status"`
	Filename string `json:"filename"`
	Data     string `json:"data"`
	Error    string `json:"error"`
	Version  string `json:"version"`
}

func C2ProfileGetFileWebhook(c *gin.Context) {
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
	c2profile := databaseStructs.C2profile{}
	if err := database.DB.Get(&c2profile, `SELECT name, id FROM c2profile WHERE id=$1`, input.Input.C2ProfileID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile from database by ID", "id", input.Input.C2ProfileID)
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status: "error",
			Error:  "Failed to find C2 Profile",
		})
		return
		// send the RPC request to the container
	} else if c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCGetFile(rabbitmq.C2GetFileMessage{
		Filename: input.Input.Filename,
		Name:     c2profile.Name,
	}); err != nil {
		logging.LogError(err, "Failed to send C2ProfileGetFileWebhook to c2 profile", "c2_profile", c2profile.Name)
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status: "error",
			Error:  "Failed to send message to C2 Profile container",
		})
		return
		// check the response from the RPC call for success or error
	} else if !c2ProfileResponse.Success {
		logging.LogError(nil, string(c2ProfileResponse.Message), "Failed to get file from c2 container")
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	} else {
		base64Contents := base64.RawStdEncoding.EncodeToString(c2ProfileResponse.Message)
		c.JSON(http.StatusOK, GetContainerFileResponse{
			Status:   "success",
			Filename: input.Input.Filename,
			Data:     base64Contents,
		})
		return
	}
}
