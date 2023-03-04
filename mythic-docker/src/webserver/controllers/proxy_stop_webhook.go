package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ProxyStopInput struct {
	Input ProxyStop `json:"input" binding:"required"`
}

type ProxyStop struct {
	CallbackID int    `json:"callback_id" binding:"required"`
	Port       int    `json:"port" binding:"required"`
	PortType   string `json:"port_type" binding:"required"`
}

func ProxyStopWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ProxyStopInput // we'll fix this after the new stuff comes out to not have the double input
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
		manuallyStopProxyInput := rabbitmq.ProxyStop{
			CallbackID:        input.Input.CallbackID,
			Port:              input.Input.Port,
			PortType:          input.Input.PortType,
			OperatorOperation: *operatorOperation,
		}
		c.JSON(http.StatusOK, rabbitmq.ManuallyStopProxy(manuallyStopProxyInput))
		return
	}
}
