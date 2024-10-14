package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_GET_DEBUG_OUTPUT STRUCTS

type C2_GET_DEBUG_OUTPUT_STATUS = string

type C2GetDebugOutputMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2GetDebugOutputMessageResponse struct {
	Success               bool   `json:"success"`
	Error                 string `json:"error"`
	Message               string `json:"message"`
	InternalServerRunning bool   `json:"server_running"`
}

func (r *rabbitMQConnection) SendC2RPCGetDebugOutput(getDebugOutput C2GetDebugOutputMessage) (*C2GetDebugOutputMessageResponse, error) {
	c2GetDebutOutputResponse := C2GetDebugOutputMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(getDebugOutput); err != nil {
		logging.LogError(err, "Failed to convert getDebugOutput to JSON", "getDebugOutput", getDebugOutput)
		return &c2GetDebutOutputResponse, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCGetServerDebugOutputRoutingKey(getDebugOutput.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return &c2GetDebutOutputResponse, err
	} else if err := json.Unmarshal(response, &c2GetDebutOutputResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 get debug output response back to struct", "response", response)
		return &c2GetDebutOutputResponse, err
	} else {
		return &c2GetDebutOutputResponse, nil
	}
}
