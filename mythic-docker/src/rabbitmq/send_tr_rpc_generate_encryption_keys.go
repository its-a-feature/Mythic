package rabbitmq

import (
	"errors"
	"fmt"
	"time"

	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
)

// TRANSLATION_CONTAINER_GENERATE_ENCRYPTION_KEYS STRUCTS

type TrGenerateEncryptionKeysMessage struct {
	TranslationContainerName string `json:"translation_container_name"`
	C2Name                   string `json:"c2_profile_name"`
	CryptoParamValue         string `json:"value"`
	CryptoParamName          string `json:"name"`
}

type TrGenerateEncryptionKeysMessageResponse struct {
	Success       bool    `json:"success"`
	Error         string  `json:"error"`
	EncryptionKey *[]byte `json:"enc_key"`
	DecryptionKey *[]byte `json:"dec_key"`
}

func (r *rabbitMQConnection) SendTrRPCGenerateEncryptionKeys(generateEncryptionKeys TrGenerateEncryptionKeysMessage, authContext RabbitMQAuthContext) (*TrGenerateEncryptionKeysMessageResponse, error) {
	trGenerateEncryptionKeysResponse := TrGenerateEncryptionKeysMessageResponse{}
	authToken, err := GenerateRabbitMQAuthContextToken(authContext)
	if err != nil {
		logging.LogError(err, "Failed to generate auth context token for translation gRPC")
		trGenerateEncryptionKeysResponse.Success = false
		trGenerateEncryptionKeysResponse.Error = err.Error()
		return &trGenerateEncryptionKeysResponse, err
	}
	grpcSendMsg := services.TrGenerateEncryptionKeysMessage{
		TranslationContainerName: generateEncryptionKeys.TranslationContainerName,
		C2Name:                   generateEncryptionKeys.C2Name,
		CryptoParamValue:         generateEncryptionKeys.CryptoParamValue,
		CryptoParamName:          generateEncryptionKeys.CryptoParamName,
		AuthContext:              authToken,
	}
	sndMsgChan, rcvMsgChan, err := grpc.TranslationContainerServer.GetGenerateKeysChannels(generateEncryptionKeys.TranslationContainerName)
	if err != nil {
		logging.LogError(err, "Failed to get channels for grpc to generate encryption keys")
		trGenerateEncryptionKeysResponse.Success = false
		trGenerateEncryptionKeysResponse.Error = err.Error()
		return &trGenerateEncryptionKeysResponse, err
	}
	select {
	case sndMsgChan <- grpcSendMsg:
	case <-time.After(grpc.TranslationContainerServer.GetTimeout()):
		return nil, errors.New(fmt.Sprintf("timeout trying to send to translation container: %s", generateEncryptionKeys.TranslationContainerName))
	}
	select {
	case response, ok := <-rcvMsgChan:
		if !ok {
			return nil, errors.New(fmt.Sprintf("failed to receive from translation container: %s", generateEncryptionKeys.TranslationContainerName))
		}
		err = ValidateRabbitMQAuthContextResponseToken(authToken, response.GetAuthContext())
		if err != nil {
			logging.LogError(err, "Failed to validate translation gRPC response auth context")
			trGenerateEncryptionKeysResponse.Success = false
			trGenerateEncryptionKeysResponse.Error = err.Error()
			return &trGenerateEncryptionKeysResponse, err
		}
		if response.GetSuccess() {
			encKey := response.GetEncryptionKey()
			decKey := response.GetDecryptionKey()
			trGenerateEncryptionKeysResponse.EncryptionKey = &encKey
			trGenerateEncryptionKeysResponse.DecryptionKey = &decKey
		}
		trGenerateEncryptionKeysResponse.Success = response.GetSuccess()
		trGenerateEncryptionKeysResponse.Error = response.GetError()

		return &trGenerateEncryptionKeysResponse, nil
	case <-time.After(grpc.TranslationContainerServer.GetTimeout()):
		return nil, errors.New(fmt.Sprintf("timeout hit waiting to receive message from the translation container: %s", generateEncryptionKeys.TranslationContainerName))
	}
}
