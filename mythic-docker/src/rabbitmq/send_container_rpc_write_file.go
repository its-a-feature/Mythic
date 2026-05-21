package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type ContainerWriteFileMessage struct {
	Name     string `json:"container_name"`
	Filename string `json:"filename"`
	Contents []byte `json:"contents"`
}

type ContainerWriteFileMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (r *rabbitMQConnection) SendContainerRPCWriteFile(writeFile ContainerWriteFileMessage, authContext RabbitMQAuthContext) (*ContainerWriteFileMessageResponse, error) {
	c2WriteFileResponse := ContainerWriteFileMessageResponse{}
	exclusiveQueue := true
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return nil, err
	}
	opsecBytes, err := json.Marshal(writeFile)
	if err != nil {
		logging.LogError(err, "Failed to convert writeFile to JSON", "writeFile", writeFile)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCWriteFileRoutingKey(writeFile.Name),
		opsecBytes,
		exclusiveQueue,
		RPC_RETRY_POLICY_CUSTOM_TIMEOUT,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &c2WriteFileResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse c2 get debug output response back to struct", "response", response)
		return nil, err
	}
	return &c2WriteFileResponse, nil
}
