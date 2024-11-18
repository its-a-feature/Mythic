package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/grpc/services"
	"time"

	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/logging"
)

// TRANSLATION_CONTAINER_CUSTOM_MESSAGE_TO_MYTHIC_C2_FORMAT STRUCTS

type TrCustomMessageToMythicC2FormatMessage struct {
	TranslationContainerName string                    `json:"translation_container_name"`
	C2Name                   string                    `json:"c2_profile_name"`
	Message                  []byte                    `json:"message"`
	UUID                     string                    `json:"uuid"`
	MythicEncrypts           bool                      `json:"mythic_encrypts"`
	CryptoKeys               []mythicCrypto.CryptoKeys `json:"crypto_keys"`
}

type TrCustomMessageToMythicC2FormatMessageResponse struct {
	Success bool                   `json:"success"`
	Error   string                 `json:"error"`
	Message map[string]interface{} `json:"message"`
}

func (r *rabbitMQConnection) SendTrRPCCustomMessageToMythicC2(toMythicC2Format TrCustomMessageToMythicC2FormatMessage) (*TrCustomMessageToMythicC2FormatMessageResponse, error) {
	trCustomMessageToMythicC2Format := TrCustomMessageToMythicC2FormatMessageResponse{}
	grpcSendMsg := services.TrCustomMessageToMythicC2FormatMessage{
		TranslationContainerName: toMythicC2Format.TranslationContainerName,
		C2Name:                   toMythicC2Format.C2Name,
		Message:                  toMythicC2Format.Message,
		UUID:                     toMythicC2Format.UUID,
		MythicEncrypts:           toMythicC2Format.MythicEncrypts,
	}
	adjustedKeys := make([]*services.CryptoKeysFormat, len(toMythicC2Format.CryptoKeys))
	for i := 0; i < len(toMythicC2Format.CryptoKeys); i++ {
		newCrypto := services.CryptoKeysFormat{}
		adjustedKeys[i] = &newCrypto
		adjustedKeys[i].Value = toMythicC2Format.CryptoKeys[i].Value
		if toMythicC2Format.CryptoKeys[i].EncKey != nil {
			adjustedKeys[i].EncKey = *toMythicC2Format.CryptoKeys[i].EncKey
		}
		if toMythicC2Format.CryptoKeys[i].DecKey != nil {
			adjustedKeys[i].DecKey = *toMythicC2Format.CryptoKeys[i].DecKey
		}
	}
	grpcSendMsg.CryptoKeys = adjustedKeys
	sndMsgChan, rcvMsgChan, err := grpc.TranslationContainerServer.GetCustomToMythicChannels(toMythicC2Format.TranslationContainerName)
	if err != nil {
		logging.LogError(err, "Failed to get channels for grpc to CustomC2 to MythicC2")
		trCustomMessageToMythicC2Format.Success = false
		trCustomMessageToMythicC2Format.Error = err.Error()
		return &trCustomMessageToMythicC2Format, err
	}
	select {
	case sndMsgChan <- grpcSendMsg:
	case <-time.After(grpc.TranslationContainerServer.GetTimeout()):
		return nil, errors.New(fmt.Sprintf("timeout trying to send to translation container: %s", toMythicC2Format.TranslationContainerName))
	}

	select {
	case response, ok := <-rcvMsgChan:
		if !ok {
			logging.LogError(nil, "Failed to receive from translation container")
			return nil, errors.New(fmt.Sprintf("failed to receive from translation container: %s", toMythicC2Format.TranslationContainerName))
		} else {
			if response.GetSuccess() {
				responseMap := map[string]interface{}{}
				if err := json.Unmarshal(response.Message, &responseMap); err != nil {
					logging.LogError(err, "Failed to convert mythic message to json bytes ")
					trCustomMessageToMythicC2Format.Success = false
					trCustomMessageToMythicC2Format.Error = err.Error()
				} else {
					trCustomMessageToMythicC2Format.Message = responseMap
					trCustomMessageToMythicC2Format.Success = response.GetSuccess()
					trCustomMessageToMythicC2Format.Error = response.GetError()
				}
			} else {
				trCustomMessageToMythicC2Format.Success = response.GetSuccess()
				trCustomMessageToMythicC2Format.Error = response.GetError()
			}
			return &trCustomMessageToMythicC2Format, err
		}
	case <-time.After(grpc.TranslationContainerServer.GetTimeout()):
		logging.LogError(err, "timeout hit waiting to receive a message from the translation container")
		return nil, errors.New(fmt.Sprintf("timeout hit waiting to receive message from the translation container: %s", toMythicC2Format.TranslationContainerName))
	}

	/*
		exclusiveQueue := true
		if opsecBytes, err := json.Marshal(toMythicC2Format); err != nil {
			logging.LogError(err, "Failed to convert toMythicC2Format to JSON", "toMythicC2Format", toMythicC2Format)
			return nil, err
		} else if response, err := r.SendRPCMessage(
			MYTHIC_EXCHANGE,
			GetTrRPCConvertToMythicFormatRoutingKey(toMythicC2Format.TranslationContainerName),
			opsecBytes,
			!exclusiveQueue,
		); err != nil {
			logging.LogError(err, "Failed to send RPC message")
			return nil, err
		} else if err := json.Unmarshal(response, &trCustomMessageToMythicC2Format); err != nil {
			logging.LogError(err, "Failed to parse tr custom message to mythic c2 response back to struct", "response", response)
			return nil, err
		} else {
			return &trCustomMessageToMythicC2Format, nil
		}

	*/
}
