package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type GetIDPRedirectMessage struct {
	ContainerName  string            `json:"container_name"`
	ServerName     string            `json:"server_name"`
	IDPName        string            `json:"idp_name"`
	RequestURL     string            `json:"request_url"`
	RequestHeaders map[string]string `json:"request_headers"`
	RequestCookies map[string]string `json:"request_cookies"`
	RequestQuery   map[string]string `json:"request_query"`
}
type GetIDPRedirectMessageResponse struct {
	Success         bool              `json:"success"`
	Error           string            `json:"error"`
	RedirectURL     string            `json:"redirect_url"`
	RedirectHeaders map[string]string `json:"redirect_headers"`
	RedirectCookies map[string]string `json:"redirect_cookies"`
}

func (r *rabbitMQConnection) SendAuthGetIDPRedirect(input GetIDPRedirectMessage) (*GetIDPRedirectMessageResponse, error) {
	authResponse := GetIDPRedirectMessageResponse{}
	exclusiveQueue := true
	inputBytes, err := json.Marshal(input)
	if err != nil {
		logging.LogError(err, "Failed to convert input to JSON", "input", input)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetAuthContainerGetIDPRedirectRoutingKey(input.ContainerName),
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
