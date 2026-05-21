package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type ContainerRPCListFileMessage struct {
	Name string `json:"container_name"`
	Path string `json:"path,omitempty"`
}

type ContianerRPCListFileMessageResponse struct {
	Success bool     `json:"success"`
	Error   string   `json:"error"`
	Files   []string `json:"files"`
	Folders []string `json:"folders"`
}

func (r *rabbitMQConnection) SendContainerRPCListFile(getFile ContainerRPCListFileMessage, authContext RabbitMQAuthContext) (*ContianerRPCListFileMessageResponse, error) {
	c2ListFileResponse := ContianerRPCListFileMessageResponse{}
	exclusiveQueue := true
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return nil, err
	}
	opsecBytes, err := json.Marshal(getFile)
	if err != nil {
		logging.LogError(err, "Failed to convert list to JSON", "list", getFile)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCListFileRoutingKey(getFile.Name),
		opsecBytes,
		exclusiveQueue,
		RPC_RETRY_POLICY_CUSTOM_TIMEOUT,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &c2ListFileResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse c2 list file response back to struct", "response", response)
		return nil, err
	}
	return &c2ListFileResponse, nil
}
