package rabbitmq

import (
	"encoding/base64"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackDecryptBytesMessage struct {
	AgentCallbackUUID string  `json:"agent_callback_id"` // required if IncludesUUID is false
	Message           *[]byte `json:"message"`           // required
	IncludesUUID      bool    `json:"include_uuid"`
	IsBase64Encoded   bool    `json:"base64_message"`
	C2Profile         string  `json:"c2_profile"`
}
type MythicRPCCallbackDecryptBytesMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message []byte `json:"message"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_DECRYPT_BYTES,
		RoutingKey: MYTHIC_RPC_CALLBACK_DECRYPT_BYTES,
		Handler:    processMythicRPCCallbackDecryptBytes,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_DECRYPT_BYTES
func MythicRPCCallbackDecryptBytes(input MythicRPCCallbackDecryptBytesMessage) MythicRPCCallbackDecryptBytesMessageResponse {
	response := MythicRPCCallbackDecryptBytesMessageResponse{
		Success: false,
	}

	if cipherText, err := CallbackDecryptMessage(input); err != nil {
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		response.Message = cipherText
		return response
	}
}

func CallbackDecryptMessage(input MythicRPCCallbackDecryptBytesMessage) ([]byte, error) {
	cachedInfo, err := LookupEncryptionData(input.C2Profile, input.AgentCallbackUUID, false)
	if err != nil {
		return nil, err
	}
	var agentMessage []byte
	var callbackUUID string
	if input.Message == nil {
		logging.LogError(nil, "Missing Message value")
		return nil, errors.New("Missing message value")
	}
	if input.IsBase64Encoded {
		agentMessage = make([]byte, base64.StdEncoding.DecodedLen(len(*input.Message)))
		if l, err := base64.StdEncoding.Decode(agentMessage, *input.Message); err != nil {
			logging.LogError(err, "Decrypt message")
			return nil, err
		} else {
			agentMessage = agentMessage[:l]
		}
	} else {
		agentMessage = *input.Message
	}
	//logging.LogInfo("Decrypt message", "base64 decoded", agentMessage)
	if input.IncludesUUID {
		// the first 16 or 36 bytes could be a UUID
		if len(agentMessage) < 36 {
			// try to get 16 byte version of uuid
			if len(agentMessage) < 16 {
				return nil, errors.New("message must be at least 16 bytes long")
			}
			if tempUUID, err := uuid.ParseBytes(agentMessage[:16]); err != nil {
				logging.LogError(err, "Failed to parse agent UUID out of first 16 bytes of message")
				return nil, err
			} else {
				callbackUUID = tempUUID.String()
				agentMessage = agentMessage[16:]
			}
		} else {
			// try to get 36 byte version of uuid string
			// if that fails, try the 16 byte version
			if tempUUID, err := uuid.ParseBytes(agentMessage[:36]); err == nil {
				callbackUUID = tempUUID.String()
				agentMessage = agentMessage[36:]
			} else if tempUUID, err := uuid.ParseBytes(agentMessage[:16]); err == nil {
				callbackUUID = tempUUID.String()
				agentMessage = agentMessage[16:]
			} else {
				logging.LogError(err, "Failed to find callback UUID at beginning of message")
				return nil, err
			}
		}
	} else {
		callbackUUID = input.AgentCallbackUUID
	}
	//logging.LogInfo("Decrypt message", "callbackUUID", callbackUUID, "agentMessage", agentMessage)
	if cachedInfo.MythicEncrypts {
		// Mythic does encryption, so handle it
		//logging.LogInfo("Decrypt message", "mythic encrypts", true)
		decrypted, err := cachedInfo.IterateAndAct(&agentMessage, "decrypt")
		if err != nil {
			return nil, err
		}
		return *decrypted, nil
	} else if cachedInfo.TranslationContainerID > 0 {
		//logging.LogInfo("Decrypt message", "translation container", payloadtype.TranslationContainerID.Int64)
		// Mythic doesn't encrypt, and there's a translation container associated
		encKey := make([]byte, 0)
		switch cachedInfo.UUIDType {
		case UUIDTYPECALLBACK:
			encKey = *cachedInfo.CallbackDecKey
		case UUIDTYPESTAGING:
			encKey = *cachedInfo.StagingDecKey
		case UUIDTYPEPAYLOAD:
			encKey = *cachedInfo.PayloadDecKey
		default:
		}
		//logging.LogInfo("Sending decrypt routine to translation container")
		if resp, err := RabbitMQConnection.SendTrRPCDecryptBytes(TrDecryptBytesMessage{
			TranslationContainerName: cachedInfo.TranslationContainerName,
			EncryptionKey:            encKey,
			CryptoType:               cachedInfo.CryptoType,
			Message:                  agentMessage,
			AgentCallbackUUID:        callbackUUID,
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

func processMythicRPCCallbackDecryptBytes(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackDecryptBytesMessage{}
	responseMsg := MythicRPCCallbackDecryptBytesMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackDecryptBytes(incomingMessage)
	}
	return responseMsg
}
