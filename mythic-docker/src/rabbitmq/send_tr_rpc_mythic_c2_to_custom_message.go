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

// TRANSLATION_CONTAINER_MYTHIC_C2_TO_CUSTOM_MESSAGE_FORMAT STRUCTS

type TrMythicC2ToCustomMessageFormatMessage struct {
	TranslationContainerName string                    `json:"translation_container_name"`
	C2Name                   string                    `json:"c2_profile_name"`
	Message                  map[string]interface{}    `json:"message"`
	UUID                     string                    `json:"uuid"`
	MythicEncrypts           bool                      `json:"mythic_encrypts"`
	CryptoKeys               []mythicCrypto.CryptoKeys `json:"crypto_keys"`
}

type TrMythicC2ToCustomMessageFormatMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Message []byte `json:"message"`
}

func (r *rabbitMQConnection) SendTrRPCMythicC2ToCustomMessage(toCustomC2Format TrMythicC2ToCustomMessageFormatMessage) (*TrMythicC2ToCustomMessageFormatMessageResponse, error) {
	trMythicC2ToCustomMessageFormat := TrMythicC2ToCustomMessageFormatMessageResponse{}
	grpcSendMsg := services.TrMythicC2ToCustomMessageFormatMessage{
		TranslationContainerName: toCustomC2Format.TranslationContainerName,
		C2Name:                   toCustomC2Format.C2Name,
		UUID:                     toCustomC2Format.UUID,
		MythicEncrypts:           toCustomC2Format.MythicEncrypts,
	}
	if messageBytes, err := json.Marshal(toCustomC2Format.Message); err != nil {
		logging.LogError(err, "Failed to convert mythic message to json bytes ")
		trMythicC2ToCustomMessageFormat.Success = false
		trMythicC2ToCustomMessageFormat.Error = err.Error()
		return &trMythicC2ToCustomMessageFormat, err
	} else {
		grpcSendMsg.Message = messageBytes
	}
	adjustedKeys := make([]*services.CryptoKeysFormat, len(toCustomC2Format.CryptoKeys))
	for i := 0; i < len(toCustomC2Format.CryptoKeys); i++ {
		newCrypto := services.CryptoKeysFormat{}
		adjustedKeys[i] = &newCrypto
		adjustedKeys[i].Value = toCustomC2Format.CryptoKeys[i].Value
		if toCustomC2Format.CryptoKeys[i].EncKey != nil {
			adjustedKeys[i].EncKey = *toCustomC2Format.CryptoKeys[i].EncKey
		}
		if toCustomC2Format.CryptoKeys[i].DecKey != nil {
			adjustedKeys[i].DecKey = *toCustomC2Format.CryptoKeys[i].DecKey
		}
	}
	grpcSendMsg.CryptoKeys = adjustedKeys
	if sndMsgChan, rcvMsgChan, err := grpc.TranslationContainerServer.GetMythicToCustomChannels(toCustomC2Format.TranslationContainerName); err != nil {
		logging.LogError(err, "Failed to get channels for grpc to generate encryption keys")
		trMythicC2ToCustomMessageFormat.Success = false
		trMythicC2ToCustomMessageFormat.Error = err.Error()
		return &trMythicC2ToCustomMessageFormat, err
	} else {
		select {
		case sndMsgChan <- grpcSendMsg:
		case <-time.After(grpc.TranslationContainerServer.GetTimeout()):
			return nil, errors.New(fmt.Sprintf("timeout trying to send to translation container: %s", toCustomC2Format.TranslationContainerName))
		}
		select {
		case response, ok := <-rcvMsgChan:
			if !ok {
				logging.LogError(nil, "Failed to receive from translation container")
				return nil, errors.New(fmt.Sprintf("failed to receive from translation container: %s", toCustomC2Format.TranslationContainerName))
			} else {
				trMythicC2ToCustomMessageFormat.Message = response.GetMessage()
				trMythicC2ToCustomMessageFormat.Success = response.GetSuccess()
				trMythicC2ToCustomMessageFormat.Error = response.GetError()
				return &trMythicC2ToCustomMessageFormat, nil
			}
		case <-time.After(grpc.TranslationContainerServer.GetTimeout()):
			logging.LogError(err, "timeout hit waiting to receive a message from the translation container")
			return nil, errors.New(fmt.Sprintf("timeout hit waiting to receive message from the translation container: %s", toCustomC2Format.TranslationContainerName))
		}
	}
	/*
		exclusiveQueue := true
		if opsecBytes, err := json.Marshal(toCustomC2Format); err != nil {
			logging.LogError(err, "Failed to convert toCustomC2Format to JSON", "toCustomC2Format", toCustomC2Format)
			return nil, err
		} else if response, err := r.SendRPCMessage(
			MYTHIC_EXCHANGE,
			GetTrRPCConvertFromMythicFormatRoutingKey(toCustomC2Format.TranslationContainerName),
			opsecBytes,
			!exclusiveQueue,
		); err != nil {
			logging.LogError(err, "Failed to send RPC message")
			return nil, err
		} else if err := json.Unmarshal(response, &trMythicC2ToCustomMessageFormat); err != nil {
			logging.LogError(err, "Failed to parse tr mythic c2 to custom message format response back to struct", "response", response)
			return nil, err
		} else {
			return &trMythicC2ToCustomMessageFormat, nil
		}

	*/
}
