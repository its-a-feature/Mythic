package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type GetContainerFileListInput struct {
	Input GetContainerFileList `json:"input" binding:"required"`
}

type GetContainerFileList struct {
	C2ProfileID int `json:"id" binding:"required"`
}

type GetContainerFileListResponse struct {
	Status string   `json:"status"`
	Error  string   `json:"error"`
	Files  []string `json:"files"`
}

func C2ProfileListFilesWebhook(c *gin.Context) {
	// get variables from the POST request
	var input GetContainerFileListInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	c2profile := databaseStructs.C2profile{}
	if err := database.DB.Get(&c2profile, `SELECT "name", id FROM c2profile WHERE id=$1`, input.Input.C2ProfileID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile from database by ID", "id", input.Input.C2ProfileID)
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  "Failed to find C2 Profile",
		})
		return
		// send the RPC request to the container
	} else if c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCListFile(rabbitmq.C2RPCListFileMessage{
		Name: c2profile.Name,
	}); err != nil {
		logging.LogError(err, "Failed to send C2ProfileGetFileWebhook to c2 profile", "c2_profile", c2profile.Name)
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  "Failed to send message to C2 Profile container",
		})
		return
		// check the response from the RPC call for success or error
	} else if !c2ProfileResponse.Success {
		logging.LogError(nil, c2ProfileResponse.Error, "Failed to get files from c2 container")
		c.JSON(http.StatusOK, GetContainerFileListResponse{
			Status: "error",
			Error:  c2ProfileResponse.Error,
		})
		return
	} else if c2ProfileResponse.Success {
		c.JSON(http.StatusOK, GetContainerFileListResponse{Status: "success", Files: c2ProfileResponse.Files})
		return
	}
}
