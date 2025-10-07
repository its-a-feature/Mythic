package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/logging"
)

type CommandHelpMessage struct {
	CommandNames []string `json:"command_names"`
	PayloadType  string   `json:"payload_type"`
}
type CommandHelpMessageResponse struct {
	Output  string `json:"output"`
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func (r *rabbitMQConnection) SendPtRPCCommandHelp(msg CommandHelpMessage) (*CommandHelpMessageResponse, error) {
	configCheckResponse := CommandHelpMessageResponse{}
	exclusiveQueue := true
	configBytes, err := json.Marshal(msg)
	if err != nil {
		logging.LogError(err, "Failed to convert commandHelp to JSON", "commandHelp", msg)
		return nil, err
	}
	logging.LogDebug("Sending commandHelp to RabbitMQ", "commandHelp", msg)
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPtCommandHelpRoutingKey(msg.PayloadType),
		configBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &configCheckResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse commandHelp response back to struct", "response", response)
		return nil, err
	}
	return &configCheckResponse, nil
}
