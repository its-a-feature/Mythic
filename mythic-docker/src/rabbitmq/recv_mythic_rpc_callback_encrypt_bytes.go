package rabbitmq

import (
	"encoding/base64"
	"encoding/json"
	"errors"

	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackEncryptBytesMessage struct {
	AgentCallbackUUID   string `json:"agent_callback_id"` //required
	Message             []byte `json:"message"`           // required
	IncludeUUID         bool   `json:"include_uuid"`
	Base64ReturnMessage bool   `json:"base64_message"`
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
	if cipherText, err := CallbackEncryptMessage(input.AgentCallbackUUID, input.Message, input.IncludeUUID, input.Base64ReturnMessage); err != nil {
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		response.Message = cipherText
		return response
	}
}

func CallbackEncryptMessage(agentCallbackUUID string, message []byte, includeUUID bool, base64ReturnMessage bool) ([]byte, error) {
	callback := databaseStructs.Callback{}
	payloadtype := databaseStructs.Payloadtype{}
	if err := database.DB.Get(&callback, `SELECT 
	callback.id, callback.enc_key, callback.crypto_type, 
	payload.payload_type_id "payload.payload_type_id"
	FROM callback
	JOIN payload ON callback.registered_payload_id = payload.id
	WHERE agent_callback_id=$1`, agentCallbackUUID); err != nil {
		logging.LogError(err, "Failed to fetch callback in CallbackEncryptMessage")
		return nil, err
	} else if err := database.DB.Get(&payloadtype, `SELECT
	mythic_encrypts, translation_container_id, name
	FROM payloadtype
	WHERE id=$1`, callback.Payload.PayloadTypeID); err != nil {
		logging.LogError(err, "Failed to get payloadtype information in CallbackEncryptMessage")
		return nil, err
	} else if payloadtype.MythicEncrypts {
		// Mythic does encryption, so handle it
		var cipherText []byte
		var err error
		if callback.EncKey == nil {
			cipherText = message
		} else if cipherText, err = mythicCrypto.EncryptAES256HMAC(*callback.EncKey, message); err != nil {
			logging.LogError(err, "Failed to encrypt message")
			return nil, err
		}
		//logging.LogDebug("CallbackEncryptMessage", "encrypted", cipherText)
		if includeUUID {
			cipherText = append([]byte(agentCallbackUUID), cipherText...)
		}
		if base64ReturnMessage {
			//logging.LogDebug("CallbackEncryptMessage", "about to base64", cipherText)
			base64Message := make([]byte, base64.StdEncoding.EncodedLen(len(cipherText)))
			base64.StdEncoding.Encode(base64Message, cipherText)
			//logging.LogDebug("CallbackEncryptMessage", "base64 encoded", base64Message)
			return base64Message, nil
		} else {
			return cipherText, nil
		}
	} else if payloadtype.TranslationContainerID.Valid {
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
			if callback.EncKey != nil {
				key = *callback.EncKey
			} else {
				key = make([]byte, 0)
			}
			if resp, err := RabbitMQConnection.SendTrRPCEncryptBytes(TrEncryptBytesMessage{
				TranslationContainerName: translationContainer.Name,
				EncryptionKey:            key,
				CryptoType:               callback.CryptoType,
				Message:                  message,
				IncludeUUID:              includeUUID,
				Base64ReturnMessage:      base64ReturnMessage,
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
