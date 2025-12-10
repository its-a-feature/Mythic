package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_STOP_SERVER STRUCTS

type C2_STOP_SERVER_STATUS = string

type C2StopServerMessage struct {
	Name string `json:"c2_profile_name"`
}

type C2StopServerMessageResponse struct {
	Success               bool   `json:"success"`
	Error                 string `json:"error"`
	Message               string `json:"message"`
	InternalServerRunning bool   `json:"server_running"`
}

func (r *rabbitMQConnection) SendC2RPCStopServer(stopServer C2StopServerMessage) (*C2StopServerMessageResponse, error) {
	c2StopServerResponse := C2StopServerMessageResponse{}
	exclusiveQueue := true
	opsecBytes, err := json.Marshal(stopServer)
	if err != nil {
		logging.LogError(err, "Failed to convert stopServer to JSON", "stopServer", stopServer)
		return &c2StopServerResponse, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCStopServerRoutingKey(stopServer.Name),
		opsecBytes,
		exclusiveQueue,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return &c2StopServerResponse, err
	}
	err = json.Unmarshal(response, &c2StopServerResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse c2 stop server response back to struct", "response", response)
		return &c2StopServerResponse, err
	}
	return &c2StopServerResponse, nil
}
