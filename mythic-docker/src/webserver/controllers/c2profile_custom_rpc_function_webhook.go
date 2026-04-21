package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type C2CustomRPCFunctionInput struct {
	Input C2CustomRPCFunction `json:"input" binding:"required"`
}

type C2CustomRPCFunction struct {
	C2Profile    string                 `json:"c2_profile" binding:"required"`
	FunctionName string                 `json:"function_name" binding:"required"`
	Arguments    map[string]interface{} `json:"arguments"`
}

type C2CustomRPCFunctionResponse struct {
	Status string                 `json:"status"`
	Error  string                 `json:"error"`
	Result map[string]interface{} `json:"result"`
}

func C2ProfileCustomRPCFunctionWebhook(c *gin.Context) {
	var input C2CustomRPCFunctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, C2CustomRPCFunctionResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	args := input.Input.Arguments
	if args == nil {
		args = map[string]interface{}{}
	}
	rpcResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCOtherService(rabbitmq.C2OtherServiceRPCMessage{
		ServiceName:                 input.Input.C2Profile,
		ServiceRPCFunction:          input.Input.FunctionName,
		ServiceRPCFunctionArguments: args,
	})
	if err != nil {
		logging.LogError(err, "Failed to send custom RPC to c2 profile",
			"c2_profile", input.Input.C2Profile, "function", input.Input.FunctionName)
		c.JSON(http.StatusOK, C2CustomRPCFunctionResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if !rpcResponse.Success {
		c.JSON(http.StatusOK, C2CustomRPCFunctionResponse{
			Status: "error",
			Error:  rpcResponse.Error,
			Result: rpcResponse.Result,
		})
		return
	}
	c.JSON(http.StatusOK, C2CustomRPCFunctionResponse{
		Status: "success",
		Result: rpcResponse.Result,
	})
}
