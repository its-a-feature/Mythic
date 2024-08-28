package rabbitmq

import (
	"encoding/base64"
	"fmt"
	"strings"

	"github.com/google/uuid"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/mitchellh/mapstructure"
)

type agentMessageStagingRSA struct {
	PublicKey string                 `json:"pub_key" mapstructure:"pub_key"`       // base64 of public key
	SessionID string                 `json:"session_id" mapstructure:"session_id"` // unique random string to help prevent replays
	Other     map[string]interface{} `json:"-" mapstructure:",remain"`             // capture any 'other' keys that were passed in so we can reply back with them
}

const (
	insertQuery = `INSERT INTO staginginfo (session_id, enc_key, dec_key, crypto_type, payload_id, staging_uuid)
		VALUES (:session_id, :enc_key, :dec_key, :crypto_type, :payload_id, :staging_uuid)`
)

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
		return nil, fmt.Errorf("failed to decode agent message into struct: %v", err)
	}

	newKey, err := mythicCrypto.GenerateKeysForPayload("aes256_hmac")
	if err != nil {
		return nil, fmt.Errorf("failed to generate new AES key for staging rsa: %v", err)
	}

	publicKeyToUse := agentMessage.PublicKey
	if strings.HasPrefix(agentMessage.PublicKey, "LS0t") {
		decodedBytes, err := base64.StdEncoding.DecodeString(publicKeyToUse)
		if err != nil {
			return nil, fmt.Errorf("failed to base64 provided public key: %v", err)
		}
		publicKeyToUse = string(decodedBytes)
	} else {
		publicKeyToUse = fmt.Sprintf("-----BEGIN PUBLIC KEY-----\n%s\n-----END PUBLIC KEY-----", agentMessage.PublicKey)
	}

	encryptedNewKey, err := mythicCrypto.RsaEncryptBytes(*newKey.EncKey, []byte(publicKeyToUse))
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt new encryption key with RSA: %v", err)
	}

	tempUUID, err := uuid.NewRandom()
	if err != nil {
		return nil, fmt.Errorf("failed to generate a new random UUID for staging: %v", err)
	}

	stagingDatabaseMessage.CryptoType = "aes256_hmac"
	stagingDatabaseMessage.EncKey = newKey.EncKey
	stagingDatabaseMessage.DecKey = newKey.DecKey
	stagingDatabaseMessage.SessionID = agentMessage.SessionID
	stagingDatabaseMessage.StagingUuID = tempUUID.String()
	stagingDatabaseMessage.PayloadID = uUIDInfo.PayloadID

	if _, err := database.DB.NamedExec(insertQuery, stagingDatabaseMessage); err != nil {
		return nil, fmt.Errorf("failed to save staging information into database %s: %v", "staginginfo", err)
	}
	// generate the response map
	response := map[string]interface{}{}
	response["uuid"] = tempUUID.String()
	response["session_id"] = agentMessage.SessionID
	response["session_key"] = base64.StdEncoding.EncodeToString(encryptedNewKey)

	reflectBackOtherKeys(&response, &agentMessage.Other)
	return response, nil
}
