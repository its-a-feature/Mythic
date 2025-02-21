package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_CONFIG_CHECK STRUCTS
type C2ConfigCheckMessage struct {
	Name       string                 `json:"c2_profile_name"`
	Parameters map[string]interface{} `json:"parameters"`
}

type C2ConfigCheckMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCConfigCheck(configCheck C2ConfigCheckMessage) (*C2ConfigCheckMessageResponse, error) {
	configCheckResponse := C2ConfigCheckMessageResponse{}
	exclusiveQueue := true
	configBytes, err := json.Marshal(configCheck)
	if err != nil {
		logging.LogError(err, "Failed to convert configCheck to JSON", "configCheck", configCheck)
		return nil, err
	}
	logging.LogDebug("Sending configCheck to RabbitMQ", "configCheck", configCheck)
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCConfigChecksRoutingKey(configCheck.Name),
		configBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &configCheckResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse config check response back to struct", "response", response)
		return nil, err
	}
	return &configCheckResponse, nil
}
