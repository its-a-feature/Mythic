package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_START_SERVER STRUCTS

type C2_START_SERVER_STATUS = string

type C2StartServerMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2StartServerMessageResponse struct {
	Success               bool   `json:"success"`
	Error                 string `json:"error"`
	Message               string `json:"message"`
	InternalServerRunning bool   `json:"server_running"`
}

func (r *rabbitMQConnection) SendC2RPCStartServer(startServer C2StartServerMessage) (*C2StartServerMessageResponse, error) {
	c2StartServerResponse := C2StartServerMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(startServer); err != nil {
		logging.LogError(err, "Failed to convert startServer to JSON", "startServer", startServer)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCStartServerRoutingKey(startServer.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &c2StartServerResponse); err != nil {
		logging.LogError(err, "Failed to parse start server response back to struct", "response", response)
		return nil, err
	} else {
		return &c2StartServerResponse, nil
	}
}
