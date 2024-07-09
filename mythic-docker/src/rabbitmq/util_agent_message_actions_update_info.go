package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/utils"
	"strings"

	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
)

func handleAgentMessageUpdateInfo(incoming *map[string]interface{}, uUIDInfo *cachedUUIDInfo, remoteIP string) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "update_info"
		}
	*/
	response := map[string]interface{}{}
	agentMessage := agentMessageCheckin{}
	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into struct: %s", err.Error()))
	} else {
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, `SELECT * FROM callback WHERE id=$1`, uUIDInfo.CallbackID); err != nil {
			logging.LogError(err, "Failed to find callback information")
			return nil, errors.New(fmt.Sprintf("Failed to find callback"))
		}
		if agentMessage.User != "" {
			callback.User = agentMessage.User
		}
		if agentMessage.Host != "" {
			callback.Host = strings.ToUpper(agentMessage.Host)
		}
		if agentMessage.PID > 0 {
			callback.PID = agentMessage.PID
		}
		if agentMessage.ExtraInfo != "" {
			callback.ExtraInfo = agentMessage.ExtraInfo
		}
		if agentMessage.SleepInfo != "" {
			callback.SleepInfo = agentMessage.SleepInfo
		}
		if agentMessage.EncKey != nil {
			callback.EncKey = agentMessage.EncKey
			uUIDInfo.CallbackEncKey = agentMessage.EncKey
		}
		if agentMessage.DecKey != nil {
			callback.DecKey = agentMessage.DecKey
			uUIDInfo.CallbackDecKey = agentMessage.DecKey
		}
		if agentMessage.ProcessName != "" {
			callback.ProcessName = agentMessage.ProcessName
			processPieces, err := utils.SplitFilePathGetHost(callback.ProcessName, "", []string{})
			if err != nil {
				logging.LogError(err, "failed to split out file path data")
			} else if len(processPieces.PathPieces) > 0 {
				callback.ProcessShortName = processPieces.PathPieces[len(processPieces.PathPieces)-1]
			}
		}
		if agentMessage.IPs != nil {
			if ipArrayBytes, err := json.Marshal(agentMessage.IPs); err != nil {
				logging.LogError(err, "Failed to marshal callback ip array")
				callback.IP = "[]"
			} else {
				callback.IP = string(ipArrayBytes)
			}
		}
		if agentMessage.IP != "" {
			callback.IP = "[\"" + agentMessage.IP + "\"]"
		}
		if agentMessage.ExternalIP != "" {
			callback.ExternalIp = agentMessage.ExternalIP
		} else if remoteIP != "" {
			callback.ExternalIp = remoteIP
		}
		if agentMessage.IntegrityLevel > 0 {
			callback.IntegrityLevel = agentMessage.IntegrityLevel
		}
		if agentMessage.Domain != "" {
			callback.Domain = agentMessage.Domain
		}
		if agentMessage.OS != "" {
			callback.Os = agentMessage.OS
		}
		if agentMessage.Architecture != "" {
			callback.Architecture = agentMessage.Architecture
		}
		if _, err := database.DB.NamedExec(`UPDATE callback SET 
            "user"=:user, host=:host, pid=:pid, extra_info=:extra_info, sleep_info=:sleep_info,
            enc_key=:enc_key, dec_key=:dec_key, process_name=:process_name, ip=:ip, external_ip=:external_ip,
            integrity_level=:integrity_level, "domain"=:domain, os=:os, architecture=:architecture,
            process_short_name=:process_short_name
			 WHERE id=:id`, callback); err != nil {
			response["status"] = "error"
			response["error"] = err.Error()
		} else {
			response["status"] = "success"
			response["id"] = uUIDInfo.UUID
		}
	}
	reflectBackOtherKeys(&response, &agentMessage.Other)
	return response, nil
}
