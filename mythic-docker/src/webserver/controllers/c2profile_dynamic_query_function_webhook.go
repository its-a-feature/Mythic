package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type C2ProfileDynamicQueryFunctionInput struct {
	Input C2ProfileDynamicQueryFunction `json:"input" binding:"required"`
}

type C2ProfileDynamicQueryFunction struct {
	ParameterName   string                 `json:"parameter_name" binding:"required"`
	C2ProfileName   string                 `json:"c2_profile_name" binding:"required"`
	OtherParameters map[string]interface{} `json:"other_parameters"`
}

type C2ProfileDynamicQueryFunctionResponse struct {
	Status         string                                                  `json:"status"`
	ParameterName  string                                                  `json:"parameter_name"`
	Error          string                                                  `json:"error"`
	Choices        []string                                                `json:"choices"`
	ComplexChoices []rabbitmq.PayloadTypeDynamicQueryFunctionComplexChoice `json:"complex_choices"`
}

func C2ProfileDynamicQueryFunctionWebhook(c *gin.Context) {
	var input C2ProfileDynamicQueryFunctionInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, C2ProfileDynamicQueryFunctionResponse{
			Status: rabbitmq.C2_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:  err.Error(),
		})
		return
	}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, C2ProfileDynamicQueryFunctionResponse{
			Status:        rabbitmq.C2_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, C2ProfileDynamicQueryFunctionResponse{
			Status:        rabbitmq.C2_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}

	c2DynamicQueryResponse, err := rabbitmq.RabbitMQConnection.SendC2RPCDynamicQueryFunction(rabbitmq.C2DynamicQueryFunctionMessage{
		Name:            input.Input.C2ProfileName,
		ParameterName:   input.Input.ParameterName,
		Secrets:         user.Secrets.StructValue(),
		OtherParameters: input.Input.OtherParameters,
	}, authentication.RabbitMQAuthContextFromGin(c))
	if err != nil {
		logging.LogError(err, "Failed to send SendC2RPCDynamicQueryFunction to C2 profile", "c2_profile", input.Input.C2ProfileName)
		c.JSON(http.StatusOK, C2ProfileDynamicQueryFunctionResponse{
			Status:        rabbitmq.C2_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         "Failed to send message to C2 profile container",
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	if !c2DynamicQueryResponse.Success {
		logging.LogError(nil, c2DynamicQueryResponse.Error, "Failed to get dynamic query choices")
		c.JSON(http.StatusOK, C2ProfileDynamicQueryFunctionResponse{
			Status:        rabbitmq.C2_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         c2DynamicQueryResponse.Error,
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	c.JSON(http.StatusOK, C2ProfileDynamicQueryFunctionResponse{
		Status:         rabbitmq.C2_DYNAMIC_QUERY_FUNCTION_STATUS_SUCCESS,
		Choices:        c2DynamicQueryResponse.Choices,
		ParameterName:  input.Input.ParameterName,
		ComplexChoices: c2DynamicQueryResponse.ComplexChoices,
	})
}
