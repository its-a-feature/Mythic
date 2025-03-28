package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"

	"github.com/its-a-feature/Mythic/logging"
)

// PAYLOAD_DYNAMIC_QUERY_FUNCTION structs

type PT_DYNAMIC_QUERY_FUNCTION_STATUS = string

const (
	PT_DYNAMIC_QUERY_FUNCTION_STATUS_SUCCESS PT_DYNAMIC_QUERY_FUNCTION_STATUS = "success"
	PT_DYNAMIC_QUERY_FUNCTION_STATUS_ERROR                                    = "error"
)

type PTRPCDynamicQueryFunctionMessage struct {
	Command            string                 `json:"command" binding:"required"`
	ParameterName      string                 `json:"parameter_name" binding:"required"`
	PayloadType        string                 `json:"payload_type" binding:"required"`
	CommandPayloadType string                 `json:"command_payload_type"`
	PayloadOS          string                 `json:"payload_os"`
	PayloadUUID        string                 `json:"payload_uuid"`
	AgentCallbackID    string                 `json:"agent_callback_id"`
	Callback           int                    `json:"callback" binding:"required"`
	CallbackDisplayID  int                    `json:"callback_display_id"`
	Secrets            map[string]interface{} `json:"secrets"`
	OtherParameters    map[string]interface{} `json:"other_parameters"`
}
type PayloadTypeDynamicQueryFunctionComplexChoice struct {
	DisplayValue string `json:"display_value"`
	Value        string `json:"value"`
}
type PTRPCDynamicQueryFunctionMessageResponse struct {
	Success        bool                                           `json:"success"`
	Error          string                                         `json:"error"`
	Choices        []string                                       `json:"choices"`
	ComplexChoices []PayloadTypeDynamicQueryFunctionComplexChoice `json:"complex_choices"`
}

func (r *rabbitMQConnection) SendPtRPCDynamicQueryFunction(dynamicQuery PTRPCDynamicQueryFunctionMessage) (*PTRPCDynamicQueryFunctionMessageResponse, error) {
	dynamicQueryResponse := PTRPCDynamicQueryFunctionMessageResponse{}
	exclusiveQueue := true
	callback := databaseStructs.Callback{}
	err := database.DB.Get(&callback, `SELECT
    	callback.agent_callback_id,
    	callback.display_id,
    	payload.os "payload.os",
    	payload.uuid "payload.uuid",
    	payloadtype.name "payload.payloadtype.name"
	FROM callback
	JOIN payload on callback.registered_payload_id = payload.id
	JOIN payloadtype on payload.payload_type_id = payloadtype.id
	WHERE callback.id=$1
    `, dynamicQuery.Callback)
	if err != nil {
		return nil, err
	}
	dynamicQuery.PayloadUUID = callback.Payload.UuID
	dynamicQuery.PayloadOS = callback.Payload.Os
	dynamicQuery.PayloadType = callback.Payload.Payloadtype.Name
	dynamicQuery.AgentCallbackID = callback.AgentCallbackID
	dynamicQuery.CallbackDisplayID = callback.DisplayID
	configBytes, err := json.Marshal(dynamicQuery)
	if err != nil {
		logging.LogError(err, "Failed to convert configCheck to JSON", "dynamicQuery", dynamicQuery)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPtRPCDynamicQueryFunctionRoutingKey(dynamicQuery.CommandPayloadType),
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
