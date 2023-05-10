package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_READ_FILE STRUCTS

type C2_REMOVE_FILE_STATUS = string

type C2RemoveFileMessage struct {
	Name     string `json:"c2_profile_name"`
	Filename string `json:"filename"`
}

type C2RemoveFileMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendC2RPCRemoveFile(getFile C2RemoveFileMessage) (*C2RemoveFileMessageResponse, error) {
	c2RemoveFileResponse := C2RemoveFileMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(getFile); err != nil {
		logging.LogError(err, "Failed to convert getFile to JSON")
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCRemoveFileRoutingKey(getFile.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2RemoveFileResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 get file response back to struct")
		return nil, err
	} else {
		return &c2RemoveFileResponse, nil
	}
}
