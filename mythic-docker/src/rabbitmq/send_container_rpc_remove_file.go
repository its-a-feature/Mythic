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

func (r *rabbitMQConnection) SendContainerRPCRemoveFile(getFile ContainerRemoveFileMessage, authContext RabbitMQAuthContext) (*ContainerRemoveFileMessageResponse, error) {
	c2RemoveFileResponse := ContainerRemoveFileMessageResponse{}
	exclusiveQueue := true
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return nil, err
	}
	opsecBytes, err := json.Marshal(getFile)
	if err != nil {
		logging.LogError(err, "Failed to convert getFile to JSON")
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCRemoveFileRoutingKey(getFile.Name),
		opsecBytes,
		exclusiveQueue,
		RPC_RETRY_POLICY_CUSTOM_TIMEOUT,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &c2RemoveFileResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse c2 get file response back to struct")
		return nil, err
	}
	return &c2RemoveFileResponse, nil
}
