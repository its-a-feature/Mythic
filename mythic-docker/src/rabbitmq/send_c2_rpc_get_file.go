package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_READ_FILE STRUCTS

type C2_GET_FILE_STATUS = string

type C2GetFileMessage struct {
	Name     string `json:"c2_profile_name"`
	Filename string `json:"filename"`
}

type C2GetFileMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message []byte `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCGetFile(getFile C2GetFileMessage) (*C2GetFileMessageResponse, error) {
	c2GetFileResponse := C2GetFileMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(getFile); err != nil {
		logging.LogError(err, "Failed to convert getFile to JSON")
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCGetFileRoutingKey(getFile.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2GetFileResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 get file response back to struct")
		return nil, err
	} else {
		return &c2GetFileResponse, nil
	}
}
