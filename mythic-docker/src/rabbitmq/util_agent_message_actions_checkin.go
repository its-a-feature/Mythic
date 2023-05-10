package rabbitmq

import (
	"errors"
	"fmt"

	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
)

type agentMessageCheckin struct {
	User           string                 `json:"user" mapstructure:"user"`
	Host           string                 `json:"host" mapstructure:"host"`
	PID            int                    `json:"pid" mapstructure:"pid"`
	IP             string                 `json:"ip" mapstructure:"ip"`
	IPs            []string               `json:"ips" mapstructure:"ips"`
	PayloadUUID    string                 `json:"uuid" mapstructure:"uuid"`
	IntegrityLevel int                    `json:"integrity_level" mapstructure:"integrity_level"`
	OS             string                 `json:"os" mapstructure:"os"`
	Domain         string                 `json:"domain" mapstructure:"domain"`
	Architecture   string                 `json:"architecture" mapstructure:"architecture"`
	ExternalIP     string                 `json:"external_ip" mapstructure:"external_ip"`
	ExtraInfo      string                 `json:"extra_info" mapstructure:"extra_info"`
	SleepInfo      string                 `json:"sleep_info" mapstructure:"sleep_info"`
	ProcessName    string                 `json:"process_name" mapstructure:"process_name"`
	EncKey         *[]byte                `json:"enc_key" mapstructure:"enc_key"`
	DecKey         *[]byte                `json:"dec_key" mapstructure:"dec_key"`
	Other          map[string]interface{} `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in so we can reply back with them
}

func handleAgentMessageCheckin(incoming *map[string]interface{}, uUIDInfo *cachedUUIDInfo) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "checkin"
		}
	*/
	if uUIDInfo.UUIDType == UUIDTYPECALLBACK {
		// this means we got a new `checkin` message from an existing callback
		// use this to simply update the callback information rather than creating a new callback
		// some agents use this a way to re-sync and re-establish p2p links with Mythic
		return handleAgentMessageUpdateInfo(incoming, uUIDInfo)
	}
	agentMessage := agentMessageCheckin{}
	mythicRPCCallbackCreateMessage := MythicRPCCallbackCreateMessage{}
	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into agentMessageCheckin struct: %s", err.Error()))
	} else if err := mapstructure.Decode(incoming, &mythicRPCCallbackCreateMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into MythicRPCCallbackCreateMessage")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into MythicRPCCallbackCreateMessage struct: %s", err.Error()))
	} else {
		mythicRPCCallbackCreateMessage.C2ProfileName = uUIDInfo.C2ProfileName
		mythicRPCCallbackCreateMessage.CryptoType = uUIDInfo.CryptoType
		newCryptoKeys := uUIDInfo.getAllKeys()
		if len(newCryptoKeys) > 0 {
			if agentMessage.EncKey == nil {
				mythicRPCCallbackCreateMessage.EncryptionKey = newCryptoKeys[0].EncKey
			}
			if agentMessage.DecKey == nil {
				mythicRPCCallbackCreateMessage.DecryptionKey = newCryptoKeys[0].DecKey
			}
		}

		//logging.LogDebug("about to create a new callback with data", "callback", mythicRPCCallbackCreateMessage)
		if mythicRPCCallbackCreateMessageResponse := MythicRPCCallbackCreate(mythicRPCCallbackCreateMessage); !mythicRPCCallbackCreateMessageResponse.Success {
			errorString := fmt.Sprintf("Failed to create new callback in MythicRPCCallbackCreate: %s", mythicRPCCallbackCreateMessageResponse.Error)
			logging.LogError(nil, errorString)
			return nil, errors.New(errorString)
		} else {
			response := map[string]interface{}{}
			response["id"] = mythicRPCCallbackCreateMessageResponse.CallbackUUID
			response["status"] = "success"
			reflectBackOtherKeys(&response, &agentMessage.Other)
			return response, nil
		}
	}
}
