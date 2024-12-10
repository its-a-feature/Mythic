package rabbitmq

import (
	"encoding/base64"
	"encoding/json"
	"errors"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackEncryptBytesMessage struct {
	AgentCallbackUUID   string `json:"agent_callback_id"` //required
	Message             []byte `json:"message"`           // required
	IncludeUUID         bool   `json:"include_uuid"`
	Base64ReturnMessage bool   `json:"base64_message"`
	C2Profile           string `json:"c2_profile"`
}
type MythicRPCCallbackEncryptBytesMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message []byte `json:"message"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_ENCRYPT_BYTES,
		RoutingKey: MYTHIC_RPC_CALLBACK_ENCRYPT_BYTES,
		Handler:    processMythicRPCCallbackEncryptBytes,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_ENCRYPT_BYTES
func MythicRPCCallbackEncryptBytes(input MythicRPCCallbackEncryptBytesMessage) MythicRPCCallbackEncryptBytesMessageResponse {
	response := MythicRPCCallbackEncryptBytesMessageResponse{
		Success: false,
	}
	if cipherText, err := CallbackEncryptMessage(input); err != nil {
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		response.Message = cipherText
		return response
	}
}
func CallbackEncryptMessage(input MythicRPCCallbackEncryptBytesMessage) ([]byte, error) {
	cachedInfo, err := LookupEncryptionData(input.C2Profile, input.AgentCallbackUUID, false)
	if err != nil {
		return nil, err
	}
	if cachedInfo.MythicEncrypts {
		// Mythic does encryption, so handle it
		cipherText, err := cachedInfo.IterateAndAct(&input.Message, "encrypt")
		if err != nil {
			return nil, err
		}
		//logging.LogDebug("CallbackEncryptMessage", "encrypted", cipherText)
		if input.IncludeUUID {
			uuidBytes, err := GetUUIDBytes(input.AgentCallbackUUID, cachedInfo.PayloadTypeMessageUUIDLength)
			if err != nil {
				return nil, err
			}
			*cipherText = append(uuidBytes, *cipherText...)
		}
		if input.Base64ReturnMessage {
			return []byte(base64.StdEncoding.EncodeToString(*cipherText)), nil
		}
		return *cipherText, nil
	} else if cachedInfo.TranslationContainerID > 0 {
		// Mythic doesn't encrypt, and there's a translation container associated
		encKey := make([]byte, 0)
		switch cachedInfo.UUIDType {
		case UUIDTYPECALLBACK:
			encKey = *cachedInfo.CallbackEncKey
		case UUIDTYPESTAGING:
			encKey = *cachedInfo.StagingEncKey
		case UUIDTYPEPAYLOAD:
			encKey = *cachedInfo.PayloadEncKey
		default:
		}
		if resp, err := RabbitMQConnection.SendTrRPCEncryptBytes(TrEncryptBytesMessage{
			TranslationContainerName: cachedInfo.TranslationContainerName,
			EncryptionKey:            encKey,
			CryptoType:               cachedInfo.CryptoType,
			Message:                  input.Message,
			IncludeUUID:              input.IncludeUUID,
			Base64ReturnMessage:      input.Base64ReturnMessage,
		}); err != nil {
			logging.LogError(err, "Failed to send RPC message to encrypt message")
			return nil, err
		} else {
			return resp.Message, nil
		}

	} else {
		// Mythic doesn't encrypt, but there's no translation container, just error
		return nil, errors.New("Mythic doesn't encrypt for this payload type and there's no translation container associated")
	}
}

func processMythicRPCCallbackEncryptBytes(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackEncryptBytesMessage{}
	responseMsg := MythicRPCCallbackEncryptBytesMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackEncryptBytes(incomingMessage)
	}
	return responseMsg
}
