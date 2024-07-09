package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type ProcessIDPResponseMessage struct {
	ContainerName  string            `json:"container_name"`
	ServerName     string            `json:"server_name"`
	IDPName        string            `json:"idp_name"`
	RequestURL     string            `json:"request_url"`
	RequestHeaders map[string]string `json:"request_headers"`
	RequestCookies map[string]string `json:"request_cookies"`
	RequestQuery   map[string]string `json:"request_query"`
	RequestBody    string            `json:"request_body"`
}
type ProcessIDPResponseMessageResponse struct {
	SuccessfulAuthentication bool   `json:"successful_authentication"`
	Error                    string `json:"error"`
	Email                    string `json:"email"`
}

func (r *rabbitMQConnection) SendAuthProcessIDPResponse(input ProcessIDPResponseMessage) (*ProcessIDPResponseMessageResponse, error) {
	authResponse := ProcessIDPResponseMessageResponse{}
	exclusiveQueue := true
	inputBytes, err := json.Marshal(input)
	if err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", input)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetAuthContainerProcessIDPResponseRoutingKey(input.ContainerName),
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
