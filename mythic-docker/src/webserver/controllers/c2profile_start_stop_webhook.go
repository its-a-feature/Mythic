package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type StartStopC2ProfileInput struct {
	Input StartStopC2Profile `json:"input" binding:"required"`
}

type StartStopC2Profile struct {
	C2ProfileID int    `json:"id" binding:"required"`
	Action      string `json:"action" binding:"required"`
}

type StartStopC2ProfileResponse struct {
	Status  string `json:"status"`
	Output  string `json:"output"`
	Error   string `json:"error"`
	Version string `json:"version"`
}

func StartStopC2ProfileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input StartStopC2ProfileInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, StartStopC2ProfileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	c2profile := databaseStructs.C2profile{}
	err := database.DB.Get(&c2profile, `SELECT "name", id FROM c2profile WHERE id=$1`, input.Input.C2ProfileID)
	if err != nil {
		logging.LogError(err, "Failed to fetch c2 profile from database by ID", "id", input.Input.C2ProfileID)
		c.JSON(http.StatusOK, StartStopC2ProfileResponse{
			Status: "error",
			Error:  "Failed to find C2 Profile",
		})
		return
		// send the RPC request to the container
	}
	if input.Input.Action == "start" {
		c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCStartServer(rabbitmq.C2StartServerMessage{
			Name: c2profile.Name,
		})
		go rabbitmq.UpdateC2ProfileRunningStatus(c2profile, c2ProfileResponse.InternalServerRunning)
		if err != nil {
			logging.LogError(err, "Failed to send SendC2RPCStartServer to c2 profile", "c2_profile", c2profile.Name)
			c.JSON(http.StatusOK, StartStopC2ProfileResponse{
				Status: "error",
				Output: "Failed to send message to C2 Profile container",
			})
			return
			// check the response from the RPC call for success or error
		}
		if !c2ProfileResponse.Success {
			logging.LogError(nil, c2ProfileResponse.Error, "Failed to start c2 container")
			c.JSON(http.StatusOK, StartStopC2ProfileResponse{
				Status: "error",
				Output: c2ProfileResponse.Error,
			})
			return
		}
		c.JSON(http.StatusOK, StartStopC2ProfileResponse{
			Status: "success",
			Output: c2ProfileResponse.Message,
		})
		return

	}
	if input.Input.Action == "stop" {
		c2ProfileResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCStopServer(rabbitmq.C2StopServerMessage{
			Name: c2profile.Name,
		})
		go rabbitmq.UpdateC2ProfileRunningStatus(c2profile, c2ProfileResponse.InternalServerRunning)
		if err != nil {
			logging.LogError(err, "Failed to send SendC2RPCStopServer to c2 profile", "c2_profile", c2profile.Name)
			c.JSON(http.StatusOK, StartStopC2ProfileResponse{
				Status: "error",
				Output: "Failed to send message to C2 Profile container",
			})
			return
			// check the response from the RPC call for success or error
		}
		if !c2ProfileResponse.Success {
			logging.LogError(nil, c2ProfileResponse.Error, "Failed to stop c2 container")
			c.JSON(http.StatusOK, StartStopC2ProfileResponse{
				Status: "error",
				Output: c2ProfileResponse.Error,
			})
			return
		}

		c.JSON(http.StatusOK, StartStopC2ProfileResponse{
			Status: "success",
			Output: c2ProfileResponse.Message,
		})
		return

	} else {
		logging.LogError(nil, "Unknown action")
		c.JSON(http.StatusOK, StartStopC2ProfileResponse{
			Status: "error",
			Error:  "Unknown action - was expecting `start` or `stop`",
		})
		return
	}
}
