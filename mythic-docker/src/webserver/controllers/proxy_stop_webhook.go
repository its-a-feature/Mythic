package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ProxyToggleInput struct {
	Input ProxyToggle `json:"input" binding:"required"`
}

type ProxyToggle struct {
	CallbackPortID int    `json:"callbackport_id" binding:"required"`
	Action         string `json:"action" binding:"required"`
}

func ProxyToggleWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ProxyToggleInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, rabbitmq.CreateTaskResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get information about the user and operation that's being tasked
	if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		c.JSON(http.StatusOK, rabbitmq.ProxyStopResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	} else {

		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		manuallyToggleProxyInput := rabbitmq.ProxyStop{
			CallbackPortId:    input.Input.CallbackPortID,
			OperatorOperation: *operatorOperation,
			Action:            input.Input.Action,
		}
		c.JSON(http.StatusOK, rabbitmq.ManuallyToggleProxy(manuallyToggleProxyInput))
		return
	}
}
