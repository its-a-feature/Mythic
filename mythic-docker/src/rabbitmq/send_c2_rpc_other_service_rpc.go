package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

type C2OtherServiceRPCMessage struct {
	ServiceName                 string                 `json:"service_name"`
	ServiceRPCFunction          string                 `json:"service_function"`
	ServiceRPCFunctionArguments map[string]interface{} `json:"service_arguments"`
}

type C2OtherServiceRPCMessageResponse struct {
	Success               bool                   `json:"success"`
	Error                 string                 `json:"error"`
	Result                map[string]interface{} `json:"result"`
	RestartInternalServer bool                   `json:"restart_internal_server"`
}

func (r *rabbitMQConnection) SendC2RPCOtherService(msg C2OtherServiceRPCMessage) (*C2OtherServiceRPCMessageResponse, error) {
	response := C2OtherServiceRPCMessageResponse{}
	exclusiveQueue := true
	if configBytes, err := json.Marshal(msg); err != nil {
		logging.LogError(err, "Failed to marshal C2OtherServiceRPCMessage", "msg", msg)
		return nil, err
	} else if responseBytes, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCOtherServiceRoutingKey(msg.ServiceName),
		configBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send C2 other service RPC message")
		return nil, err
	} else if err := json.Unmarshal(responseBytes, &response); err != nil {
		logging.LogError(err, "Failed to parse C2 other service RPC response")
		return nil, err
	} else {
		return &response, nil
	}
}
