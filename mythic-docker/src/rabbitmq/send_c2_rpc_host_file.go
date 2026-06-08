package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/logging"
)

type C2HostFileMessage struct {
	AgentFileID   string `json:"agent_file_id"`
	HostURL       string `json:"host_url"`
	Remove        bool   `json:"remove"`
	DownloadToken string `json:"download_token,omitempty"`
	Filename      string `json:"filename,omitempty"`
}

type C2HostFilesMessage struct {
	Name  string              `json:"c2_profile_name"`
	Files []C2HostFileMessage `json:"files"`
}

type C2HostFileResult struct {
	Success     bool   `json:"success"`
	Error       string `json:"error"`
	AgentFileID string `json:"agent_file_id"`
	HostURL     string `json:"host_url"`
}

type C2HostFilesMessageResponse struct {
	Success bool               `json:"success"`
	Error   string             `json:"error"`
	Results []C2HostFileResult `json:"results,omitempty"`
}

func GetC2HostFileResultKey(agentFileID string, hostURL string) string {
	return fmt.Sprintf("%s:%s", agentFileID, hostURL)
}

func (r *rabbitMQConnection) SendC2RPCHostFiles(hostFiles C2HostFilesMessage, authContext RabbitMQAuthContext) (*C2HostFilesMessageResponse, error) {
	c2HostFileMessageResponse := C2HostFilesMessageResponse{}
	exclusiveQueue := true
	hostFileBytes, err := json.Marshal(hostFiles)
	if err != nil {
		logging.LogError(err, "Failed to convert hostFiles to JSON", "hostFiles", hostFiles)
		return nil, err
	}
	headers, err := GenerateRabbitMQAuthTokenHeader(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context")
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCHostFileRoutingKey(hostFiles.Name),
		hostFileBytes,
		exclusiveQueue,
		RPC_RETRY_POLICY_CUSTOM_TIMEOUT,
		headers,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &c2HostFileMessageResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse c2 host files response back to struct", "response", response)
		return nil, err
	}
	return &c2HostFileMessageResponse, nil
}
