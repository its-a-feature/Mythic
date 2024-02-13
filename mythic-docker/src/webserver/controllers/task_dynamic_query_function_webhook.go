package webcontroller

import (
	"github.com/its-a-feature/Mythic/database"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type PayloadTypeDynamicQueryFunctionInput struct {
	Input PayloadTypeDynamicQueryFunction `json:"input" binding:"required"`
}

type PayloadTypeDynamicQueryFunction struct {
	Command       string `json:"command" binding:"required"`
	ParameterName string `json:"parameter_name" binding:"required"`
	PayloadType   string `json:"payload_type" binding:"required"`
	Callback      int    `json:"callback" binding:"required"`
}

type PayloadTypeDynamicQueryFunctionResponse struct {
	Status  string   `json:"status"`
	Error   string   `json:"error"`
	Choices []string `json:"choices"`
}

func PayloadTypeDynamicQueryFunctionWebhook(c *gin.Context) {
	// get variables from the POST request
	var input PayloadTypeDynamicQueryFunctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status: rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:  err.Error(),
		})
		return
	}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status: rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:  err.Error(),
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status: rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:  err.Error(),
		})
		return
	}
	payloadtypeDynamicQueryResponse, err := rabbitmq.RabbitMQConnection.SendPtRPCDynamicQueryFunction(rabbitmq.PTRPCDynamicQueryFunctionMessage{
		Command:       input.Input.Command,
		ParameterName: input.Input.ParameterName,
		PayloadType:   input.Input.PayloadType,
		Callback:      input.Input.Callback,
		Secrets:       user.Secrets.StructValue(),
	})
	if err != nil {
		logging.LogError(err, "Failed to send SendPtRPCDynamicQueryFunction to payload type", "payload_type", input.Input.PayloadType)
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status: rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:  "Failed to send message to payload type container",
		})
		return
		// check the response from the RPC call for success or error
	}
	if !payloadtypeDynamicQueryResponse.Success {
		logging.LogError(nil, payloadtypeDynamicQueryResponse.Error, "Failed to get dynamic query choices")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status:  rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:   "Failed to get dynamic query choices",
			Choices: []string{},
		})
		return
	}
	c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
		Status:  rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_SUCCESS,
		Choices: payloadtypeDynamicQueryResponse.Choices,
	})
	return

}
