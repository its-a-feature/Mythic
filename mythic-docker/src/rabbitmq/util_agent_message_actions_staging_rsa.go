package rabbitmq

import (
	"encoding/base64"
	"errors"
	"fmt"
	"strings"

	"github.com/google/uuid"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
)

type agentMessageStagingRSA struct {
	PublicKey string                 `json:"pub_key" mapstructure:"pub_key"`       // base64 of public key
	SessionID string                 `json:"session_id" mapstructure:"session_id"` // unique random string to help prevent replays
	Other     map[string]interface{} `json:"-" mapstructure:",remain"`             // capture any 'other' keys that were passed in so we can reply back with them
}

func handleAgentMessageStagingRSA(incoming *map[string]interface{}, uUIDInfo *cachedUUIDInfo) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "staging_rsa",
		  "pub_key": "LS0tLS1CRUdJTi...", // base64 of public key
		  "session_id": "jGAlyBTrsrbYNDcpj65T" // random string
		}
	*/
	agentMessage := agentMessageStagingRSA{}
	stagingDatabaseMessage := databaseStructs.Staginginfo{}
	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into struct: %s", err.Error()))
	} else if newKey, err := mythicCrypto.GenerateKeysForPayload("aes256_hmac"); err != nil {
		logging.LogError(err, "Failed to generate new AES key for staging rsa")
		errorString := fmt.Sprintf("Failed to generate new AES key for staging rsa: %s", err.Error())
		return nil, errors.New(errorString)
	} else {
		publicKeyToUse := agentMessage.PublicKey
		if !strings.Contains(agentMessage.PublicKey, "BEGIN PUBLIC KEY") {
			publicKeyToUse = "-----BEGIN PUBLIC KEY-----\n" + agentMessage.PublicKey + "\n-----END PUBLIC KEY-----"
		}
		if encryptedNewKey, err := mythicCrypto.RsaEncryptBytes(*newKey.EncKey, []byte(publicKeyToUse)); err != nil {
			logging.LogError(err, "Failed to encrypt new encryption key with RSA")
			return nil, errors.New(fmt.Sprintf("Failed to encrypt new encryption key with RSA: %s", err.Error()))
		} else if tempUUID, err := uuid.NewRandom(); err != nil {
			logging.LogError(err, "Failed to generate a new random UUID for staging")
			return nil, errors.New(fmt.Sprintf("Failed to generate a new random UUID for staging: %s", err.Error()))
		} else {
			stagingDatabaseMessage.CryptoType = "aes256_hmac"
			stagingDatabaseMessage.EncKey = newKey.EncKey
			stagingDatabaseMessage.DecKey = newKey.DecKey
			stagingDatabaseMessage.SessionID = agentMessage.SessionID
			stagingDatabaseMessage.StagingUuID = tempUUID.String()
			stagingDatabaseMessage.PayloadID = uUIDInfo.PayloadID
			if _, err := database.DB.NamedExec(`INSERT INTO staginginfo 
		(session_id, enc_key, dec_key, crypto_type, payload_id, staging_uuid)
		VALUES (:session_id, :enc_key, :dec_key, :crypto_type, :payload_id, :staging_uuid)`, stagingDatabaseMessage); err != nil {
				logging.LogError(err, "Failed to save staging information into database", "staginginfo", stagingDatabaseMessage)
				return nil, errors.New(fmt.Sprintf("Failed to save staging information: %s", err.Error()))
			} else {
				// generate the response map
				response := map[string]interface{}{}
				response["uuid"] = tempUUID.String()
				response["session_id"] = agentMessage.SessionID
				response["session_key"] = base64.StdEncoding.EncodeToString(encryptedNewKey)
				reflectBackOtherKeys(&response, &agentMessage.Other)
				return response, nil
			}
		}
	}
}
