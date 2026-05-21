package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// PAYLOAD_TYPEDARRAY_PARSE structs

type PT_TYPEDARRAY_PARSE_STATUS = string

const (
	PT_TYPEDARRAY_PARSE_STATUS_SUCCESS PT_TYPEDARRAY_PARSE_STATUS = "success"
	PT_TYPEDARRAY_PARSE_STATUS_ERROR                              = "error"
)

type PTRPCTypedArrayParseMessage struct {
	Command            string   `json:"command" binding:"required"`
	CommandPayloadType string   `json:"command_payload_type" `
	ParameterName      string   `json:"parameter_name" binding:"required"`
	PayloadType        string   `json:"payload_type" binding:"required"`
	Callback           int      `json:"callback" binding:"required"`
	InputArray         []string `json:"input_array" binding:"required"`
}

type PTRPCTypedArrayParseMessageResponse struct {
	Success    bool       `json:"success"`
	Error      string     `json:"error"`
	TypedArray [][]string `json:"typed_array"`
}

func (r *rabbitMQConnection) SendPtRPCTypedArrayParse(dynamicQuery PTRPCTypedArrayParseMessage, authContext RabbitMQAuthContext) (*PTRPCTypedArrayParseMessageResponse, error) {
	dynamicQueryResponse := PTRPCTypedArrayParseMessageResponse{}
	exclusiveQueue := true
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return nil, err
	}
	configBytes, err := json.Marshal(dynamicQuery)
	if err != nil {
		logging.LogError(err, "Failed to convert configCheck to JSON", "dynamicQuery", dynamicQuery)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPtRPCTypedArrayParseRoutingKey(dynamicQuery.CommandPayloadType),
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
