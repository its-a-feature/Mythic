package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_RPC_RESYNC STRUCTS

type TRRPCReSyncMessage struct {
	Name string `json:"translation_name"`
}

type TRRPCReSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendTRRPCReSync(resync TRRPCReSyncMessage) (*TRRPCReSyncMessageResponse, error) {
	resyncResponse := TRRPCReSyncMessageResponse{}
	exclusiveQueue := true
	if configBytes, err := json.Marshal(resync); err != nil {
		logging.LogError(err, "Failed to convert message to JSON", "configCheck", resync)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetTrRPCReSyncRoutingKey(resync.Name),
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
