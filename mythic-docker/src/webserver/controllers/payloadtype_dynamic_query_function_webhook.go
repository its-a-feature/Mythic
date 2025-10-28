package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type PayloadTypeDynamicQueryBuildParameterFunctionInput struct {
	Input PayloadTypeDynamicQueryBuildParameterFunction `json:"input" binding:"required"`
}

type PayloadTypeDynamicQueryBuildParameterFunction struct {
	ParameterName string `json:"parameter_name" binding:"required"`
	PayloadType   string `json:"payload_type" binding:"required"`
	SelectedOS    string `json:"selected_os" binding:"required"`
}

type PayloadTypeDynamicQueryBuildParameterFunctionResponse struct {
	Status        string   `json:"status"`
	ParameterName string   `json:"parameter_name"`
	Error         string   `json:"error"`
	Choices       []string `json:"choices"`
}

func PayloadTypeDynamicQueryBuildParameterFunctionWebhook(c *gin.Context) {
	// get variables from the POST request
	var input PayloadTypeDynamicQueryBuildParameterFunctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryBuildParameterFunctionResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryBuildParameterFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryBuildParameterFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}

	payloadtypeDynamicQueryResponse, err := rabbitmq.RabbitMQConnection.SendPtRPCDynamicQueryBuildParameterFunction(rabbitmq.PTRPCDynamicQueryBuildParameterFunctionMessage{
		PayloadType:   input.Input.PayloadType,
		ParameterName: input.Input.ParameterName,
		SelectedOS:    input.Input.SelectedOS,
		Secrets:       user.Secrets.StructValue(),
	})
	if err != nil {
		logging.LogError(err, "Failed to send SendPtRPCDynamicQueryBuildParameterFunction to payload type", "payload_type", input.Input.PayloadType)
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryBuildParameterFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_ERROR,
			Error:         "Failed to send message to payload type container",
			ParameterName: input.Input.ParameterName,
		})
		return
		// check the response from the RPC call for success or error
	}
	if !payloadtypeDynamicQueryResponse.Success {
		logging.LogError(nil, payloadtypeDynamicQueryResponse.Error, "Failed to get dynamic query choices")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryBuildParameterFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_ERROR,
			Error:         payloadtypeDynamicQueryResponse.Error,
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	c.JSON(http.StatusOK, PayloadTypeDynamicQueryBuildParameterFunctionResponse{
		Status:        rabbitmq.PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_SUCCESS,
		Choices:       payloadtypeDynamicQueryResponse.Choices,
		ParameterName: input.Input.ParameterName,
	})
	return
}
