package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_OPSEC_CHECKS STRUCTS

type C2_OPSEC_STATUS = string

type C2OPSECMessage struct {
	Name       string                 `json:"c2_profile_name"`
	Parameters map[string]interface{} `json:"parameters"`
}

type C2OPSECMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCOpsecCheck(opsecCheck C2OPSECMessage) (*C2OPSECMessageResponse, error) {
	opsecCheckResponse := C2OPSECMessageResponse{}
	exclusiveQueue := true
	opsecBytes, err := json.Marshal(opsecCheck)
	if err != nil {
		logging.LogError(err, "Failed to convert opsecCheck to JSON", "opseccheck", opsecCheck)
		return nil, err
	}
	logging.LogDebug("Sending opsecCheck to RabbitMQ", "opsecCheck", opsecCheck)
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCOpsecChecksRoutingKey(opsecCheck.Name),
		opsecBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &opsecCheckResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse opsec check response back to struct", "response", response)
		return nil, err
	}
	return &opsecCheckResponse, nil
}
