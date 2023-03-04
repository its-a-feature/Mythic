package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_RPC_RESYNC STRUCTS

type C2RPCReSyncMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2RPCReSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendC2RPCReSync(resync C2RPCReSyncMessage) (*C2RPCReSyncMessageResponse, error) {
	resyncResponse := C2RPCReSyncMessageResponse{}
	exclusiveQueue := true
	if configBytes, err := json.Marshal(resync); err != nil {
		logging.LogError(err, "Failed to convert message to JSON", "configCheck", resync)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCReSyncRoutingKey(resync.Name),
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
