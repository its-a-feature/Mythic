package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_GET_IOC STRUCTS
type C2GetIOCMessage struct {
	Name       string                 `json:"c2_profile_name"`
	Parameters map[string]interface{} `json:"parameters"`
}
type IOC struct {
	Type string `json:"type" mapstructure:"type"`
	IOC  string `json:"ioc" mapstructure:"ioc"`
}
type C2GetIOCMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	IOCs    []IOC  `json:"iocs"`
}

func (r *rabbitMQConnection) SendC2RPCGetIOC(getIOC C2GetIOCMessage) (*C2GetIOCMessageResponse, error) {
	getIOCResponse := C2GetIOCMessageResponse{}
	exclusiveQueue := true
	if configBytes, err := json.Marshal(getIOC); err != nil {
		logging.LogError(err, "Failed to convert getIOC to JSON", "configCheck", getIOC)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCGetIOCRoutingKey(getIOC.Name),
		configBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &getIOCResponse); err != nil {
		logging.LogError(err, "Failed to parse getIOCResponse response back to struct", "response", response)
		return nil, err
	} else {
		return &getIOCResponse, nil
	}
}
