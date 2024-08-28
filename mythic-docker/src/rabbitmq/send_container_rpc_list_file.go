package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type ContainerRPCListFileMessage struct {
	Name string `json:"container_name"`
}

type ContianerRPCListFileMessageResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error"`
	Files   []string `json:"files"`
}

func (r *rabbitMQConnection) SendContainerRPCListFile(getFile ContainerRPCListFileMessage) (*ContianerRPCListFileMessageResponse, error) {
	c2ListFileResponse := ContianerRPCListFileMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(getFile); err != nil {
		logging.LogError(err, "Failed to convert list to JSON", "list", getFile)
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
