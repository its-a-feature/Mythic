package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type C2_DYNAMIC_QUERY_FUNCTION_STATUS = string

const (
	C2_DYNAMIC_QUERY_FUNCTION_STATUS_SUCCESS C2_DYNAMIC_QUERY_FUNCTION_STATUS = "success"
	C2_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR                                    = "error"
)

type C2DynamicQueryFunctionMessage struct {
	Name            string                 `json:"c2_profile" binding:"required"`
	ParameterName   string                 `json:"parameter_name" binding:"required"`
	Secrets         map[string]interface{} `json:"secrets"`
	OtherParameters map[string]interface{} `json:"other_parameters"`
}

type C2DynamicQueryFunctionMessageResponse struct {
	Success        bool                                           `json:"success"`
	Error          string                                         `json:"error"`
	Choices        []string                                       `json:"choices"`
	ComplexChoices []PayloadTypeDynamicQueryFunctionComplexChoice `json:"complex_choices"`
}

func (r *rabbitMQConnection) SendC2RPCDynamicQueryFunction(dynamicQuery C2DynamicQueryFunctionMessage, authContext RabbitMQAuthContext) (*C2DynamicQueryFunctionMessageResponse, error) {
	dynamicQueryResponse := C2DynamicQueryFunctionMessageResponse{}
	exclusiveQueue := true
	configBytes, err := json.Marshal(dynamicQuery)
	if err != nil {
		logging.LogError(err, "Failed to convert dynamicQuery to JSON", "dynamicQuery", dynamicQuery)
		return nil, err
	}
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCDynamicQueryFunctionRoutingKey(dynamicQuery.Name),
		configBytes,
		exclusiveQueue,
		RPC_RETRY_POLICY_CUSTOM_TIMEOUT,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &dynamicQueryResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse response back to struct", "response", response)
		return nil, err
	}
	return &dynamicQueryResponse, nil
}
