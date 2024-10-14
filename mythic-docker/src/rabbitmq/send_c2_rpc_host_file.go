package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_GET_UI_FUNCTIONS STRUCTS

type C2_HOST_FILE_STATUS = string

type C2HostFileMessage struct {
	Name     string `json:"c2_profile_name"`
	FileUUID string `json:"file_uuid"`
	HostURL  string `json:"host_url"`
	Remove   bool   `json:"remove"`
}

type C2HostFileMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendC2RPCHostFile(hostFile C2HostFileMessage) (*C2HostFileMessageResponse, error) {
	c2HostFileMessageResponse := C2HostFileMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(hostFile); err != nil {
		logging.LogError(err, "Failed to convert hostFile to JSON", "hostFile", hostFile)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCHostFileRoutingKey(hostFile.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2HostFileMessageResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 host file response back to struct", "response", response)
		return nil, err
	} else {
		return &c2HostFileMessageResponse, nil
	}
}
