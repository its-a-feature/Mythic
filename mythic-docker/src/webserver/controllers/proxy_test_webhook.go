package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type ProxyTestInput struct {
	Input ProxyTest `json:"input" binding:"required"`
}

type ProxyTest struct {
	CallbackPortID int `json:"callbackport_id" binding:"required"`
}

func ProxyTestWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ProxyTestInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  err.Error(),
		})
		return
	}
	// get information about the user and operation that's being tasked
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	manuallyTestProxyInput := rabbitmq.ProxyTest{
		CallbackPortId:    input.Input.CallbackPortID,
		OperatorOperation: *operatorOperation,
	}
	c.JSON(http.StatusOK, rabbitmq.ManuallyTestProxy(manuallyTestProxyInput))
	return
}
