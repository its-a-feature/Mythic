package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_RPC_RESYNC STRUCTS

type PTRPCReSyncMessage struct {
	Name string `json:"payload_type"`
}

type PTRPCReSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendPTRPCReSync(resync PTRPCReSyncMessage) (*PTRPCReSyncMessageResponse, error) {
	resyncResponse := PTRPCReSyncMessageResponse{}
	exclusiveQueue := true
	configBytes, err := json.Marshal(resync)
	if err != nil {
		logging.LogError(err, "Failed to convert message to JSON", "configCheck", resync)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPTRPCReSyncRoutingKey(resync.Name),
		configBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &resyncResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse config check response back to struct", "response", response)
		return nil, err
	}
	return &resyncResponse, nil
}
