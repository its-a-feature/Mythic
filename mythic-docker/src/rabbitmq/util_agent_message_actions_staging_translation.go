package rabbitmq

import (
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
)

type agentMessageStagingTranslator struct {
	Action        string  `json:"action" mapstructure:"action"`
	SessionID     string  `json:"session_id" mapstructure:"session_id"` // unique random string to help prevent replays
	EncryptionKey *[]byte `json:"enc_key" mapstructure:"enc_key"`
	DecryptionKey *[]byte `json:"dec_key" mapstructure:"dec_key"`
	CryptoType    string  `json:"type" mapstructure:"type"`
	NextUUID      string  `json:"next_uuid" mapstructure:"next_uuid"`
	FinalMessage  *[]byte `json:"message" mapstructure:"message"`
}

func handleAgentMessageStagingTranslation(incoming *map[string]interface{}, uUIDInfo *cachedUUIDInfo) (*[]byte, error) {
	// got message:
	/*
			# message back should have:
		        # {
				# 	"action": "staging_translator",
		        #   "session_id": "a string way if needed to tell two concurrently staging requests apart"
		        #   "enc_key": raw bytes of the encryption key to use for the next request
		        #   "dec_key": raw bytes of the decryption key to use for the next request
		        #   "type": "string crypto type"
		        #   "next_uuid": "string UUID that will be used for the next message to pull this information back from the database",
		        #   "message": the final message you want to actually go back to the agent
		        # }
	*/
	agentMessage := agentMessageStagingTranslator{}
	stagingDatabaseMessage := databaseStructs.Staginginfo{}
	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into struct: %s", err.Error()))
	} else {
		stagingDatabaseMessage.CryptoType = agentMessage.CryptoType
		stagingDatabaseMessage.EncKey = agentMessage.EncryptionKey
		stagingDatabaseMessage.DecKey = agentMessage.DecryptionKey
		stagingDatabaseMessage.SessionID = agentMessage.SessionID
		stagingDatabaseMessage.StagingUuID = agentMessage.NextUUID
		stagingDatabaseMessage.PayloadID = uUIDInfo.PayloadID
		if _, err := database.DB.NamedExec(`INSERT INTO staginginfo 
		(session_id, enc_key, dec_key, crypto_type, payload_id, staging_uuid)
		VALUES (:session_id, :enc_key, :dec_key, :crypto_type, :payload_id, :staging_uuid)`, stagingDatabaseMessage); err != nil {
			logging.LogError(err, "Failed to save staging information into database", "staginginfo", stagingDatabaseMessage)
			return nil, errors.New(fmt.Sprintf("Failed to save staging information: %s", err.Error()))
		} else {
			return agentMessage.FinalMessage, nil
		}
	}

}
