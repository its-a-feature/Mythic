package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type GetIDPMetadataMessage struct {
	ContainerName string `json:"container_name"`
	ServerName    string `json:"server_name"`
	IDPName       string `json:"idp_name"`
}
type GetIDPMetadataMessageResponse struct {
	Success  bool   `json:"success"`
	Error    string `json:"error"`
	Metadata string `json:"metadata"`
}

func (r *rabbitMQConnection) SendAuthGetIDPMetadata(input GetIDPMetadataMessage) (*GetIDPMetadataMessageResponse, error) {
	authResponse := GetIDPMetadataMessageResponse{}
	exclusiveQueue := true
	inputBytes, err := json.Marshal(input)
	if err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", input)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetAuthContainerGetIDPMetadataRoutingKey(input.ContainerName),
		inputBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &authResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse idp response back to struct", "response", response)
		return nil, err
	}
	return &authResponse, nil
}
