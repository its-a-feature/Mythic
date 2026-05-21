package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/logging"
)

// TRANSLATION_CONTAINER_DECRYPT_BYTES STRUCTS

type TrDecryptBytesMessage struct {
	TranslationContainerName string `json:"translation_container_name"`
	EncryptionKey            []byte `json:"enc_key"`
	CryptoType               string `json:"crypto_type"`
	Message                  []byte `json:"message"`
	AgentCallbackUUID        string `json:"callback_uuid"`
}

type TrDecryptBytesMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message []byte `json:"message"`
}

func (r *rabbitMQConnection) SendTrRPCDecryptBytes(input TrDecryptBytesMessage) (*TrDecryptBytesMessageResponse, error) {
	responseMsg := TrDecryptBytesMessageResponse{}
	exclusiveQueue := true
	opsecBytes, err := json.Marshal(input)
	if err != nil {
		logging.LogError(err, "Failed to convert SendTrRPCEncryptBytes to JSON", "input", input)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetTrRPCDecryptBytesRoutingKey(input.TranslationContainerName),
		opsecBytes,
		!exclusiveQueue,
		RPC_RETRY_POLICY_RETRY_ON_TIMEOUT,
		nil,
	)
	if err != nil {
		logging.LogError(err, "Failed to send RPC message")
		return nil, err
	}
	err = json.Unmarshal(response, &responseMsg)
	if err != nil {
		logging.LogError(err, "Failed to parse tr decrypt bytes response back to struct", "response", response)
		return nil, err
	}
	return &responseMsg, nil
}
