package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/utils"
	"strings"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackUpdateMessage struct {
	AgentCallbackUUID                 *string   `json:"agent_callback_id"` // required
	CallbackID                        *int      `json:"callback_id"`
	TaskID                            *int      `json:"task_id"`
	EncryptionKey                     *[]byte   `json:"encryption_key,omitempty"`
	DecryptionKey                     *[]byte   `json:"decryption_key,omitempty"`
	CryptoType                        *string   `json:"crypto_type,omitempty"`
	User                              *string   `json:"user,omitempty"`
	Host                              *string   `json:"host,omitempty"`
	PID                               *int      `json:"pid,omitempty"`
	ExtraInfo                         *string   `json:"extra_info,omitempty"`
	SleepInfo                         *string   `json:"sleep_info,omitempty"`
	Ip                                *string   `json:"ip,omitempty"`
	IPs                               *[]string `json:"ips,omitempty"`
	ExternalIP                        *string   `json:"external_ip,omitempty"`
	IntegrityLevel                    *int      `json:"integrity_level,omitempty"`
	Os                                *string   `json:"os,omitempty"`
	Domain                            *string   `json:"domain,omitempty"`
	Architecture                      *string   `json:"architecture,omitempty"`
	Description                       *string   `json:"description,omitempty"`
	ProcessName                       *string   `json:"process_name,omitempty"`
	Cwd                               *string   `json:"cwd,omitempty"`
	ImpersonationContext              *string   `json:"impersonation_context,omitempty"`
	UpdateLastCheckinTime             *bool     `json:"update_last_checkin_time,omitempty"`
	UpdateLastCheckinTimeViaC2Profile *string   `json:"update_last_checkin_time_via_c2_profile,omitempty"`
}
type MythicRPCCallbackUpdateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_UPDATE,
		RoutingKey: MYTHIC_RPC_CALLBACK_UPDATE,
		Handler:    processMythicRPCCallbackUpdate,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_UPDATE
func MythicRPCCallbackUpdate(input MythicRPCCallbackUpdateMessage) MythicRPCCallbackUpdateMessageResponse {
	response := MythicRPCCallbackUpdateMessageResponse{
		Success: false,
	}
	callback := databaseStructs.Callback{}
	if input.AgentCallbackUUID != nil {
		if err := database.DB.Get(&callback, `SELECT
			*
			FROM callback
			WHERE agent_callback_id=$1`, input.AgentCallbackUUID); err != nil {
			logging.LogError(err, "Failed to find callback UUID")
			response.Error = err.Error()
			return response
		}
	} else if input.CallbackID != nil {
		if err := database.DB.Get(&callback, `SELECT
			*
			FROM callback
			WHERE id=$1`, input.CallbackID); err != nil {
			logging.LogError(err, "Failed to find callback ID")
			response.Error = err.Error()
			return response
		}
	} else if input.TaskID != nil {
		if err := database.DB.Get(&callback, `SELECT 
			callback.*
			FROM callback
			JOIN task on task.callback_id = callback.id
			WHERE task.id=$1`, *input.TaskID); err != nil {
			logging.LogError(err, "failed to get callback information from task")
			response.Error = err.Error()
			return response
		}
	} else {
		logging.LogError(nil, "Must supply task or callback information to update callback")
		response.Error = fmt.Sprintf("must supply TaskId, CallbackId, or AgentCallbackUUID")
		return response
	}

	if input.User != nil {
		callback.User = *input.User
	}
	if input.Host != nil {
		callback.Host = strings.ToUpper(*input.Host)
		if callback.Host == "" {
			callback.Host = "UNKNOWN"
		}
	}
	if input.PID != nil {
		callback.PID = *input.PID
	}
	if input.Ip != nil {
		callback.IP = "[\"" + *input.Ip + "\"]"
	}
	if input.IPs != nil {
		if ipArrayBytes, err := json.Marshal(*input.IPs); err != nil {
			logging.LogError(err, "Failed to marshal callback ip array")
			callback.IP = "[]"
		} else {
			callback.IP = string(ipArrayBytes)
		}
	}
	if input.ExtraInfo != nil {
		callback.ExtraInfo = *input.ExtraInfo
	}
	if input.SleepInfo != nil {
		callback.SleepInfo = *input.SleepInfo
	}
	if input.EncryptionKey != nil {
		callback.EncKey = input.EncryptionKey
	}
	if input.DecryptionKey != nil {
		callback.DecKey = input.DecryptionKey
	}
	if input.CryptoType != nil {
		callback.CryptoType = *input.CryptoType
	}
	if input.ExternalIP != nil {
		callback.ExternalIp = *input.ExternalIP
	}
	if input.IntegrityLevel != nil {
		callback.IntegrityLevel = *input.IntegrityLevel
	}
	if input.Os != nil {
		callback.Os = *input.Os
	}
	if input.Domain != nil {
		callback.Domain = *input.Domain
	}
	if input.Architecture != nil {
		callback.Architecture = *input.Architecture
	}
	if input.Description != nil {
		callback.Description = *input.Description
	}
	if input.ProcessName != nil {
		callback.ProcessName = *input.ProcessName
		processPieces, err := utils.SplitFilePathGetHost(callback.ProcessName, "", []string{})
		if err != nil {
			logging.LogError(err, "failed to split out file path data")
		} else if len(processPieces.PathPieces) > 0 {
			callback.ProcessShortName = processPieces.PathPieces[len(processPieces.PathPieces)-1]
		}
	}
	if input.Cwd != nil {
		callback.Cwd = *input.Cwd
	}
	if input.ImpersonationContext != nil {
		callback.ImpersonationContext = *input.ImpersonationContext
	}
	if _, err := database.DB.NamedExec(`UPDATE callback SET
		"user"=:user, host=:host, pid=:pid, ip=:ip, extra_info=:extra_info, sleep_info=:sleep_info, enc_key=:enc_key, dec_key=:dec_key, 
		crypto_type=:crypto_type, external_ip=:external_ip, integrity_level=:integrity_level, os=:os, domain=:domain, architecture=:architecture, 
		description=:description, process_name=:process_name, process_short_name=:process_short_name, cwd=:cwd,
		impersonation_context=:impersonation_context
		WHERE id=:id`, callback); err != nil {
		logging.LogError(err, "Failed to update callback information")
		response.Error = err.Error()
		return response
	}
	if input.UpdateLastCheckinTime != nil && *input.UpdateLastCheckinTime {
		callback.LastCheckin = time.Now().UTC()
		if input.UpdateLastCheckinTimeViaC2Profile == nil || *input.UpdateLastCheckinTimeViaC2Profile == "" {
			_, err := database.DB.NamedExec(`UPDATE callback SET last_checkin=:last_checkin WHERE id=:id`, callback)
			if err != nil {
				response.Success = false
				response.Error = err.Error()
				return response
			}
			response.Success = true
			return response
		}
		_, err := LookupEncryptionData(*input.UpdateLastCheckinTimeViaC2Profile, callback.AgentCallbackID, true)
		if err != nil {
			response.Success = false
			response.Error = err.Error()
			return response
		}
	}
	response.Success = true
	return response

}
func processMythicRPCCallbackUpdate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackUpdateMessage{}
	responseMsg := MythicRPCCallbackUpdateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackUpdate(incomingMessage)
	}
	return responseMsg
}
