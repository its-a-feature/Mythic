package webcontroller

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type PayloadTypeDynamicQueryFunctionInput struct {
	Input PayloadTypeDynamicQueryFunction `json:"input" binding:"required"`
}

type PayloadTypeDynamicQueryFunction struct {
	Command         string                 `json:"command" binding:"required"`
	ParameterName   string                 `json:"parameter_name" binding:"required"`
	PayloadType     string                 `json:"payload_type" binding:"required"`
	Callback        int                    `json:"callback" binding:"required"`
	OtherParameters map[string]interface{} `json:"other_parameters"`
}

type PayloadTypeDynamicQueryFunctionResponse struct {
	Status         string                                                  `json:"status"`
	ParameterName  string                                                  `json:"parameter_name"`
	Error          string                                                  `json:"error"`
	Choices        []string                                                `json:"choices"`
	ComplexChoices []rabbitmq.PayloadTypeDynamicQueryFunctionComplexChoice `json:"complex_choices"`
}

func PayloadTypeDynamicQueryFunctionWebhook(c *gin.Context) {
	// get variables from the POST request
	var input PayloadTypeDynamicQueryFunctionInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to parse out required parameters")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	loadedCommand := databaseStructs.Loadedcommands{}
	err = database.DB.Get(&loadedCommand, `SELECT
    payloadtype.name "command.payloadtype.name"
    FROM loadedcommands 
    JOIN command ON loadedcommands.command_id = command.id
    JOIN payloadtype ON command.payload_type_id = payloadtype.id
    WHERE callback_id = $1 AND command.cmd=$2 AND payloadtype.name=$3`, input.Input.Callback, input.Input.Command, input.Input.PayloadType)
	if err != nil {
		logging.LogError(err, "Failed to get command from loaded commands")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         err.Error(),
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	payloadtypeDynamicQueryResponse, err := rabbitmq.RabbitMQConnection.SendPtRPCDynamicQueryFunction(rabbitmq.PTRPCDynamicQueryFunctionMessage{
		Command:            input.Input.Command,
		CommandPayloadType: loadedCommand.Command.Payloadtype.Name,
		ParameterName:      input.Input.ParameterName,
		Callback:           input.Input.Callback,
		Secrets:            user.Secrets.StructValue(),
		OtherParameters:    input.Input.OtherParameters,
	})
	if err != nil {
		logging.LogError(err, "Failed to send SendPtRPCDynamicQueryFunction to payload type", "payload_type", input.Input.PayloadType)
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status:        rabbitmq.PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR,
			Error:         "Failed to send message to payload type container",
			ParameterName: input.Input.ParameterName,
		})
		return
		// check the response from the RPC call for success or error
	}
	if !payloadtypeDynamicQueryResponse.Success {
		logging.LogError(nil, payloadtypeDynamicQueryResponse.Error, "Failed to get dynamic query choices")
		c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
			Status:        "error",
			Error:         payloadtypeDynamicQueryResponse.Error,
			ParameterName: input.Input.ParameterName,
		})
		return
	}
	c.JSON(http.StatusOK, PayloadTypeDynamicQueryFunctionResponse{
		Status:         "success",
		Choices:        payloadtypeDynamicQueryResponse.Choices,
		ComplexChoices: payloadtypeDynamicQueryResponse.ComplexChoices,
		ParameterName:  input.Input.ParameterName,
	})
	return
}
