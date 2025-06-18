package rabbitmq

import (
	"database/sql"
	"encoding/base64"
	"encoding/json"
	"encoding/xml"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/mitchellh/mapstructure"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

const (
	UUIDTYPECALLBACK               = "callback"
	UUIDTYPEPAYLOAD                = "payload"
	UUIDTYPESTAGING                = "staging"
	CRYPTO_LOCATION_CALLBACK       = "callback"
	CRYPTO_LOCATION_STAGING        = "staging"
	CRYPTO_LOCATION_C2             = "c2"
	CRYPTO_LOCATION_PAYLOAD        = "payload"
	CALLBACK_MESSAGE_KEY_RESPONSES = "responses"
	CALLBACK_MESSAGE_KEY_EDGES     = "edges"
	CALLBACK_MESSAGE_KEY_DELEGATES = "delegates"
	CALLBACK_MESSAGE_KEY_ALERTS    = "alerts"
)

type AgentMessageRawInput struct {
	RawMessage        *[]byte
	Base64Message     *[]byte
	C2Profile         string
	RemoteIP          string
	Base64Response    bool
	UpdateCheckinTime bool
	TrackingID        string
}

type cachedUUIDInfo struct {
	UUID                         string
	UUIDType                     string // payload, callback, staging
	C2ProfileName                string
	C2ProfileID                  int
	TranslationContainerID       int
	TranslationContainerName     string
	MythicEncrypts               bool
	CryptoType                   string
	C2EncKey                     *[]byte
	C2DecKey                     *[]byte
	PayloadEncKey                *[]byte
	PayloadDecKey                *[]byte
	CallbackEncKey               *[]byte
	CallbackDecKey               *[]byte
	StagingEncKey                *[]byte
	StagingDecKey                *[]byte
	SuccessfulEncKeyOpt          *[]byte // if there are multiple options, track which one worked
	SuccessfulDecKeyOpt          *[]byte // if there are multiple options, track which one worked
	IsP2P                        bool
	PayloadID                    int
	PayloadTypeID                int
	PayloadTypeName              string
	PayloadTypeMessageFormat     string
	PayloadTypeMessageUUIDLength int
	LastCheckinTime              time.Time
	CallbackID                   int `json:"callback_id" db:"callback_id"`
	CallbackDisplayID            int `json:"callback_display_id" db:"display_id"`
	OperationID                  int `json:"operation_id" db:"operation_id"`
	// Active - tracking if the callback is active or not in a cached way
	Active                     bool
	TriggerOnCheckinAfterTime  int  `json:"trigger_on_checkin_after_time"`
	CallbackAllowedFromPayload bool `json:"callback_allowed_from_payload"`
	// EdgeId - tracking the edge id for this callback to make sure it's updated as needed
	EdgeId int
}

func (cache *cachedUUIDInfo) getAllKeys() []mythicCrypto.CryptoKeys {
	switch cache.UUIDType {
	case UUIDTYPECALLBACK:
		return []mythicCrypto.CryptoKeys{
			{
				EncKey:   cache.CallbackEncKey,
				DecKey:   cache.CallbackDecKey,
				Value:    cache.CryptoType,
				Location: CRYPTO_LOCATION_CALLBACK,
			},
		}
	case UUIDTYPESTAGING:
		return []mythicCrypto.CryptoKeys{
			{
				EncKey:   cache.StagingEncKey,
				DecKey:   cache.StagingDecKey,
				Value:    cache.CryptoType,
				Location: CRYPTO_LOCATION_STAGING,
			},
		}
	case UUIDTYPEPAYLOAD:
		options := []mythicCrypto.CryptoKeys{}
		if cache.C2EncKey != nil {
			options = append(options, mythicCrypto.CryptoKeys{
				EncKey:   cache.C2EncKey,
				DecKey:   cache.C2DecKey,
				Value:    cache.CryptoType,
				Location: CRYPTO_LOCATION_C2,
			})
		}
		if cache.PayloadEncKey != nil {
			options = append(options, mythicCrypto.CryptoKeys{
				EncKey:   cache.PayloadEncKey,
				DecKey:   cache.PayloadDecKey,
				Value:    cache.CryptoType,
				Location: CRYPTO_LOCATION_PAYLOAD,
			})
		}
		return options
	default:
		logging.LogError(nil, "Unknown cache.UUIDType when getting all keys", "uuidtype", cache.UUIDType)
		return nil
	}
}
func (cache *cachedUUIDInfo) IterateAndAct(agentMessage *[]byte, action string) (*[]byte, error) {
	keyOptions := cache.getAllKeys()
	var err error
	err = nil
	modified := agentMessage
	for _, keyOpt := range keyOptions {
		switch strings.ToLower(keyOpt.Value) {
		case "aes256_hmac":
			if action == "decrypt" {
				keyToUse := keyOpt.DecKey
				if cache.SuccessfulDecKeyOpt != nil {
					keyToUse = cache.SuccessfulDecKeyOpt
				}
				if modified, err = mythicCrypto.DecryptAES256HMAC(*keyToUse, agentMessage); err == nil {
					// we successfully decrypted, so return
					// track the key actually used so that when we encrypt for the return message we can use the right one
					//logging.LogDebug("setting uuidInfo successfulDecKeyOpt")
					cache.SuccessfulDecKeyOpt = keyToUse
					cache.SuccessfulEncKeyOpt = keyToUse
					//logging.LogDebug("just updated uuindInfo", "updated cache", cache)
					return modified, err
				}
			} else if action == "encrypt" {
				//logging.LogDebug("encrypting", "current cache", cache)
				keyToUse := keyOpt.EncKey
				if cache.SuccessfulEncKeyOpt != nil {
					keyToUse = cache.SuccessfulEncKeyOpt
				}
				//logging.LogDebug("Encrypting message", "key", hex.EncodeToString(*keyToUse))

				modified, err = mythicCrypto.EncryptAES256HMAC(*keyToUse, agentMessage)
				if err == nil {
					// we successfully encrypted, so return
					cache.SuccessfulDecKeyOpt = keyToUse
					cache.SuccessfulEncKeyOpt = keyToUse
					//logging.LogDebug("Encrypted message", "output", hex.EncodeToString(modified))
					return modified, err
				}
			} else {
				err := errors.New(fmt.Sprintf("Unknown action for aes256_hmac: %s", action))
				logging.LogError(err, "Failed IterateAndAct for an aes256_hmac key")
				return nil, err
			}
		case "none":
			return modified, nil
		default:
			err = errors.New(fmt.Sprintf("Unknown action for IterateAndAct: %s", action))
			logging.LogError(err, "Failed to determine type of crypto")
			return nil, err
		}
	}
	return modified, err
}

var cachedUUIDInfoMapMutex = &sync.Mutex{}

func InvalidateAllCachedUUIDInfo() {
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	cachedUUIDInfoMap = make(map[string]*cachedUUIDInfo)
}

func InvalidateCachedUUIDInfo(uuid string) {
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	for key, _ := range cachedUUIDInfoMap {
		if strings.HasPrefix(key, uuid) {
			delete(cachedUUIDInfoMap, key)
		}
	}
}

var cachedUUIDInfoMap = make(map[string]*cachedUUIDInfo)

func MarkCallbackInfoInactive(callbackID int) {
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	for k, _ := range cachedUUIDInfoMap {
		if cachedUUIDInfoMap[k].CallbackID == callbackID {
			cachedUUIDInfoMap[k].Active = false
			cachedUUIDInfoMap[k].EdgeId = 0
		}
	}
}
func UpdateCallbackInfoTriggerOnCheckin(callbackID int, triggerOnCheckinAfterTime int) {
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	for k, _ := range cachedUUIDInfoMap {
		if cachedUUIDInfoMap[k].CallbackID == callbackID {
			cachedUUIDInfoMap[k].TriggerOnCheckinAfterTime = triggerOnCheckinAfterTime
			return
		}
	}
}
func UpdatePayloadInfoCallbackAllowed(payloadID int, callbackAllowed bool) {
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	for k, _ := range cachedUUIDInfoMap {
		if cachedUUIDInfoMap[k].PayloadID == payloadID && cachedUUIDInfoMap[k].UUIDType == UUIDTYPEPAYLOAD {
			cachedUUIDInfoMap[k].CallbackAllowedFromPayload = callbackAllowed
			return
		}
	}
}

// this is coming in from an agent in the delegates field
type delegateMessage struct {
	Message       string `json:"message" mapstructure:"message" xml:"message"`
	SuppliedUuid  string `json:"uuid" mapstructure:"uuid" xml:"uuid"`
	C2ProfileName string `json:"c2_profile" mapstructure:"c2_profile" xml:"c2_profile"`
}

// this is what mythic is sending back in the delegates field
type delegateMessageResponse struct {
	Message       string `json:"message" mapstructure:"message" xml:"message"`
	SuppliedUuid  string `json:"uuid,omitempty" mapstructure:"uuid,omitempty" xml:"uuid,omitempty"`
	C2ProfileName string `json:"c2_profile" mapstructure:"c2_profile" xml:"c2_profile"`
	MythicUuid    string `json:"mythic_uuid,omitempty" mapstructure:"mythic_uuid,omitempty" xml:"mythic_uuid,omitempty"`
	NewUuid       string `json:"new_uuid,omitempty" mapstructure:"new_uuid,omitempty" xml:"new_uuid,omitempty"`
}

// flow:
/*
1. Get agent message
2. Base64 decode agent message
3. parse out UUID and body
4. Look up UUID to see if payload, callback, or staging piece
4. a. look up associated payload type
4. b. send off to translation container for processing if needed
5. look at "action" and process message
6. get response from processing the action
7. encrypt response (or send to translation container for processing if needed)
8. add UUID and base64 encode message
9. return message response
*/

type recursiveProcessAgentMessageResponse struct {
	Message             []byte
	NewCallbackUUID     string
	OuterUuid           string
	OuterUuidIsCallback bool
	Err                 error
	TrackingID          string
	AgentUUIDSize       int
}

func unmarshalMessageForAgentFormat(uuidInfo *cachedUUIDInfo, messageBytes *[]byte, output *map[string]interface{}) error {
	switch uuidInfo.PayloadTypeMessageFormat {
	case "json":
		return json.Unmarshal(*messageBytes, output)
	case "xml":
		return xml.Unmarshal(*messageBytes, output)
	}
	return errors.New("unknown message format for agent")
}

func marshalMessageForAgentFormat(uuidInfo *cachedUUIDInfo, agentMessage map[string]interface{}) ([]byte, error) {
	switch uuidInfo.PayloadTypeMessageFormat {
	case "json":
		return json.Marshal(agentMessage)
	case "xml":
		return xml.Marshal(agentMessage)
	}
	return nil, errors.New("unknown message format for agent")
}

func processAgentMessageContent(agentMessageInput *AgentMessageRawInput, uuidInfo *cachedUUIDInfo, decryptedMessage map[string]interface{}, instanceResponse *recursiveProcessAgentMessageResponse) map[string]interface{} {
	instanceResponse.OuterUuid = uuidInfo.UUID
	var err error
	response := make(map[string]interface{})
	if _, ok := decryptedMessage["action"]; !ok {
		errorMessage := fmt.Sprintf("Missing action in message:\n%s\n", decryptedMessage)
		errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
		instanceResponse.Err = errors.New(errorMessage)
		return response
	}
	if utils.MythicConfig.DebugAgentMessage {
		if stringMsg, err := json.MarshalIndent(decryptedMessage, "", "  "); err != nil {
			logging.LogError(err, "Failed to convert JSON to string for debug printing")
		} else {
			logging.LogDebug("Parsing agent message", "step 3", decryptedMessage)
			SendAllOperationsMessage(fmt.Sprintf("Parsing agent message - step 3 (decrypted and parsed JSON): \n%s",
				string(stringMsg)),
				uuidInfo.OperationID, "debug", database.MESSAGE_LEVEL_DEBUG)
		}
	}
	delegateResponses := []delegateMessageResponse{}
	getDelegateMessages := true // by default, we want to always get all delegate messages that are available
	switch decryptedMessage["action"] {
	case "checkin":
		{
			response, err = handleAgentMessageCheckin(&decryptedMessage, uuidInfo, agentMessageInput.RemoteIP)
			if err == nil {
				instanceResponse.NewCallbackUUID = response["id"].(string)
				instanceResponse.OuterUuid = uuidInfo.UUID
			}
		}
	case "get_tasking":
		{
			response, err = handleAgentMessageGetTasking(&decryptedMessage, uuidInfo.CallbackID)
			instanceResponse.OuterUuid = uuidInfo.UUID // this is what our message UUID was coming into this parsing
			if getDelegateTasks, ok := decryptedMessage["get_delegate_tasks"]; !ok || getDelegateTasks.(bool) {
				// this means we should try to get some delegated tasks if they exist for our callback
				delegateResponses = append(delegateResponses, getDelegateTaskMessages(uuidInfo.CallbackID, instanceResponse.AgentUUIDSize, agentMessageInput.UpdateCheckinTime)...)
			} else {
				// if the agent is doing a get_tasking and explicitly asking to not get delegate messages, then don't get any, even for proxy data
				getDelegateMessages = false
			}
			delete(decryptedMessage, "get_delegate_tasks")
		}
	case "upload":
		{
			go SendAllOperationsMessage(fmt.Sprintf("Agent %s is using deprecated method of file transfer with the 'upload' action.", uuidInfo.PayloadTypeName),
				uuidInfo.OperationID, "debug", database.MESSAGE_LEVEL_DEBUG)
			logging.LogError(nil, "deprecated form of upload detected, please update agent code to use new method")
			response, err = handleAgentMessagePostResponse(&map[string]interface{}{
				"action": "post_response",
				"responses": []map[string]interface{}{
					{
						"task_id": decryptedMessage["task_id"],
						"upload":  decryptedMessage,
					},
				},
			}, uuidInfo)
			uploadResponse := response["responses"].([]map[string]interface{})
			response = uploadResponse[0]
		}
	case "post_response":
		{
			response, err = handleAgentMessagePostResponse(&decryptedMessage, uuidInfo)
			instanceResponse.OuterUuid = uuidInfo.UUID // this is what our message UUID was coming into this parsing
		}
	case "update_info":
		{
			response, err = handleAgentMessageUpdateInfo(&decryptedMessage, uuidInfo, agentMessageInput.RemoteIP)
			instanceResponse.OuterUuid = uuidInfo.UUID // this is what our message UUID was coming into this parsing
		}
	case "staging_rsa":
		{
			response, err = handleAgentMessageStagingRSA(&decryptedMessage, uuidInfo)
			/*
				if err == nil {
					outerUUID = response["uuid"].(string)
				}
			*/
		}
	case "staging_translation":
		{
			finalBytes, err := handleAgentMessageStagingTranslation(&decryptedMessage, uuidInfo)
			if err != nil {
				logging.LogError(err, "Failed to handle translation staging function")
				instanceResponse.Err = err
				return response
			}
			instanceResponse.Message = *finalBytes
			return response

		}
	default:
		{
			logging.LogError(nil, "Unknown action in message from agent", "action", decryptedMessage["action"])
			err = errors.New("unknown action in message from agent")
		}
	}
	if err != nil {
		logging.LogError(err, "Failed to process message from Mythic")
		instanceResponse.Err = err
		return response
	}
	//logging.LogInfo("decrypted message after post response", "decrypted", decryptedMessage)
	if _, ok := decryptedMessage[CALLBACK_MESSAGE_KEY_RESPONSES]; ok {
		// this means we got response data outside the post_response key, so handle it
		if postResponseMap, postResponseMapErr := handleAgentMessagePostResponse(&decryptedMessage, uuidInfo); postResponseMapErr != nil {
			logging.LogError(err, "Failed to process 'responses' key in non-standard action")
			response["status"] = "error"
		} else {
			for key, val := range postResponseMap {
				response[key] = val
			}
		}
	}
	if _, ok := decryptedMessage[CALLBACK_MESSAGE_KEY_EDGES]; ok {
		// this means we have some sort of add/remove announcement
		edges := []agentMessagePostResponseEdges{}
		if err := mapstructure.Decode(decryptedMessage[CALLBACK_MESSAGE_KEY_EDGES], &edges); err != nil {
			logging.LogError(err, "Failed to process out edge information")
		} else {
			go handleAgentMessagePostResponseEdges(uuidInfo, &edges)
		}
	}
	if _, ok := decryptedMessage[CALLBACK_MESSAGE_KEY_DELEGATES]; ok {
		// this means we have some delegate messages to process recursively
		delegates := []delegateMessage{}
		if err := mapstructure.Decode(decryptedMessage[CALLBACK_MESSAGE_KEY_DELEGATES], &delegates); err != nil {
			logging.LogError(err, "Failed to parse delegate messages")
		} else {
			for _, delegate := range delegates {
				if utils.MythicConfig.DebugAgentMessage {
					logging.LogDebug("Parsing agent message", "step 7", delegate)
					SendAllOperationsMessage(fmt.Sprintf("Parsing agent message - step 7 (delegate messages): \n%v", delegate),
						uuidInfo.OperationID, "debug", database.MESSAGE_LEVEL_DEBUG)
				}
				currentDelegateMessage := AgentMessageRawInput{
					C2Profile: delegate.C2ProfileName,
					RemoteIP:  agentMessageInput.RemoteIP,
				}
				currentDelegateMessageBytes := []byte(delegate.Message)
				currentDelegateMessage.Base64Message = &currentDelegateMessageBytes
				if delegateResponse := recursiveProcessAgentMessage(&currentDelegateMessage); delegateResponse.Err != nil {
					logging.LogError(delegateResponse.Err, "Failed to process delegate message")
				} else {
					newResponse := delegateMessageResponse{
						Message:       string(delegateResponse.Message),
						C2ProfileName: delegate.C2ProfileName,
						SuppliedUuid:  delegate.SuppliedUuid,
					}
					if delegateResponse.NewCallbackUUID != "" && delegateResponse.NewCallbackUUID != delegate.SuppliedUuid {
						newResponse.MythicUuid = delegateResponse.NewCallbackUUID
						newResponse.NewUuid = delegateResponse.NewCallbackUUID
						// we got an implicit new callback relationship, mark it
						go callbackGraph.AddByAgentIds(instanceResponse.OuterUuid, delegateResponse.NewCallbackUUID, delegate.C2ProfileName)
					} else {
						if delegateResponse.OuterUuid != "" && delegateResponse.OuterUuid != delegate.SuppliedUuid {
							newResponse.MythicUuid = delegateResponse.OuterUuid
							newResponse.NewUuid = delegateResponse.OuterUuid
						} else {
							newResponse.SuppliedUuid = delegate.SuppliedUuid
						}
						go callbackGraph.AddByAgentIds(instanceResponse.OuterUuid, delegateResponse.OuterUuid, delegate.C2ProfileName)
					}
					//go callbackGraph.AddByAgentIds(outerUUID, delegateResponse.OuterUuid, delegate.C2ProfileName)
					delegateResponses = append(delegateResponses, newResponse)
				}
			}
		}
	}
	if _, ok := decryptedMessage[CALLBACK_MESSAGE_KEY_ALERTS]; ok {
		alerts := []agentMessagePostResponseAlert{}
		if err := mapstructure.Decode(decryptedMessage[CALLBACK_MESSAGE_KEY_ALERTS], &alerts); err != nil {
			logging.LogError(err, "Failed to parse alert messages")
		} else {
			go handleAgentMessagePostResponseAlerts(uuidInfo.OperationID, uuidInfo.CallbackID, uuidInfo.CallbackDisplayID, &alerts)
		}
	}
	if _, ok := decryptedMessage[CALLBACK_PORT_TYPE_SOCKS]; ok {
		socksMessages := []proxyFromAgentMessage{}
		//logging.LogDebug("got socks data from agent", "data", decryptedMessage[CALLBACK_PORT_TYPE_SOCKS])
		if err = mapstructure.Decode(decryptedMessage[CALLBACK_PORT_TYPE_SOCKS], &socksMessages); err != nil {
			logging.LogError(err, "Failed to convert agent socks message to proxyFromAgentMessage struct")
		} else {
			//logging.LogDebug("got socks data from agent mapped into struct", "data", socksMessages)
			proxyPorts.SendDataToCallbackIdPortType(uuidInfo.CallbackID, CALLBACK_PORT_TYPE_SOCKS, socksMessages)
		}
	}
	if _, ok := decryptedMessage[CALLBACK_PORT_TYPE_RPORTFWD]; ok {
		rpfwdMessages := []proxyFromAgentMessage{}
		if err = mapstructure.Decode(decryptedMessage[CALLBACK_PORT_TYPE_RPORTFWD], &rpfwdMessages); err != nil {
			logging.LogError(err, "Failed to convert agent socks message to proxyFromAgentMessage struct")
		} else {
			//logging.LogDebug("got rpfwd data from agent mapped into struct", "data", socksMessages)
			proxyPorts.SendDataToCallbackIdPortType(uuidInfo.CallbackID, CALLBACK_PORT_TYPE_RPORTFWD, rpfwdMessages)
		}
	}
	if _, ok := decryptedMessage[CALLBACK_PORT_TYPE_INTERACTIVE]; ok {
		interactiveMessages := []agentMessagePostResponseInteractive{}
		if err = mapstructure.Decode(decryptedMessage[CALLBACK_PORT_TYPE_INTERACTIVE], &interactiveMessages); err != nil {
			logging.LogError(err, "Failed to convert agent interactive message to agentMessagePostResponseInteractive")
		} else {
			proxyPorts.SendInteractiveDataToCallbackIdPortType(uuidInfo.CallbackID, CALLBACK_PORT_TYPE_INTERACTIVE, interactiveMessages)
		}
	}
	// regardless of the message type, get proxy data if it exists (for both socks and rpfwd)
	if getDelegateMessages {
		delegateResponses = append(delegateResponses, getDelegateProxyMessages(uuidInfo.CallbackID, instanceResponse.AgentUUIDSize, agentMessageInput.UpdateCheckinTime)...)
	}
	if len(delegateResponses) > 0 {
		response["delegates"] = delegateResponses
	}
	// get first order proxy data not for delegate callbacks
	if proxyData, err := proxyPorts.GetDataForCallbackIdPortType(uuidInfo.CallbackID, CALLBACK_PORT_TYPE_SOCKS); err != nil {
		logging.LogError(err, "Failed to get proxy data")
	} else if proxyData != nil {
		response[CALLBACK_PORT_TYPE_SOCKS] = proxyData
	}
	if proxyData, err := proxyPorts.GetDataForCallbackIdPortType(uuidInfo.CallbackID, CALLBACK_PORT_TYPE_RPORTFWD); err != nil {
		logging.LogError(err, "Failed to get proxy data")
	} else if proxyData != nil {
		response[CALLBACK_PORT_TYPE_RPORTFWD] = proxyData
	}
	if proxyData, err := proxyPorts.GetDataForCallbackIdPortType(uuidInfo.CallbackID, CALLBACK_PORT_TYPE_INTERACTIVE); err != nil {
		logging.LogError(err, "Failed to get interactive data")
	} else if proxyData != nil {
		response[CALLBACK_PORT_TYPE_INTERACTIVE] = proxyData
	}
	response["action"] = decryptedMessage["action"]
	// reflect back any non-standard key at the top level
	reflectBackOtherKeys(&response, &decryptedMessage)
	// set this for push style c2 notifications
	if uuidInfo.UUIDType == "callback" {
		instanceResponse.OuterUuidIsCallback = true
	}
	if utils.MythicConfig.DebugAgentMessage {
		if stringMsg, err := json.MarshalIndent(response, "", "  "); err != nil {
			logging.LogError(err, "Failed to convert JSON to string for debug printing")
		} else {
			logging.LogDebug("Parsing agent message", "step final", response)
			SendAllOperationsMessage(fmt.Sprintf("Parsing agent message - step final (Response JSON): \n%s",
				string(stringMsg)),
				uuidInfo.OperationID, "debug", database.MESSAGE_LEVEL_DEBUG)
		}
	}
	if err != nil {
		logging.LogError(err, "Failed to process agent message's action")
		instanceResponse.Err = err
		return response
	}
	return response
}

func recursiveProcessAgentMessage(agentMessageInput *AgentMessageRawInput) recursiveProcessAgentMessageResponse {
	instanceResponse := recursiveProcessAgentMessageResponse{TrackingID: agentMessageInput.TrackingID}
	var messageUUID uuid.UUID
	var err error
	var base64DecodedMessage []byte
	// 1. Get message
	if utils.MythicConfig.DebugAgentMessage {
		logging.LogDebug("Parsing agent message", "step 1", agentMessageInput)
		if agentMessageInput.Base64Message != nil {
			SendAllOperationsMessage(fmt.Sprintf("Parsing agent message - step 1 (get data): \n%s",
				string(*agentMessageInput.Base64Message)),
				0, "debug", database.MESSAGE_LEVEL_DEBUG)
		} else {
			SendAllOperationsMessage(fmt.Sprintf("Parsing agent message - step 1 (get data): \n%s",
				base64.StdEncoding.EncodeToString(*agentMessageInput.RawMessage)),
				0, "debug", database.MESSAGE_LEVEL_DEBUG)
		}

	}
	// 2. Base64 decode agent message
	if agentMessageInput.Base64Message != nil {
		base64DecodedMessage, err = base64.StdEncoding.DecodeString(string(*agentMessageInput.Base64Message))
		if err != nil {
			base64DecodedMessage, err = base64.URLEncoding.DecodeString(string(*agentMessageInput.Base64Message))
			if err != nil {
				errorMessage := fmt.Sprintf("Failed to base64 decode message\n")
				errorMessage += fmt.Sprintf("message: %s\n", string(*agentMessageInput.Base64Message))
				errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
				logging.LogError(err, "Failed to base64 decode agent message")
				go SendAllOperationsMessage(errorMessage, 0, "agent_message_base64", database.MESSAGE_LEVEL_WARNING)
				instanceResponse.Err = err
				return instanceResponse
			}
		}
	} else if agentMessageInput.RawMessage != nil {
		base64DecodedMessage = *agentMessageInput.RawMessage
	} else {
		errorMessage := fmt.Sprintf("Failed to get message from %s profile\n", agentMessageInput.C2Profile)
		errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
		logging.LogError(err, "Failed to get agent message")
		go SendAllOperationsMessage(errorMessage, 0, "agent_message_base64", database.MESSAGE_LEVEL_WARNING)
		instanceResponse.Err = err
		return instanceResponse
	}
	totalBase64Bytes := len(base64DecodedMessage)
	var agentUUIDLength = 36
	// 36 is the length of a UUID string and 16 is the length of a UUID in raw bytes
	base64DecodedMessageLength := len(base64DecodedMessage)
	if base64DecodedMessageLength < 36 {
		if base64DecodedMessageLength < 16 {
			// if a message is less than 16 bytes, then it can't possibly have a UUID in it
			errorMessage := fmt.Sprintf("Message length too short\n")
			errorMessage += fmt.Sprintf("Message: %s\n", string(base64DecodedMessage))
			errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
			go SendAllOperationsMessage(errorMessage, 0, "agent_message_length", database.MESSAGE_LEVEL_WARNING)
			logging.LogError(nil, "Message length too short")
			instanceResponse.Err = errors.New("message too short")
			return instanceResponse
		}
		// if a message is between 16 and 36 bytes, then it might have a 16 byte UUID
		if messageUUID, err = uuid.FromBytes(base64DecodedMessage[:16]); err != nil {
			logging.LogError(err, "Failed to parse UUID from beginning of message")
			errorMessage := fmt.Sprintf("Failed to parse a valid UUID from the beginning of an agent message\nMessage: %s\n", string(base64DecodedMessage))
			errorMessage += "This likely happens if somme sort of traffic came through your C2 profile (ports too open) that isn't actually an agent message\n"
			errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
			go SendAllOperationsMessage(errorMessage, 0, "agent_message_uuid", database.MESSAGE_LEVEL_WARNING)
			instanceResponse.Err = err
			return instanceResponse
		} else {
			agentUUIDLength = 16
		}
		// 3. Parse out UUID and body
	} else if messageUUID, err = uuid.Parse(string(base64DecodedMessage[:36])); err != nil {
		if messageUUID, err = uuid.FromBytes(base64DecodedMessage[:16]); err != nil {
			logging.LogError(err, "Failed to parse UUID from beginning of message")
			errorMessage := fmt.Sprintf("Failed to parse a valid UUID from the beginning of an agent message\nMessage: %s\n", string(base64DecodedMessage))
			errorMessage += "This likely happens if somme sort of traffic came through your C2 profile (ports too open) that isn't actually an agent message\n"
			errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
			go SendAllOperationsMessage(errorMessage, 0, "agent_message_uuid", database.MESSAGE_LEVEL_WARNING)
			instanceResponse.Err = err
			return instanceResponse
		} else {
			agentUUIDLength = 16
		}
	}
	if utils.MythicConfig.DebugAgentMessage {
		logging.LogDebug("Processing agent message", "step 2", messageUUID.String())
		SendAllOperationsMessage(fmt.Sprintf("Parsing agent message - step 2 (get uuid): \n%s",
			messageUUID.String()),
			0, "debug", database.MESSAGE_LEVEL_DEBUG)
	}
	instanceResponse.AgentUUIDSize = agentUUIDLength
	// 4. look up c2 profile and information about UUID
	uuidInfo, err := LookupEncryptionData(agentMessageInput.C2Profile, messageUUID.String(), agentMessageInput.UpdateCheckinTime)
	if err != nil {
		errorMessage := err.Error() + "\n"
		errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
		go SendAllOperationsMessage(errorMessage, uuidInfo.OperationID, messageUUID.String(), database.MESSAGE_LEVEL_WARNING)
		logging.LogError(err, errorMessage)
		instanceResponse.Err = errors.New(errorMessage)
		return instanceResponse
	}
	if !uuidInfo.CallbackAllowedFromPayload {
		payload := databaseStructs.Payload{}
		err = database.DB.Get(&payload, `SELECT
			payload.description, 
			filemeta.filename "filemeta.filename"
			FROM payload
			JOIN filemeta on payload.file_id = filemeta.id
			WHERE payload.uuid=$1`, messageUUID.String())
		errorMessage := fmt.Sprintf("Payload (%s) - %s\n", string(payload.Filemeta.Filename), payload.Description)
		errorMessage += fmt.Sprintf("Registered as not allowing new callbacks, so messages are blocked. If this isn't intended, allow this from the payloads page.\n")
		errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
		go SendAllOperationsMessage(errorMessage, uuidInfo.OperationID, messageUUID.String(), database.MESSAGE_LEVEL_WARNING)
		instanceResponse.Err = err
		return instanceResponse
	}
	decryptBytes := base64DecodedMessage[agentUUIDLength:totalBase64Bytes]
	decryptedMessage, err := DecryptMessage(uuidInfo, &decryptBytes)
	if err != nil {
		logging.LogError(err, "Failed to decrypt message and process as JSON")
		errorMessage := fmt.Sprintf("Failed to decrypt message due to: %s\n", err.Error())
		errorMessage += fmt.Sprintf("Message: %s\n", string(base64DecodedMessage[agentUUIDLength:totalBase64Bytes]))
		errorMessage += fmt.Sprintf("Connection from %s via %s\n", agentMessageInput.RemoteIP, agentMessageInput.C2Profile)
		go SendAllOperationsMessage(errorMessage, uuidInfo.OperationID, messageUUID.String(), database.MESSAGE_LEVEL_WARNING)
		instanceResponse.Err = err
		return instanceResponse
	}
	// try to force the garbage collection on the base64 decoded message
	base64DecodedMessage = make([]byte, 0)
	response := processAgentMessageContent(agentMessageInput, uuidInfo, decryptedMessage, &instanceResponse)
	if instanceResponse.Err != nil {
		return instanceResponse
	}
	responseBytes, err := EncryptMessage(uuidInfo, instanceResponse.OuterUuid, response, true)
	if err != nil {
		logging.LogError(err, "Failed to encrypt message in agent_message")
		instanceResponse.Err = err
		return instanceResponse
	}
	instanceResponse.Message = responseBytes
	if uuidInfo.UUIDType == UUIDTYPESTAGING {
		removeCachedEntry(uuidInfo)
	}
	return instanceResponse
}

func ProcessAgentMessage(agentMessageInput *AgentMessageRawInput) ([]byte, error) {
	response := recursiveProcessAgentMessage(agentMessageInput)
	return response.Message, response.Err
}

func LookupEncryptionData(c2profile string, messageUUID string, updateCheckinTime bool) (*cachedUUIDInfo, error) {
	//logging.LogTrace("Looking up information for new message", "uuid", messageUUID)
	//logging.LogDebug("Getting encryption data", "cachemap", cachedUUIDInfoMap)
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	if _, ok := cachedUUIDInfoMap[messageUUID+c2profile]; ok {
		// we found an instance of the cache info with c2 profile encryption data
		if cachedUUIDInfoMap[messageUUID+c2profile].UUIDType == UUIDTYPECALLBACK {
			if updateCheckinTime {
				UpdateCallbackEdgesAndCheckinTime(cachedUUIDInfoMap[messageUUID+c2profile])
			}

		}
		return cachedUUIDInfoMap[messageUUID+c2profile], nil
	} else if _, ok = cachedUUIDInfoMap[messageUUID]; ok {
		// we found an instance of the cache info with payload encryption data
		if cachedUUIDInfoMap[messageUUID].UUIDType == UUIDTYPECALLBACK {
			if updateCheckinTime {
				UpdateCallbackEdgesAndCheckinTime(cachedUUIDInfoMap[messageUUID])
			}

		}
		return cachedUUIDInfoMap[messageUUID], nil
	}
	newCache := cachedUUIDInfo{}
	// get the associated c2 profile
	databaseC2Profile := databaseStructs.C2profile{}
	if err := database.DB.Get(&databaseC2Profile, `SELECT id, "name", is_p2p FROM c2profile
		WHERE "name"=$1`, c2profile); err != nil {
		logging.LogError(err, "Failed to get c2 profile in LookupEncryptionData", "c2profile", c2profile, "uuid", messageUUID)
		errorMessage := fmt.Sprintf("Failed to find agent's C2 profile: %s\n", c2profile)
		errorMessage += fmt.Sprintf("This could be from a C2 Profile forwarding traffic to Mythic that Mythic isn't tracking.\n")
		errorMessage += fmt.Sprintf("Potentially look into installing the c2 profile")
		go SendAllOperationsMessage(errorMessage, 0, messageUUID, database.MESSAGE_LEVEL_WARNING)
		return &newCache, err
	}
	newCache.C2ProfileID = databaseC2Profile.ID
	newCache.C2ProfileName = databaseC2Profile.Name
	newCache.IsP2P = databaseC2Profile.IsP2p
	// find out what type of UUID we're looking at
	callback := databaseStructs.Callback{}
	payload := databaseStructs.Payload{}
	stager := databaseStructs.Staginginfo{}
	if err := database.DB.Get(&callback, `SELECT
		callback.id, callback.enc_key, callback.dec_key, callback.crypto_type, callback.operation_id, callback.last_checkin, callback.display_id, callback.trigger_on_checkin_after_time, 
		payload.id "payload.id", 
		payloadtype.id "payload.payloadtype.id", 
		payloadtype.name "payload.payloadtype.name", 
		payloadtype.mythic_encrypts "payload.payloadtype.mythic_encrypts",
		payloadtype.translation_container_id "payload.payloadtype.translation_container_id",
		payloadtype.message_format "payload.payloadtype.message_format",
		payloadtype.message_uuid_length "payload.payloadtype.message_uuid_length"
		FROM callback
		JOIN payload ON callback.registered_payload_id = payload.id
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
		WHERE callback.agent_callback_id=$1`, messageUUID); err == nil {
		// we are looking at a callback
		newCache.UUID = messageUUID
		newCache.CallbackAllowedFromPayload = true
		newCache.UUIDType = UUIDTYPECALLBACK
		newCache.PayloadID = callback.Payload.ID
		newCache.PayloadTypeID = callback.Payload.Payloadtype.ID
		newCache.PayloadTypeName = callback.Payload.Payloadtype.Name
		newCache.PayloadTypeMessageFormat = callback.Payload.Payloadtype.MessageFormat
		newCache.PayloadTypeMessageUUIDLength = callback.Payload.Payloadtype.MessageUUIDLength
		newCache.MythicEncrypts = callback.Payload.Payloadtype.MythicEncrypts
		if callback.Payload.Payloadtype.TranslationContainerID.Valid {
			newCache.TranslationContainerID = int(callback.Payload.Payloadtype.TranslationContainerID.Int64)
		}
		newCache.CallbackEncKey = callback.EncKey
		newCache.CallbackDecKey = callback.DecKey
		newCache.CryptoType = callback.CryptoType
		newCache.CallbackID = callback.ID
		newCache.CallbackDisplayID = callback.DisplayID
		newCache.LastCheckinTime = callback.LastCheckin
		newCache.OperationID = callback.OperationID
		newCache.TriggerOnCheckinAfterTime = callback.TriggerOnCheckinAfterTime
	} else if err = database.DB.Get(&payload, `SELECT
		payload.id, payload.operation_id,
		payload.deleted, payload.description, payload.uuid, payload.callback_allowed,
		payloadtype.id "payloadtype.id",
		payloadtype.name "payloadtype.name", 
		payloadtype.mythic_encrypts "payloadtype.mythic_encrypts",
		payloadtype.translation_container_id "payloadtype.translation_container_id",
		payloadtype.message_format "payloadtype.message_format",
		payloadtype.message_uuid_length "payloadtype.message_uuid_length"
		FROM payload
		JOIN payloadtype on payload.payload_type_id = payloadtype.id
		WHERE payload.uuid=$1`, messageUUID); err == nil {
		// we're looking at a payload message
		newCache.UUID = messageUUID
		newCache.UUIDType = UUIDTYPEPAYLOAD
		newCache.CallbackAllowedFromPayload = payload.CallbackAllowed
		newCache.PayloadID = payload.ID
		newCache.PayloadTypeID = payload.Payloadtype.ID
		newCache.PayloadTypeName = payload.Payloadtype.Name
		newCache.PayloadTypeMessageFormat = payload.Payloadtype.MessageFormat
		newCache.PayloadTypeMessageUUIDLength = payload.Payloadtype.MessageUUIDLength
		newCache.MythicEncrypts = payload.Payloadtype.MythicEncrypts
		if payload.Payloadtype.TranslationContainerID.Valid {
			newCache.TranslationContainerID = int(payload.Payloadtype.TranslationContainerID.Int64)
		}
		newCache.CallbackID = 0
		newCache.CallbackDisplayID = 0
		newCache.LastCheckinTime = time.Now().UTC()
		newCache.OperationID = payload.OperationID
		newCache.TriggerOnCheckinAfterTime = 0
		// we also need to get the crypto keys from the c2 profile for this payload
		foundCryptoParam := false
		cryptoParam := databaseStructs.C2profileparametersinstance{}
		if err = database.DB.Get(&cryptoParam, `SELECT
			c2profileparametersinstance.enc_key, 
			c2profileparametersinstance.dec_key, 
			c2profileparametersinstance.value,
			c2profileparameters.crypto_type "c2profileparameters.crypto_type"
			FROM c2profileparametersinstance
			JOIN c2profileparameters ON c2profileparametersinstance.c2_profile_parameters_id = c2profileparameters.id
			WHERE c2profileparameters.crypto_type=true AND c2profileparametersinstance.payload_id=$1 AND
			      c2profileparameters.c2_profile_id=$2`, payload.ID, databaseC2Profile.ID); err == sql.ErrNoRows {
			logging.LogDebug("payload has no associated c2 profile parameter instance with a crypto type")
			newCache.CryptoType = "none"
		} else if err != nil {
			logging.LogError(err, "Failed to fetch c2profileparametersinstance crypto values for payload")
			return &newCache, err
		} else {
			foundCryptoParam = true
			newCache.C2EncKey = cryptoParam.EncKey
			newCache.C2DecKey = cryptoParam.DecKey
			newCache.CryptoType = cryptoParam.Value
		}
		payloadCryptoParam := databaseStructs.Buildparameterinstance{}
		if err = database.DB.Get(&payloadCryptoParam, `SELECT
			enc_key, dec_key, value
			FROM buildparameterinstance
			WHERE dec_key IS NOT NULL AND payload_id=$1`, payload.ID); err == sql.ErrNoRows {
			logging.LogDebug("payload has no associated build parameter instance with a crypto type")
			if !foundCryptoParam {
				// only set this to "none" if we didn't find a c2 profile with a crypto param
				newCache.CryptoType = "none"
			}

		} else if err != nil {
			logging.LogError(err, "Failed to fetch buildparameterinstance crypto values for payload")
			return &newCache, err
		} else {
			newCache.PayloadDecKey = payloadCryptoParam.DecKey
			newCache.PayloadEncKey = payloadCryptoParam.EncKey
			newCache.CryptoType = payloadCryptoParam.Value
		}
	} else if err = database.DB.Get(&stager, `SELECT
		staginginfo.id, staginginfo.enc_key, staginginfo.dec_key, staginginfo.crypto_type,
		payload.id "payload.id",
		payload.operation_id "payload.operation_id",
		payloadtype.id "payload.payloadtype.id", 
		payloadtype.name "payload.payloadtype.name", 
		payloadtype.mythic_encrypts "payload.payloadtype.mythic_encrypts",
		payloadtype.translation_container_id "payload.payloadtype.translation_container_id",
		payloadtype.message_format "payload.payloadtype.message_format",
		payloadtype.message_uuid_length "payload.payloadtype.message_uuid_length"
		FROM staginginfo
		JOIN payload ON staginginfo.payload_id = payload.id
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
		WHERE staginginfo.staging_uuid=$1`, messageUUID); err == nil {
		// we're looking at a staging message
		newCache.UUID = messageUUID
		newCache.CallbackAllowedFromPayload = true
		newCache.UUIDType = UUIDTYPESTAGING
		newCache.StagingEncKey = stager.EncKey
		newCache.StagingDecKey = stager.DecKey
		newCache.CryptoType = stager.CryptoType
		newCache.PayloadID = stager.PayloadID
		newCache.PayloadTypeID = stager.Payload.Payloadtype.ID
		newCache.PayloadTypeName = stager.Payload.Payloadtype.Name
		newCache.PayloadTypeMessageFormat = stager.Payload.Payloadtype.MessageFormat
		newCache.PayloadTypeMessageUUIDLength = stager.Payload.Payloadtype.MessageUUIDLength
		newCache.MythicEncrypts = stager.Payload.Payloadtype.MythicEncrypts
		if stager.Payload.Payloadtype.TranslationContainerID.Valid {
			newCache.TranslationContainerID = int(stager.Payload.Payloadtype.TranslationContainerID.Int64)
		}
		newCache.CallbackID = 0
		newCache.CallbackDisplayID = 0
		newCache.TriggerOnCheckinAfterTime = 0
		newCache.LastCheckinTime = time.Now().UTC()
		newCache.OperationID = stager.Payload.OperationID
	} else {
		// we couldn't find a match for the UUID
		logging.LogError(err, "Failed to find UUID in callbacks, staging, or payloads")
		errorMessage := fmt.Sprintf("Failed to correlate UUID, %s, to something Mythic knows.\n", messageUUID)
		errorMessage += fmt.Sprintf("%s is likely a Callback or Payload from a Mythic instance that was deleted or had the database reset.\n", messageUUID)
		return &newCache, errors.New(errorMessage)
	}
	if newCache.TranslationContainerID > 0 {
		if err := database.DB.Get(&newCache.TranslationContainerName, `SELECT
		"name"
		FROM translationcontainer
		WHERE id=$1`, newCache.TranslationContainerID); err != nil {
			logging.LogError(err, "Tried to fetch translation container name")
			return &newCache, nil
		}
	}
	cachedUUIDInfoMap[messageUUID+c2profile] = &newCache
	logging.LogDebug("New cache value for agent connection", "newcache", newCache)
	return &newCache, nil
}

func DecryptMessage(uuidInfo *cachedUUIDInfo, agentMessage *[]byte) (map[string]interface{}, error) {
	var jsonAgentMessage map[string]interface{}
	if uuidInfo.MythicEncrypts {
		if uuidInfo.TranslationContainerName == "" {
			// we decrypt and return the JSON bytes
			//logging.LogTrace("about to decrypt", "key", hex.EncodeToString(*uuidInfo.DecKey), "agentMessage", hex.EncodeToString(agentMessage))
			decrypted, err := uuidInfo.IterateAndAct(agentMessage, "decrypt")
			if err != nil {
				return nil, err
			}
			err = unmarshalMessageForAgentFormat(uuidInfo, decrypted, &jsonAgentMessage)
			//err = json.Unmarshal(decrypted, &jsonAgentMessage)
			if err != nil {
				return nil, err
			}
			return jsonAgentMessage, nil

		} else {
			// we decrypt, but then need to pass to translation container
			if decrypted, err := uuidInfo.IterateAndAct(agentMessage, "decrypt"); err != nil {
				logging.LogError(err, "Failed to get decryption keys and decrypt")
				return nil, err
			} else if convertedResponse, err := RabbitMQConnection.SendTrRPCCustomMessageToMythicC2(TrCustomMessageToMythicC2FormatMessage{
				TranslationContainerName: uuidInfo.TranslationContainerName,
				C2Name:                   uuidInfo.C2ProfileName,
				Message:                  *decrypted,
				UUID:                     uuidInfo.UUID,
				MythicEncrypts:           uuidInfo.MythicEncrypts,
				CryptoKeys:               uuidInfo.getAllKeys(),
			}); err != nil {
				//logging.LogError(err, "Failed to send response to translate custom message to Mythic C2")
				//go SendAllOperationsMessage(fmt.Sprintf("Failed to have translation container process message: %s\n%s", uuidInfo.TranslationContainerName, err.Error()), uuidInfo.OperationID,
				//	"c2_to_mythic_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
				return nil, err
			} else if !convertedResponse.Success {
				logging.LogError(errors.New(convertedResponse.Error), "Failed to have translation container process custom message from agent")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to have translation container process message: %s\n%s", uuidInfo.TranslationContainerName, convertedResponse.Error), uuidInfo.OperationID,
					"c2_to_mythic_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
				return nil, errors.New(convertedResponse.Error)
			} else {
				return convertedResponse.Message, nil
			}
		}
	} else {
		// we don't decrypt
		if uuidInfo.TranslationContainerName == "" {
			// no translation container and we're not in charge of decrypting, so just return it
			err := unmarshalMessageForAgentFormat(uuidInfo, agentMessage, &jsonAgentMessage)
			//err := json.Unmarshal(agentMessage, &jsonAgentMessage)
			if err != nil {
				return nil, err
			}
			return jsonAgentMessage, nil

		} else {
			// we don't decrypt and there's a translation container
			// translation container should decrypt and convert
			if convertedResponse, err := RabbitMQConnection.SendTrRPCCustomMessageToMythicC2(TrCustomMessageToMythicC2FormatMessage{
				TranslationContainerName: uuidInfo.TranslationContainerName,
				C2Name:                   uuidInfo.C2ProfileName,
				Message:                  *agentMessage,
				UUID:                     uuidInfo.UUID,
				MythicEncrypts:           uuidInfo.MythicEncrypts,
				CryptoKeys:               uuidInfo.getAllKeys(),
			}); err != nil {
				//logging.LogError(err, "Failed to send response to translate custom message to Mythic C2")
				//go SendAllOperationsMessage(fmt.Sprintf("Failed to have translation container process message: %s\n%s", uuidInfo.TranslationContainerName, err.Error()), uuidInfo.OperationID,
				//	"c2_to_mythic_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
				return nil, err
			} else if !convertedResponse.Success {
				logging.LogError(errors.New(convertedResponse.Error), "Failed to have translation container process custom message from agent")
				go SendAllOperationsMessage(fmt.Sprintf("Failed to have translation container process message: %s\n%s", uuidInfo.TranslationContainerName, convertedResponse.Error), uuidInfo.OperationID,
					"c2_to_mythic_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
				return nil, errors.New(convertedResponse.Error)
			} else {
				return convertedResponse.Message, nil
			}
		}
	}
}

func EncryptMessage(uuidInfo *cachedUUIDInfo, outerUUID string, agentMessage map[string]interface{}, shouldBase64Encode bool) ([]byte, error) {
	//logging.LogDebug("Sending back final message", "response", agentMessage)
	if uuidInfo.MythicEncrypts {
		if uuidInfo.TranslationContainerName == "" {
			// we encrypt the JSON bytes and return raw bytes
			jsonBytes, err := marshalMessageForAgentFormat(uuidInfo, agentMessage)
			//jsonBytes, err := json.Marshal(agentMessage)
			if err != nil {
				logging.LogError(err, "Failed to marshal the final agent message before encrypting")
				return nil, err
			}
			encryptedBytes, err := uuidInfo.IterateAndAct(&jsonBytes, "encrypt")
			if err != nil {
				logging.LogError(err, "Failed to encrypt bytes")
				return nil, err
			}
			uuidBytes, err := GetUUIDBytes(outerUUID, uuidInfo.PayloadTypeMessageUUIDLength)
			if err != nil {
				logging.LogError(err, "Failed to get UUID for final message")
				return nil, err
			}
			finalBytes := append(uuidBytes, *encryptedBytes...)
			if shouldBase64Encode {
				return []byte(base64.StdEncoding.EncodeToString(finalBytes)), nil
			}
			return finalBytes, nil

		}
		convertedResponse, err := RabbitMQConnection.SendTrRPCMythicC2ToCustomMessage(TrMythicC2ToCustomMessageFormatMessage{
			TranslationContainerName: uuidInfo.TranslationContainerName,
			C2Name:                   uuidInfo.C2ProfileName,
			Message:                  agentMessage,
			UUID:                     uuidInfo.UUID,
			MythicEncrypts:           uuidInfo.MythicEncrypts,
			CryptoKeys:               uuidInfo.getAllKeys(),
		})
		if err != nil {
			// we send to translation container to convert to c2 specific format, then we encrypt
			//logging.LogError(err, "Failed to send agent message response to translation container")
			//go SendAllOperationsMessage(fmt.Sprintf("Failed to send agent message response to translation container: %s\n%s", uuidInfo.TranslationContainerName, err.Error()), uuidInfo.OperationID,
			//	"mythic_to_c2_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
			return nil, err
		}
		if !convertedResponse.Success {
			logging.LogError(errors.New(convertedResponse.Error), "Failed to have translation container process message from Mythic->Custom C2")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to have translation container process message from Mythic->Custom C2: %s\n%s", uuidInfo.TranslationContainerName, convertedResponse.Error), uuidInfo.OperationID,
				"mythic_to_c2_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
			return nil, errors.New(convertedResponse.Error)
		}
		if len(convertedResponse.Message) == 0 {
			logging.LogError(nil, "empty message from Mythic->C2 translation")
			return nil, errors.New("empty message from Mythic->C2 translation")
		}
		encryptedBytes, err := uuidInfo.IterateAndAct(&convertedResponse.Message, "encrypt")
		if err != nil {
			logging.LogError(err, "Failed to encrypt bytes")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to encrypt bytes:\n%s", err.Error()), uuidInfo.OperationID,
				"mythic_to_c2_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
			return nil, err
		}
		uuidBytes, err := GetUUIDBytes(outerUUID, uuidInfo.PayloadTypeMessageUUIDLength)
		if err != nil {
			logging.LogError(err, "Failed to generate UUID for final message")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to generate UUID for final bytes:\n%s", err.Error()), uuidInfo.OperationID,
				"mythic_to_c2_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
			return nil, err
		}
		finalBytes := append(uuidBytes, *encryptedBytes...)
		if shouldBase64Encode {
			return []byte(base64.StdEncoding.EncodeToString(finalBytes)), nil
		}
		return finalBytes, nil

	} else {
		if uuidInfo.TranslationContainerName == "" {
			// mythic doesn't encrypt, but there's no translation container, so just return it
			jsonBytes, err := marshalMessageForAgentFormat(uuidInfo, agentMessage)
			//jsonBytes, err := json.Marshal(agentMessage)
			if err != nil {
				logging.LogError(err, "Failed to marshal agent message into json")
				return nil, err
			}
			uuidBytes, err := GetUUIDBytes(outerUUID, uuidInfo.PayloadTypeMessageUUIDLength)
			if err != nil {
				logging.LogError(err, "Failed to generate final UUID bytes")
				return nil, err
			}
			finalBytes := append(uuidBytes, jsonBytes...)
			if shouldBase64Encode {
				return []byte(base64.StdEncoding.EncodeToString(finalBytes)), nil
			}
			return finalBytes, nil

		}
		convertedResponse, err := RabbitMQConnection.SendTrRPCMythicC2ToCustomMessage(TrMythicC2ToCustomMessageFormatMessage{
			TranslationContainerName: uuidInfo.TranslationContainerName,
			C2Name:                   uuidInfo.C2ProfileName,
			Message:                  agentMessage,
			UUID:                     uuidInfo.UUID,
			MythicEncrypts:           uuidInfo.MythicEncrypts,
			CryptoKeys:               uuidInfo.getAllKeys(),
		})
		if err != nil {
			//go SendAllOperationsMessage(fmt.Sprintf("Failed to send agent message response to translation container:\n%s", err.Error()), uuidInfo.OperationID,
			//	"mythic_to_c2_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
			return nil, err
		}
		if !convertedResponse.Success {
			go SendAllOperationsMessage(fmt.Sprintf("Failed to send agent message response to translation container:\n%s", convertedResponse.Error), uuidInfo.OperationID,
				"mythic_to_c2_"+uuidInfo.TranslationContainerName, database.MESSAGE_LEVEL_WARNING)
			return nil, errors.New(convertedResponse.Error)
		}
		return convertedResponse.Message, nil

	}
}

func RecursivelyEncryptMessage(path []cbGraphAdjMatrixEntry, message map[string]interface{}, updateCheckinTime bool) ([]byte, error) {
	// recursively craft all the delegate messages and encrypt them except for the last one
	// for a path of 1 -> 2 -> 4, where we're 1 and the task is for 4, we should encrypt for 4 and 2
	currentMessage := message
	logging.LogDebug("recursively encrypting message", "path", path)
	for i := 0; i < len(path)-1; i++ {
		logging.LogDebug("Recursively encrypting and prepping tasks for delegates", "target_id", path[i].DestinationId, "c2", path[i].C2ProfileName)
		if targetUuidInfo, err := LookupEncryptionData(path[i].C2ProfileName, path[i].DestinationAgentId, true); err != nil {
			logging.LogError(err, "Failed to lookup encryption data for target", "target", path[i].DestinationAgentId, "target_id", path[i].DestinationId)
			return nil, err
		} else if encryptedBytes, err := EncryptMessage(targetUuidInfo, path[i].DestinationAgentId, currentMessage, true); err != nil {
			logging.LogError(err, "Failed to encrypt message when trying to prep tasks for delegates")
			return nil, err
		} else {
			currentMessage = map[string]interface{}{
				"action": "get_tasking",
				"tasks":  []string{},
				"delegates": []map[string]interface{}{
					{
						"message":    string(encryptedBytes),
						"c2_profile": path[i].C2ProfileName,
						"uuid":       path[i].DestinationAgentId,
					},
				},
			}
		}
	}
	// final encrypt of the message
	i := len(path) - 1
	if i >= 0 {
		if targetUuidInfo, err := LookupEncryptionData(path[i].C2ProfileName, path[i].DestinationAgentId, updateCheckinTime); err != nil {
			logging.LogError(err, "Failed to lookup encryption data for target", "target", path[i].DestinationAgentId, "target_id", path[i].DestinationId)
			return nil, err
		} else if encryptedBytes, err := EncryptMessage(targetUuidInfo, path[i].DestinationAgentId, currentMessage, true); err != nil {
			logging.LogError(err, "Failed to encrypt message when trying to prep tasks for delegates")
			return nil, err
		} else {
			return encryptedBytes, nil
		}
	} else {
		logging.LogError(nil, "Can't encrypt final time for delegate task wrapping", "index", i)
		return nil, errors.New("failed to do final encrypt")
	}
}

func reflectBackOtherKeys(response *map[string]interface{}, other *map[string]interface{}) {
	reservedOtherKeys := map[string]int{
		"socks":           1,
		"edges":           1,
		"delegates":       1,
		"responses":       1,
		"action":          1,
		"rpfwd":           1,
		"alerts":          1,
		"ips":             1,
		"os":              1,
		"user":            1,
		"architecture":    1,
		"domain":          1,
		"external_ip":     1,
		"ip":              1,
		"host":            1,
		"pid":             1,
		"process_name":    1,
		"extra_info":      1,
		"sleep_info":      1,
		"integrity_level": 1,
		"uuid":            1,
		"interactive":     1,
	}
	//logging.LogInfo("other keys", "other", *other)
	for key, val := range *other {
		if _, ok := reservedOtherKeys[key]; !ok {
			(*response)[key] = val
		}
	}
}

func UpdateCallbackEdgesAndCheckinTime(uuidInfo *cachedUUIDInfo) {
	callback := databaseStructs.Callback{
		AgentCallbackID: uuidInfo.UUID,
		ID:              uuidInfo.CallbackID,
		OperationID:     uuidInfo.OperationID,
		LastCheckin:     time.Now().UTC(),
	}
	// only bother updating the last checkin time if it's been more than one second
	if callback.LastCheckin.Sub(uuidInfo.LastCheckinTime).Seconds() > 1 {
		if _, err := database.DB.NamedExec(`UPDATE callback SET
			last_checkin=:last_checkin, dead=false
			WHERE id=:id`, callback); err != nil {
			logging.LogError(err, "Failed to update last_checkin time", "callback", uuidInfo.UUID)
		} else {
			callbackGraph.Add(callback, callback, uuidInfo.C2ProfileName, false)
			//callbackGraph.AddByAgentIds(callback.AgentCallbackID, callback.AgentCallbackID, uuidInfo.C2ProfileName)
			if uuidInfo.EdgeId == 0 {
				if err := database.DB.Get(&uuidInfo.EdgeId, `SELECT id FROM callbackgraphedge
						WHERE source_id=$1 AND destination_id=$2 AND c2_profile_id=$3 AND operation_id=$4`,
					uuidInfo.CallbackID, uuidInfo.CallbackID, uuidInfo.C2ProfileID, uuidInfo.OperationID); err == sql.ErrNoRows {
					if !uuidInfo.IsP2P {
						if _, err := database.DB.Exec(`INSERT INTO callbackgraphedge
						(source_id, destination_id, c2_profile_id, operation_id)
						VALUES ($1, $1, $2, $3)`,
							uuidInfo.CallbackID, uuidInfo.C2ProfileID, uuidInfo.OperationID); err != nil {
							logging.LogError(err, "Failed to add callback graph edge id for callback checking in",
								"c2 id", uuidInfo.C2ProfileID, "callback id", uuidInfo.CallbackID)
						} else {
							logging.LogInfo("Added new callbackgraph edge when updating edges and checkin times", "c2", uuidInfo.C2ProfileID, "name", uuidInfo.C2ProfileName, "callback", uuidInfo.CallbackID)
						}
					}
				} else if err != nil {
					logging.LogError(err, "Failed to fetch callback graph edge id for callback checking in",
						"c2 id", uuidInfo.C2ProfileID, "callback id", uuidInfo.CallbackID)
				}
			}
			if !uuidInfo.Active {
				uuidInfo.Active = true
				if _, err := database.DB.NamedExec(`UPDATE callback SET
					active=true
					WHERE id=:id`, callback); err != nil {
					logging.LogError(err, "Failed to update active time", "callback", uuidInfo.UUID)
				}
				if uuidInfo.EdgeId > 0 {
					if _, err := database.DB.Exec(`UPDATE callbackgraphedge SET
					end_timestamp=NULL
					WHERE id=$1`, uuidInfo.EdgeId); err != nil {
						logging.LogError(err, "Failed to callbackgraph edges time", "callback", uuidInfo.UUID)
					}
				}

			}
			if uuidInfo.TriggerOnCheckinAfterTime > 0 {
				checkinDifference := int(callback.LastCheckin.Sub(uuidInfo.LastCheckinTime).Minutes())
				if checkinDifference >= uuidInfo.TriggerOnCheckinAfterTime {
					// we want to trigger a workflow that the callback is checking in again after sleeping for > some time
					go func(triggerData databaseStructs.Callback, oldCheckin time.Time, difference int) {
						EventingChannel <- EventNotification{
							Trigger:     eventing.TriggerCallbackCheckin,
							OperationID: triggerData.OperationID,
							CallbackID:  triggerData.ID,
							Outputs: map[string]interface{}{
								"previous_checkin":   oldCheckin,
								"checkin_difference": difference,
							},
						}
					}(callback, uuidInfo.LastCheckinTime, checkinDifference)
				}
			}
		}
		uuidInfo.LastCheckinTime = callback.LastCheckin
	}
}

func GetUUIDBytes(outerUUID string, agentUUIDLength int) ([]byte, error) {
	switch agentUUIDLength {
	case 36:
		return []byte(outerUUID), nil
	case 16:
		if uuidVal, err := uuid.Parse(outerUUID); err != nil {
			logging.LogError(err, "Failed to parse UUID string when trying to create response")
			return nil, err
		} else if uuidBytes, err := uuidVal.MarshalBinary(); err != nil {
			logging.LogError(err, "Failed to marshal UUID into binary")
			return nil, err
		} else {
			return uuidBytes, nil
		}
	default:
		return nil, errors.New("unknown UUID length")
	}
}

func removeCachedEntry(uuidInfo *cachedUUIDInfo) {
	// try to prevent the cache from growing indefinitely by removing staging entries after use
	cachedUUIDInfoMapMutex.Lock()
	defer cachedUUIDInfoMapMutex.Unlock()
	for k, _ := range cachedUUIDInfoMap {
		if cachedUUIDInfoMap[k].UUID == uuidInfo.UUID && cachedUUIDInfoMap[k].UUIDType == UUIDTYPESTAGING {
			delete(cachedUUIDInfoMap, k)
		}
	}
}
