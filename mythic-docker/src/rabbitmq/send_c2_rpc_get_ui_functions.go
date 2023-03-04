package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_GET_UI_FUNCTIONS STRUCTS

type C2_GET_UI_FUNCTIONS_STATUS = string

type C2GetUiFunctionsMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2GetUiFunctionsMessageResponse struct {
	Success   bool     `json:"success"`
	Error     string   `json:"error"`
	Functions []string `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCGetUiFunctions(getUiFunctions C2GetUiFunctionsMessage) (*C2GetUiFunctionsMessageResponse, error) {
	c2GetUiFunctionsResponse := C2GetUiFunctionsMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(getUiFunctions); err != nil {
		logging.LogError(err, "Failed to convert getUiFunctions to JSON", "getUiFunctions", getUiFunctions)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCGetAvailableUIFunctionsRoutingKey(getUiFunctions.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2GetUiFunctionsResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 get ui functions response back to struct", "response", response)
		return nil, err
	} else {
		return &c2GetUiFunctionsResponse, nil
	}
}
