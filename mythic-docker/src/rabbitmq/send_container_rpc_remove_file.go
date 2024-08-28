package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type ContainerRemoveFileMessage struct {
	Name     string `json:"container_name"`
	Filename string `json:"filename"`
}

type ContainerRemoveFileMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendContainerRPCRemoveFile(getFile ContainerRemoveFileMessage) (*ContainerRemoveFileMessageResponse, error) {
	c2RemoveFileResponse := ContainerRemoveFileMessageResponse{}
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
