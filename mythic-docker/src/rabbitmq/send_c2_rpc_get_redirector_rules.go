package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// C2_REDIRECTOR_RULES STRUCTS

type C2_GET_REDIRECTOR_RULE_STATUS = string

type C2GetRedirectorRuleMessage struct {
	Name       string                 `json:"c2_profile_name"`
	Parameters map[string]interface{} `json:"parameters"`
}

type C2GetRedirectorRuleMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message string `json:"message"`
}

func (r *rabbitMQConnection) SendC2RPCGetRedirectorRules(redirectorRules C2GetRedirectorRuleMessage) (*C2GetRedirectorRuleMessageResponse, error) {
	redirectorRuleResponse := C2GetRedirectorRuleMessageResponse{}
	exclusiveQueue := true
	if opsecBytes, err := json.Marshal(redirectorRules); err != nil {
		logging.LogError(err, "Failed to convert redirectorRules to JSON", "redirectorRules", redirectorRules)
		return nil, err
	} else if response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetC2RPCRedirectorRulesRoutingKey(redirectorRules.Name),
		opsecBytes,
		exclusiveQueue,
	); err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	} else if err := json.Unmarshal(response, &redirectorRuleResponse); err != nil {
		logging.LogError(err, "Failed to parse redirector rules response back to struct", "response", response)
		return nil, err
	} else {
		return &redirectorRuleResponse, nil
	}
}
