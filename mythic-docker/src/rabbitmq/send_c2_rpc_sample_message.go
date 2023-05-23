package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_SAMPLE_MESSAGE STRUCTS
type C2SampleMessageMessage struct {
	Name       string                 `json:"c2_profile_name"`
	Parameters map[string]interface{} `json:"parameters"`
}

type C2SampleMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCSampleMessage(getSampleMessage C2SampleMessageMessage) (*C2SampleMessageResponse, error) {
	getSampleMessageResponse := C2SampleMessageResponse{}
	exclusiveQueue := true
	if configBytes, err := json.Marshal(getSampleMessage); err != nil {
		logging.LogError(err, "Failed to convert getSampleMessage to JSON", "getSampleMessage", getSampleMessage)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCSampleMessageRoutingKey(getSampleMessage.Name),
		configBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &getSampleMessageResponse); err != nil {
		logging.LogError(err, "Failed to parse getSampleMessageResponse response back to struct", "response", response)
		return nil, err
	} else {
		return &getSampleMessageResponse, nil
	}
}
