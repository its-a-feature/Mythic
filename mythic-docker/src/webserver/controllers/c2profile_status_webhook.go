package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type GetC2ProfileOutputInput struct {
	Input GetC2ProfileOutput `json:"input" binding:"required"`
}

type GetC2ProfileOutput struct {
	C2ProfileID int `json:"id" binding:"required"`
}

type GetC2ProfileOutputResponse struct {
	Status                string `json:"status"`
	Output                string `json:"output"`
	Error                 string `json:"error"`
	Version               string `json:"version"`
	InternalServerRunning bool   `json:"server_running"`
}

func C2ProfileStatusWebhook(c *gin.Context) {
	// get variables from the POST request
	var input GetC2ProfileOutputInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get input")
		c.JSON(http.StatusOK, GetC2ProfileOutputResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	c2profile := databaseStructs.C2profile{}
	err := database.DB.Get(&c2profile, `SELECT name, id FROM c2profile WHERE id=$1`, input.Input.C2ProfileID)
	if err != nil {
		logging.LogError(err, "Failed to fetch c2 profile from database by ID", "id", input.Input.C2ProfileID)
		c.JSON(http.StatusOK, GetC2ProfileOutputResponse{
			Status: "error",
			Error:  "Failed to find C2 Profile",
		})
		return
		// send the RPC request to the container
	}
	c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCGetDebugOutput(rabbitmq.C2GetDebugOutputMessage{
		Name: c2profile.Name,
	})
	go rabbitmq.UpdateC2ProfileRunningStatus(c2profile, c2ProfileResponse.InternalServerRunning)
	if err != nil {
		logging.LogError(err, "Failed to send C2ProfileStatusWebhook to c2 profile", "c2_profile", c2profile.Name)
		c.JSON(http.StatusOK, GetC2ProfileOutputResponse{
			Status: "error",
			Error:  "Failed to send message to C2 Profile container",
		})
		return
		// check the response from the RPC call for success or error
	}
	if !c2ProfileResponse.Success {
		logging.LogError(nil, string(c2ProfileResponse.Message), "Failed to get file from c2 container")
		c.JSON(http.StatusOK, GetC2ProfileOutputResponse{
			Status: "error",
			Error:  "Failed to get file from C2 Profile",
		})
		return
	}
	c.JSON(http.StatusOK, GetC2ProfileOutputResponse{
		Status: "success",
		Output: c2ProfileResponse.Message,
	})
	return

}
