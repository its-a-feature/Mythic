package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type GetNonIDPRedirectMessage struct {
	ContainerName string `json:"container_name"`
	ServerName    string `json:"server_name"`
	NonIDPName    string `json:"nonidp_name"`
}
type GetNonIDPRedirectMessageResponse struct {
	Success       bool     `json:"success"`
	Error         string   `json:"error"`
	RequestFields []string `json:"request_fields"`
}

func (r *rabbitMQConnection) SendAuthGetNonIDPRedirect(input GetNonIDPRedirectMessage) (*GetNonIDPRedirectMessageResponse, error) {
	authResponse := GetNonIDPRedirectMessageResponse{}
	exclusiveQueue := true
	inputBytes, err := json.Marshal(input)
	if err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", input)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetAuthContainerGetNonIDPRedirectRoutingKey(input.ContainerName),
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
