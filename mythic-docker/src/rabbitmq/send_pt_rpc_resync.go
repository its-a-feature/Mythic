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
	if configBytes, err := json.Marshal(resync); err != nil {
		logging.LogError(err, "Failed to convert message to JSON", "configCheck", resync)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPTRPCReSyncRoutingKey(resync.Name),
		configBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &resyncResponse); err != nil {
		logging.LogError(err, "Failed to parse config check response back to struct", "response", response)
		return nil, err
	} else {
		return &resyncResponse, nil
	}
}
