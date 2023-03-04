package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_READ_FILE STRUCTS

type C2_RPC_LIST_FILE_STATUS = string

type C2RPCListFileMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2RPCListFileMessageResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error"`
	Files   []string `json:"files"`
}

func (r *rabbitMQConnection) SendC2RPCListFile(getFile C2RPCListFileMessage) (*C2RPCListFileMessageResponse, error) {
	c2ListFileResponse := C2RPCListFileMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(getFile); err != nil {
		logging.LogError(err, "Failed to convert getFile to JSON", "getFile", getFile)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCListFileRoutingKey(getFile.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2ListFileResponse); err != nil {
		logging.LogError(err, "Failed to parse c2 list file response back to struct", "response", response)
		return nil, err
	} else {
		return &c2ListFileResponse, nil
	}
}
