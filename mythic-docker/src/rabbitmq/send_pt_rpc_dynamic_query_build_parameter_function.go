package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// PAYLOAD_DYNAMIC_QUERY_FUNCTION structs

type PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS = string

const (
	PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_SUCCESS PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS = "success"
	PT_DYNAMIC_QUERY_BUILD_PARAMETER_FUNCTION_STATUS_ERROR                                                    = "error"
)

type PTRPCDynamicQueryBuildParameterFunctionMessage struct {
	ParameterName string                 `json:"parameter_name" binding:"required"`
	PayloadType   string                 `json:"payload_type" binding:"required"`
	SelectedOS    string                 `json:"selected_os"`
	Secrets       map[string]interface{} `json:"secrets"`
}
type PTRPCDynamicQueryBuildParameterFunctionMessageResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error"`
	Choices []string `json:"choices"`
}

func (r *rabbitMQConnection) SendPtRPCDynamicQueryBuildParameterFunction(dynamicQuery PTRPCDynamicQueryBuildParameterFunctionMessage) (*PTRPCDynamicQueryBuildParameterFunctionMessageResponse, error) {
	dynamicQueryResponse := PTRPCDynamicQueryBuildParameterFunctionMessageResponse{}
	exclusiveQueue := true
	configBytes, err := json.Marshal(dynamicQuery)
	if err != nil {
		logging.LogError(err, "Failed to convert dynamicQuery to JSON", "dynamicQuery", dynamicQuery)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPtRPCDynamicQueryBuildParameterFunctionRoutingKey(dynamicQuery.PayloadType),
		configBytes,
		exclusiveQueue,
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
