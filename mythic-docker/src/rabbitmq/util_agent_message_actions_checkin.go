package rabbitmq

import (
	"errors"
	"fmt"

	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
)

type agentMessageCheckin struct {
	User                 string                 `json:"user" mapstructure:"user"`
	Host                 string                 `json:"host" mapstructure:"host"`
	PID                  int                    `json:"pid" mapstructure:"pid"`
	IP                   string                 `json:"ip" mapstructure:"ip"`
	IPs                  []string               `json:"ips" mapstructure:"ips"`
	PayloadUUID          string                 `json:"uuid" mapstructure:"uuid"`
	IntegrityLevel       int                    `json:"integrity_level" mapstructure:"integrity_level"`
	OS                   string                 `json:"os" mapstructure:"os"`
	Domain               string                 `json:"domain" mapstructure:"domain"`
	Architecture         string                 `json:"architecture" mapstructure:"architecture"`
	ExternalIP           string                 `json:"external_ip" mapstructure:"external_ip"`
	ExtraInfo            string                 `json:"extra_info" mapstructure:"extra_info"`
	SleepInfo            string                 `json:"sleep_info" mapstructure:"sleep_info"`
	ProcessName          string                 `json:"process_name" mapstructure:"process_name"`
	EncKey               *[]byte                `json:"enc_key" mapstructure:"enc_key"`
	DecKey               *[]byte                `json:"dec_key" mapstructure:"dec_key"`
	Cwd                  string                 `json:"cwd" mapstructure:"cwd"`
	ImpersonationContext string                 `json:"impersonation_context" mapstructure:"impersonation_context"`
	Other                map[string]interface{} `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in so we can reply back with them
}

func handleAgentMessageCheckin(incoming *map[string]interface{}, UUIDInfo *cachedUUIDInfo, remoteIP string) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "checkin"
		}
	*/
	//logging.LogInfo("got a checkin message", "uuidtype", UUIDInfo.UUIDType, "uuid", UUIDInfo.UUID)
	if UUIDInfo.UUIDType == UUIDTYPECALLBACK {
		// this means we got a new `checkin` message from an existing callback
		// use this to simply update the callback information rather than creating a new callback
		// some agents use this a way to re-sync and re-establish p2p links with Mythic
		return handleAgentMessageUpdateInfo(incoming, UUIDInfo, remoteIP)
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
		mythicRPCCallbackCreateMessage.C2ProfileName = UUIDInfo.C2ProfileName
		mythicRPCCallbackCreateMessage.CryptoType = UUIDInfo.CryptoType
		newCryptoKeys := UUIDInfo.getAllKeys()
		if len(newCryptoKeys) > 0 {
			if agentMessage.EncKey == nil {
				mythicRPCCallbackCreateMessage.EncryptionKey = newCryptoKeys[0].EncKey
			}
			if agentMessage.DecKey == nil {
				mythicRPCCallbackCreateMessage.DecryptionKey = newCryptoKeys[0].DecKey
			}
		}
		if mythicRPCCallbackCreateMessage.ExternalIP == "" {
			mythicRPCCallbackCreateMessage.ExternalIP = remoteIP
		}
		//logging.LogDebug("about to create a new callback with data", "callback", mythicRPCCallbackCreateMessage)
		mythicRPCCallbackCreateMessageResponse := MythicRPCCallbackCreate(mythicRPCCallbackCreateMessage)
		if !mythicRPCCallbackCreateMessageResponse.Success {
			errorString := fmt.Sprintf("Failed to create new callback in MythicRPCCallbackCreate: %s", mythicRPCCallbackCreateMessageResponse.Error)
			logging.LogError(nil, errorString)
			return nil, errors.New(errorString)
		}
		response := map[string]interface{}{}
		response["id"] = mythicRPCCallbackCreateMessageResponse.CallbackUUID
		response["status"] = "success"
		reflectBackOtherKeys(&response, &agentMessage.Other)
		UUIDInfo.CallbackID = mythicRPCCallbackCreateMessageResponse.CallbackID
		UUIDInfo.CallbackDisplayID = mythicRPCCallbackCreateMessageResponse.CallbackDisplayID
		return response, nil

	}
}
