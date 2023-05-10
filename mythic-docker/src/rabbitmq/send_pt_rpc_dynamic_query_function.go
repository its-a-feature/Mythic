package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// PAYLOAD_DYNAMIC_QUERY_FUNCTION structs

type PT_DYNAMIC_QUERY_FUNCTION_STATUS = string

const (
	PT_DYNAMIC_QUERY_FUNCTION_STATUS_SUCCESS PT_DYNAMIC_QUERY_FUNCTION_STATUS = "success"
	PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR                                    = "error"
)

type PTRPCDynamicQueryFunctionMessage struct {
	Command       string `json:"command" binding:"required"`
	ParameterName string `json:"parameter_name" binding:"required"`
	PayloadType   string `json:"payload_type" binding:"required"`
	Callback      int    `json:"callback" binding:"required"`
}

type PTRPCDynamicQueryFunctionMessageResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error"`
	Choices []string `json:"choices"`
}

func (r *rabbitMQConnection) SendPtRPCDynamicQueryFunction(dynamicQuery PTRPCDynamicQueryFunctionMessage) (*PTRPCDynamicQueryFunctionMessageResponse, error) {
	dynamicQueryResponse := PTRPCDynamicQueryFunctionMessageResponse{}
	exclusiveQueue := true
	if configBytes, err := json.Marshal(dynamicQuery); err != nil {
		logging.LogError(err, "Failed to convert configCheck to JSON", "dynamicQuery", dynamicQuery)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPtRPCDynamicQueryFunctionRoutingKey(dynamicQuery.PayloadType),
		configBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &dynamicQueryResponse); err != nil {
		logging.LogError(err, "Failed to parse response back to struct", "response", response)
		return nil, err
	} else {
		return &dynamicQueryResponse, nil
	}
}
