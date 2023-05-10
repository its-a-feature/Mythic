package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_WRITE_FILE STRUCTS

type C2_WRITE_FILE_STATUS = string

type C2WriteFileMessage struct {
	Name     string `json:"c2_profile_name"`
	Filename string `json:"filename"`
	Contents []byte `json:"contents"`
}

type C2WriteFileMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCWriteFile(writeFile C2WriteFileMessage) (*C2WriteFileMessageResponse, error) {
	c2WriteFileResponse := C2WriteFileMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(writeFile); err != nil {
		logging.LogError(err, "Failed to convert writeFile to JSON", "writeFile", writeFile)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCWriteFileRoutingKey(writeFile.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2WriteFileResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 get debug output response back to struct", "response", response)
		return nil, err
	} else {
		return &c2WriteFileResponse, nil
	}
}
