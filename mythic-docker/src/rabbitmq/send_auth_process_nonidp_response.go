package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type ProcessNonIDPResponseMessage struct {
	ContainerName string            `json:"container_name"`
	ServerName    string            `json:"server_name"`
	NonIDPName    string            `json:"idp_name"`
	RequestValues map[string]string `json:"request_values"`
}
type ProcessNonIDPResponseMessageResponse struct {
	SuccessfulAuthentication bool   `json:"successful_authentication"`
	Error                    string `json:"error"`
	Email                    string `json:"email"`
}

func (r *rabbitMQConnection) SendAuthProcessNonIDPResponse(input ProcessNonIDPResponseMessage) (*ProcessNonIDPResponseMessageResponse, error) {
	authResponse := ProcessNonIDPResponseMessageResponse{}
	exclusiveQueue := true
	inputBytes, err := json.Marshal(input)
	if err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", input)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetAuthContainerProcessNonIDPResponseRoutingKey(input.ContainerName),
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
