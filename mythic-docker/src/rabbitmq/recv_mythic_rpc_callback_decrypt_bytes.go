package rabbitmq

import (
	"encoding/base64"
	"encoding/json"
	"errors"

	"github.com/google/uuid"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackDecryptBytesMessage struct {
	AgentCallbackUUID string  `json:"agent_callback_id"` // required if IncludesUUID is false
	Message           *[]byte `json:"message"`           // required
	IncludesUUID      bool    `json:"include_uuid"`
	IsBase64Encoded   bool    `json:"base64_message"`
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

	if cipherText, err := CallbackDecryptMessage(input.AgentCallbackUUID, input.Message, input.IncludesUUID, input.IsBase64Encoded); err != nil {
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		//logging.LogInfo("Returning decrypted message", "decrypted", cipherText)
		response.Message = cipherText
		return response
	}
}

func CallbackDecryptMessage(agentCallbackUUID string, message *[]byte, includesUUID bool, isBase64Encoded bool) ([]byte, error) {
	callback := databaseStructs.Callback{}
	var agentMessage []byte
	var callbackUUID string
	if message == nil {
		logging.LogError(nil, "Missing Message value")
		return nil, errors.New("Missing message value")
	}
	if isBase64Encoded {
		agentMessage = make([]byte, base64.StdEncoding.DecodedLen(len(*message)))
		if l, err := base64.StdEncoding.Decode(agentMessage, *message); err != nil {
			logging.LogError(err, "Decrypt message")
			return nil, err
		} else {
			agentMessage = agentMessage[:l]
		}
	} else {
		agentMessage = *message
	}
	//logging.LogInfo("Decrypt message", "base64 decoded", agentMessage)
	if includesUUID {
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
		callbackUUID = agentCallbackUUID
	}
	//logging.LogInfo("Decrypt message", "callbackUUID", callbackUUID, "agentMessage", agentMessage)
	payloadtype := databaseStructs.Payloadtype{}
	if err := database.DB.Get(&callback, `SELECT 
	callback.id, callback.dec_key, callback.crypto_type, 
	payload.payload_type_id "payload.payload_type_id"
	FROM callback
	JOIN payload ON callback.registered_payload_id = payload.id
	WHERE agent_callback_id=$1`, callbackUUID); err != nil {
		logging.LogError(err, "Failed to fetch callback in CallbackDecryptMessage")
		return nil, err
	} else if err := database.DB.Get(&payloadtype, `SELECT
	mythic_encrypts, translation_container_id, "name"
	FROM payloadtype
	WHERE id=$1`, callback.Payload.PayloadTypeID); err != nil {
		logging.LogError(err, "Failed to get payloadtype information in CallbackDecryptMessage")
		return nil, err
	} else if payloadtype.MythicEncrypts {
		// Mythic does encryption, so handle it
		//logging.LogInfo("Decrypt message", "mythic encrypts", true)
		var cipherText []byte
		var err error
		if callback.DecKey == nil {
			//logging.LogInfo("Decrypt message", "dec key", nil, "agent message", agentMessage)
			return agentMessage, nil
		} else if cipherText, err = mythicCrypto.DecryptAES256HMAC(*callback.DecKey, agentMessage); err != nil {
			logging.LogError(err, "Failed to decrypt message")
			return nil, err
		} else {
			//logging.LogDebug("Decrypt message", "decrypted", cipherText)
			return cipherText, nil
		}
	} else if payloadtype.TranslationContainerID.Valid {
		//logging.LogInfo("Decrypt message", "translation container", payloadtype.TranslationContainerID.Int64)
		// Mythic doesn't encrypt, and there's a translation container associated
		translationContainer := databaseStructs.Translationcontainer{}
		if err := database.DB.Get(&translationContainer, `SELECT
		id, "name", container_running 
		FROM translationcontainer
		WHERE id=$1`, payloadtype.TranslationContainerID.Int64); err != nil {
			logging.LogError(err, "Failed to get translation container data when trying to encrypt")
			return nil, err
		} else if !translationContainer.ContainerRunning {
			err := errors.New("Translation container is not online, can't task with encrypting message")
			logging.LogError(err, "Failed to encrypt message")
			return nil, err
		} else {
			var key []byte
			if callback.DecKey != nil {
				key = *callback.DecKey
			} else {
				key = make([]byte, 0)
			}
			//logging.LogInfo("Sending decrypt routine to translation container")
			if resp, err := RabbitMQConnection.SendTrRPCDecryptBytes(TrDecryptBytesMessage{
				TranslationContainerName: translationContainer.Name,
				EncryptionKey:            key,
				CryptoType:               callback.CryptoType,
				Message:                  agentMessage,
				AgentCallbackUUID:        callbackUUID,
			}); err != nil {
				logging.LogError(err, "Failed to send RPC message to encrypt message")
				return nil, err
			} else {
				return resp.Message, nil
			}
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
