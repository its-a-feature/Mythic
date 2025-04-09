package rabbitmq

import (
	"encoding/json"
	"github.com/mitchellh/mapstructure"
	"slices"
	"strings"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCallbackSearchMessage struct {
	AgentCallbackUUID            string    `json:"agent_callback_id"`
	AgentCallbackID              int       `json:"callback_id"`
	SearchCallbackID             *int      `json:"search_callback_id"`
	SearchCallbackDisplayID      *int      `json:"search_callback_display_id"`
	SearchCallbackUUID           *string   `json:"search_callback_uuid"`
	SearchCallbackUser           *string   `json:"user,omitempty"`
	SearchCallbackHost           *string   `json:"host,omitempty"`
	SearchCallbackPID            *int      `json:"pid,omitempty"`
	SearchCallbackExtraInfo      *string   `json:"extra_info,omitempty"`
	SearchCallbackSleepInfo      *string   `json:"sleep_info,omitempty"`
	SearchCallbackIP             *string   `json:"ip,omitempty"`
	SearchCallbackExternalIP     *string   `json:"external_ip,omitempty"`
	SearchCallbackIntegrityLevel *int      `json:"integrity_level,omitempty"`
	SearchCallbackOs             *string   `json:"os,omitempty"`
	SearchCallbackDomain         *string   `json:"domain,omitempty"`
	SearchCallbackArchitecture   *string   `json:"architecture,omitempty"`
	SearchCallbackDescription    *string   `json:"description,omitempty"`
	SearchCallbackPayloadTypes   *[]string `json:"payload_types,omitempty"`
}
type MythicRPCCallbackSearchMessageResult struct {
	ID                    int       `mapstructure:"id" json:"id"`
	DisplayID             int       `mapstructure:"display_id" json:"display_id"`
	AgentCallbackID       string    `mapstructure:"agent_callback_id" json:"agent_callback_id"`
	InitCallback          time.Time `mapstructure:"init_callback" json:"init_callback"`
	LastCheckin           time.Time `mapstructure:"last_checkin" json:"last_checkin"`
	User                  string    `mapstructure:"user" json:"user"`
	Host                  string    `mapstructure:"host" json:"host"`
	PID                   int       `mapstructure:"pid" json:"pid"`
	Ip                    string    `mapstructure:"ip" json:"ip"`
	ExternalIp            string    `mapstructure:"external_ip" json:"external_ip"`
	ProcessName           string    `mapstructure:"process_name" json:"process_name"`
	Description           string    `mapstructure:"description" json:"description"`
	OperatorID            int       `mapstructure:"operator_id" json:"operator_id"`
	Active                bool      `mapstructure:"active" json:"active"`
	Dead                  bool      `mapstructure:"dead" json:"dead"`
	RegisteredPayloadUUID string    `mapstructure:"registered_payload_uuid" json:"registered_payload_uuid"`
	PayloadType           string    `mapstructure:"payloadtype" json:"payloadtype"`
	IntegrityLevel        int       `mapstructure:"integrity_level" json:"integrity_level"`
	Locked                bool      `mapstructure:"locked" json:"locked"`
	LockedOperatorID      int       `mapstructure:"locked_operator_id" json:"locked_operator_id"`
	OperationID           int       `mapstructure:"operation_id" json:"operation_id"`
	CryptoType            string    `mapstructure:"crypto_type" json:"crypto_type"`
	DecKey                *[]byte   `mapstructure:"dec_key" json:"dec_key"`
	EncKey                *[]byte   `mapstructure:"enc_key" json:"enc_key"`
	Os                    string    `mapstructure:"os" json:"os"`
	Architecture          string    `mapstructure:"architecture" json:"architecture"`
	Domain                string    `mapstructure:"domain" json:"domain"`
	ExtraInfo             string    `mapstructure:"extra_info" json:"extra_info"`
	SleepInfo             string    `mapstructure:"sleep_info" json:"sleep_info"`
	Timestamp             time.Time `mapstructure:"timestamp" json:"timestamp"`
}
type MythicRPCCallbackSearchMessageResponse struct {
	Success bool                                   `json:"success"`
	Error   string                                 `json:"error"`
	Results []MythicRPCCallbackSearchMessageResult `json:"results"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CALLBACK_SEARCH,
		RoutingKey: MYTHIC_RPC_CALLBACK_SEARCH,
		Handler:    processMythicRPCCallbackSearch,
	})
}

// Endpoint: MYTHIC_RPC_CALLBACK_SEARCH
func MythicRPCCallbackSearch(input MythicRPCCallbackSearchMessage) MythicRPCCallbackSearchMessageResponse {
	response := MythicRPCCallbackSearchMessageResponse{
		Success: false,
	}
	searchResults := databaseStructs.Callback{}
	callback := databaseStructs.Callback{}
	err := database.DB.Get(&callback, `SELECT
		operation_id
		FROM callback
		WHERE agent_callback_id=$1 OR id=$2`, input.AgentCallbackUUID, input.AgentCallbackID)
	if err != nil {
		logging.LogError(err, "Failed to find callback UUID")
		response.Error = err.Error()
		return response
	}
	targetCallback := databaseStructs.Callback{
		OperationID: callback.OperationID,
	}
	if input.SearchCallbackID != nil {
		targetCallback.ID = *input.SearchCallbackID
	}
	if input.SearchCallbackUUID != nil {
		targetCallback.AgentCallbackID = *input.SearchCallbackUUID
	}
	if input.SearchCallbackDisplayID != nil {
		targetCallback.DisplayID = *input.SearchCallbackDisplayID
	}
	searchString := `SELECT 
    		callback.*,
    		payload.uuid "payload.uuid",
    		payloadtype.name "payload.payloadtype.name"
			FROM callback 
			JOIN payload on callback.registered_payload_id = payload.id
			JOIN payloadtype on payload.payload_type_id = payloadtype.id
			WHERE callback.operation_id=:operation_id `
	// if we're not actually searching for another callback, just set ours
	if input.SearchCallbackDisplayID != nil || input.SearchCallbackID != nil || input.SearchCallbackUUID != nil {
		searchString += ` AND (callback.id=:id OR
			callback.agent_callback_id=:agent_callback_id OR
			callback.display_id=:display_id)`
	}
	if input.SearchCallbackUser != nil {
		targetCallback.User = *input.SearchCallbackUser
		searchString += `AND user=:user `
	}
	if input.SearchCallbackHost != nil {
		targetCallback.Host = strings.ToUpper(*input.SearchCallbackHost)
		if targetCallback.Host == "" {
			targetCallback.Host = "UNKNOWN"
		}
		searchString += `AND host=:host `
	}
	if input.SearchCallbackPID != nil {
		targetCallback.PID = *input.SearchCallbackPID
		searchString += `AND pid=:pid `
	}
	if input.SearchCallbackIP != nil {
		targetCallback.IP = *input.SearchCallbackIP
		searchString += `AND ip ILIKE :ip `
	}
	if input.SearchCallbackExtraInfo != nil {
		targetCallback.ExtraInfo = *input.SearchCallbackExtraInfo
		searchString += `AND extra_info ILIKE :extra_info `
	}
	if input.SearchCallbackSleepInfo != nil {
		targetCallback.SleepInfo = *input.SearchCallbackSleepInfo
		searchString += `AND sleep_info ILIKE :sleep_info `
	}
	if input.SearchCallbackExternalIP != nil {
		targetCallback.ExternalIp = *input.SearchCallbackExternalIP
		searchString += `AND external_ip ILIKE :external_ip `
	}
	if input.SearchCallbackIntegrityLevel != nil {
		targetCallback.IntegrityLevel = *input.SearchCallbackIntegrityLevel
		searchString += `AND integrity_level=:integrity_level `
	}
	if input.SearchCallbackOs != nil {
		targetCallback.Os = *input.SearchCallbackOs
		searchString += `AND callback.os ILIKE :os `
	}
	if input.SearchCallbackDomain != nil {
		targetCallback.Domain = *input.SearchCallbackDomain
		searchString += `AND domain ILIKE :domain `
	}
	if input.SearchCallbackArchitecture != nil {
		targetCallback.Architecture = *input.SearchCallbackArchitecture
		searchString += `AND architecture ILIKE :architecture`
	}
	if input.SearchCallbackDescription != nil {
		targetCallback.Description = *input.SearchCallbackDescription
		searchString += `AND callback.description ILIKE :description`
	}
	searchString += " ORDER BY callback.id DESC"
	rows, err := database.DB.NamedQuery(searchString, targetCallback)
	if err != nil {
		logging.LogError(err, "Failed to search callback information")
		response.Error = err.Error()
		return response
	}
	for rows.Next() {
		result := MythicRPCCallbackSearchMessageResult{}
		err = rows.StructScan(&searchResults)
		if err != nil {
			logging.LogError(err, "Failed to get row from callbacks for search")
			continue
		}
		err = mapstructure.Decode(searchResults, &result)
		if err != nil {
			logging.LogError(err, "Failed to map callback search results into array")
			response.Error = err.Error()
			return response
		}
		if input.SearchCallbackPayloadTypes != nil && len(*input.SearchCallbackPayloadTypes) > 0 {
			if !slices.Contains(*input.SearchCallbackPayloadTypes, searchResults.Payload.Payloadtype.Name) {
				continue
			}
		}
		result.RegisteredPayloadUUID = searchResults.Payload.UuID
		result.LockedOperatorID = int(searchResults.LockedOperatorID.Int64)
		result.PayloadType = searchResults.Payload.Payloadtype.Name
		response.Results = append(response.Results, result)

	}
	response.Success = true
	return response
}
func processMythicRPCCallbackSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCallbackSearchMessage{}
	responseMsg := MythicRPCCallbackSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCallbackSearch(incomingMessage)
	}
	return responseMsg
}
