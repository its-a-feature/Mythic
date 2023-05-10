package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/mitchellh/mapstructure"
	amqp "github.com/rabbitmq/amqp091-go"
	"strings"
)

type MythicRPCCallbackCreateMessage struct {
	PayloadUUID    string   `json:"payload_uuid" mapstructure:"uuid"` // required
	C2ProfileName  string   `json:"c2_profile"`                       // required
	EncryptionKey  *[]byte  `json:"encryption_key" mapstructure:"enc_key"`
	DecryptionKey  *[]byte  `json:"decryption_key" mapstructure:"dec_key"`
	CryptoType     string   `json:"crypto_type"`
	User           string   `json:"user" mapstructure:"user"`
	Host           string   `json:"host" mapstructure:"host"`
	PID            int      `json:"pid" mapstructure:"pid"`
	ExtraInfo      string   `json:"extra_info"  mapstructure:"extra_info"`
	SleepInfo      string   `json:"sleep_info" mapstructure:"sleep_info"`
	Ip             string   `json:"ip" mapstructure:"ip"`
	IPs            []string `json:"ips" mapstructure:"ips"`
	ExternalIP     string   `json:"external_ip" mapstructure:"external_ip"`
	IntegrityLevel *int     `json:"integrity_level" mapstructure:"integrity_level"`
	Os             string   `json:"os" mapstructure:"os"`
	Domain         string   `json:"domain" mapstructure:"domain"`
	Architecture   string   `json:"architecture" mapstructure:"architecture"`
	Description    string   `json:"description"`
	ProcessName    string   `json:"process_name" mapstructure:"process_name"`
}
type MythicRPCCallbackCreateMessageResponse struct {
	Success      bool   `json:"success"`
	Error        string `json:"error"`
	CallbackUUID string `json:"callback_uuid"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_CREATE,
		RoutingKey: MYTHIC_RPC_CALLBACK_CREATE,
		Handler:    processMythicRPCCallbackCreate,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_CREATE
func MythicRPCCallbackCreate(input MythicRPCCallbackCreateMessage) MythicRPCCallbackCreateMessageResponse {
	response := MythicRPCCallbackCreateMessageResponse{
		Success: false,
	}
	callback := databaseStructs.Callback{
		AgentCallbackID: uuid.New().String(),
		User:            input.User,
		Host:            strings.ToUpper(input.Host),
		PID:             input.PID,
		ExtraInfo:       input.ExtraInfo,
		SleepInfo:       input.SleepInfo,
		EncKey:          input.EncryptionKey,
		DecKey:          input.DecryptionKey,
		Active:          true,
		ProcessName:     input.ProcessName,
	}
	if input.IPs == nil {
		input.IPs = []string{input.Ip}
	}
	if ipArrayBytes, err := json.Marshal(input.IPs); err != nil {
		logging.LogError(err, "Failed to marshal callback ip array")
		callback.IP = "[]"
	} else {
		callback.IP = string(ipArrayBytes)
	}
	callback.ExternalIp = input.ExternalIP
	if input.IntegrityLevel != nil {
		callback.IntegrityLevel = *input.IntegrityLevel
	} else {
		callback.IntegrityLevel = 2
	}
	if callback.Host == "" {
		callback.Host = "UNKNOWN"
	}
	callback.Os = input.Os
	callback.Domain = input.Domain
	callback.Architecture = input.Architecture
	callback.CryptoType = input.CryptoType
	payload := databaseStructs.Payload{}
	payloadCommands := []databaseStructs.Payloadcommand{}
	if err := database.DB.Get(&payload, `SELECT
	payload.id, payload.operator_id, payload.description, payload.callback_alert, 
	operator.username "operator.username",
	payloadtype.Name "payloadtype.name",
	operation.complete "operation.complete",
	operation.name "operation.name",
	operation.id "operation.id",
	operation.webhook "operation.webhook",
	operation.channel "operation.channel"
	FROM
	payload
	JOIN operation ON payload.operation_id = operation.id
	JOIN payloadtype ON payload.payload_type_id = payloadtype.id
	JOIN operator ON payload.operator_id = operator.id
	WHERE uuid=$1`, input.PayloadUUID); err != nil {
		logging.LogError(err, "Failed to find payload when calling MythicRPCCallbackCreate")
		response.Error = err.Error()
		return response
	} else if payload.Operation.Complete {
		logging.LogError(nil, "Operation is complete, but payload still trying to create callback", "payload_uuid", input.PayloadUUID)
		go SendAllOperationsMessage(fmt.Sprintf(
			"Operation %s is complete, but payload %s is still trying to create a callback via %s\n", payload.Operation.Name, payload.UuID, input.C2ProfileName),
			0, fmt.Sprintf("complete_operation_%s", payload.UuID), database.MESSAGE_LEVEL_WARNING)
		response.Error = "Operation is complete, but payload still trying to create callback"
		return response
	} else {
		callback.RegisteredPayloadID = payload.ID
		callback.OperationID = payload.Operation.ID
		callback.OperatorID = payload.OperatorID
		if input.Description == "" {
			callback.Description = payload.Description
		} else {
			callback.Description = input.Description
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO callback 
			( host, pid, ip, extra_info, sleep_info, external_ip, integrity_level, os, domain, architecture, process_name, registered_payload_id, 
				operation_id, enc_key, dec_key, operator_id, active, crypto_type, description, agent_callback_id, "user")
			VALUES ( :host, :pid, :ip, :extra_info, :sleep_info, :external_ip, :integrity_level, :os, :domain, :architecture, :process_name, :registered_payload_id, 
				:operation_id, :enc_key, :dec_key, :operator_id, :active, :crypto_type, :description, :agent_callback_id, :user) 
			RETURNING *`); err != nil {
			logging.LogError(err, "Failed to create callback in database in MythicRPCCallbackCreate")
			response.Error = err.Error()
			return response
		} else if err := statement.Get(&callback, callback); err != nil {
			logging.LogError(err, "Failed to get back callback ID after creating new entry in database")
			response.Error = err.Error()
			return response
		} else if err := database.DB.Select(&payloadCommands, `SELECT
		command_id, "version"
		FROM payloadcommand 
		WHERE payload_id=$1`, payload.ID); err != nil {
			logging.LogError(err, "Failed to get associated commands in payload when creating new callback in MythicRPCCallbackCreate")
			response.Error = err.Error()
			return response
		} else {
			for _, pc := range payloadCommands {
				if _, err := database.DB.Exec(`INSERT INTO loadedcommands
				(command_id, "version", callback_id, operator_id)
				VALUES ($1, $2, $3, $4)`,
					pc.CommandID, pc.Version, callback.ID, callback.OperatorID); err != nil {
					logging.LogError(err, "Failed to mark command as loaded into callback", "payloadcommand", pc)
				}
			}
			payloadC2Profiles := []databaseStructs.Payloadc2profiles{}
			payloadC2ProfileParameterInstances := []databaseStructs.C2profileparametersinstance{}
			if err := database.DB.Select(&payloadC2Profiles, `SELECT
			c2profile.id "c2profile.id",
			c2profile.is_p2p "c2profile.is_p2p",
			c2profile.name "c2profile.name"
			FROM payloadc2profiles
			JOIN c2profile ON payloadc2profiles.c2_profile_id = c2profile.id
			WHERE payloadc2profiles.payload_id=$1`, payload.ID); err != nil {
				logging.LogError(err, "Failed to get c2 profiles from payload")
				response.Error = err.Error()
				return response
			} else {
				for _, pc2p := range payloadC2Profiles {
					if err := database.DB.Select(&payloadC2ProfileParameterInstances, `SELECT
						* 
						FROM c2profileparametersinstance
						WHERE payload_id=$1 AND c2_profile_id=$2
						`, payload.ID, pc2p.C2profile.ID); err != nil {
						logging.LogError(err, "Failed to get c2 profile parameter instances from payload in MythicRPCCallbackCreate")
						response.Error = err.Error()
						return response
					} else if _, err := database.DB.Exec(`INSERT INTO callbackc2profiles
					(callback_id, c2_profile_id)
					VALUES ($1, $2)`, callback.ID, pc2p.C2profile.ID); err != nil {
						logging.LogError(err, "Failed to associate c2 profile with callback")
						response.Error = err.Error()
						return response
					}
					if !pc2p.C2profile.IsP2p {
						edge := databaseStructs.Callbackgraphedge{
							SourceID:      callback.ID,
							DestinationID: callback.ID,
							C2ProfileID:   pc2p.C2profile.ID,
							OperationID:   callback.OperationID,
							Metadata:      "",
						}
						if _, err := database.DB.NamedExec(`INSERT INTO callbackgraphedge
						(source_id, destination_id, c2_profile_id, operation_id, metadata)
						VALUES (:source_id, :destination_id, :c2_profile_id, :operation_id, :metadata)`, edge); err != nil {
							logging.LogError(err, "Failed to create new callbackgraphedge for egress c2 profile in MythicRPCCallbackCreate")
							response.Error = err.Error()
							return response
						} else {
							callbackGraph.Add(callback, callback, pc2p.C2profile.Name)
						}
					}
					for _, c2paraminstance := range payloadC2ProfileParameterInstances {
						c2Instance := databaseStructs.C2profileparametersinstance{
							C2ProfileParametersID: c2paraminstance.C2ProfileParametersID,
							C2ProfileID:           pc2p.C2profile.ID,
							Value:                 c2paraminstance.Value,
							EncKey:                c2paraminstance.EncKey,
							DecKey:                c2paraminstance.DecKey,
						}
						c2Instance.CallbackID.Int64 = int64(callback.ID)
						c2Instance.CallbackID.Valid = true
						c2Instance.OperationID.Int64 = int64(callback.OperationID)
						c2Instance.OperationID.Valid = true
						if _, err := database.DB.NamedExec(`INSERT INTO c2profileparametersinstance
						(c2_profile_parameters_id, c2_profile_id, "value", enc_key, dec_key, callback_id, operation_id)
						VALUES (:c2_profile_parameters_id, :c2_profile_id, :value, :enc_key, :dec_key, :callback_id, :operation_id)`, c2Instance); err != nil {
							logging.LogError(err, "Failed to create c2 profile parameter instance for new callback")
							response.Error = err.Error()
							return response
						}
						if callback.EncKey == nil && input.EncryptionKey == nil && input.C2ProfileName == pc2p.C2profile.Name && c2Instance.EncKey != nil {
							callback.EncKey = c2Instance.EncKey
							callback.DecKey = c2Instance.DecKey
							if _, err := database.DB.NamedExec(`UPDATE callback SET
							enc_key=:enc_key, dec_key=:dec_key
							WHERE id=:id`, callback); err != nil {
								logging.LogError(err, "Failed to update encryption/decryption keys for callback based on c2 profile data")
							} else {
								logging.LogDebug("Updated callback encryption keys", "enc_key", callback.EncKey, "dec_key", callback.DecKey)
							}
						}
					}
				}
				operationsMsg := fmt.Sprintf("New Callback (%d) %s@%s with pid %d", callback.DisplayID, callback.User, callback.Host, callback.PID)
				go SendAllOperationsMessage(operationsMsg, callback.OperationID, "", "info")
				// prep data to send for log messages and webhook messages
				webhookData := NewCallbackWebhookData{
					User:           callback.User,
					Host:           callback.Host,
					IPs:            callback.IP,
					Domain:         callback.Domain,
					ExternalIP:     callback.ExternalIp,
					ProcessName:    callback.ProcessName,
					PID:            callback.PID,
					Os:             callback.Os,
					Architecture:   callback.Architecture,
					AgentType:      payload.Payloadtype.Name,
					Description:    callback.Description,
					ExtraInfo:      callback.ExtraInfo,
					SleepInfo:      callback.SleepInfo,
					DisplayID:      callback.DisplayID,
					ID:             callback.ID,
					IntegrityLevel: callback.IntegrityLevel,
				}
				webhookMapData := map[string]interface{}{}
				if err := mapstructure.Decode(webhookData, &webhookMapData); err != nil {
					logging.LogError(err, "Failed to convert struct to map for sending callback webhook")
				}
				go emitCallbackLog(callback.ID)
				if payload.CallbackAlert {
					go RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
						OperationID:      callback.OperationID,
						OperationName:    payload.Operation.Name,
						OperationWebhook: payload.Operation.Webhook,
						OperationChannel: payload.Operation.Channel,
						OperatorUsername: payload.Operator.Username,
						Action:           WEBHOOK_TYPE_NEW_CALLBACK,
						Data:             webhookMapData,
					})
				}
				if _, err := database.DB.Exec(`INSERT INTO payloadonhost 
					(host, payload_id, operation_id) VALUES 
					($1, $2, $3)`,
					callback.Host, payload.ID, callback.OperationID); err != nil {
					logging.LogError(err, "Failed to register callback on host")
				}
				response.CallbackUUID = callback.AgentCallbackID
				response.Success = true
				return response
			}
		}
	}

}
func processMythicRPCCallbackCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackCreateMessage{}
	responseMsg := MythicRPCCallbackCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackCreate(incomingMessage)
	}
	return responseMsg
}
