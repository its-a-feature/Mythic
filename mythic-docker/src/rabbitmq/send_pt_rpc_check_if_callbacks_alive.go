package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"time"

	"github.com/its-a-feature/Mythic/logging"
)

type PTCallbacksToCheck struct {
	ID               int       `json:"id"`
	DisplayID        int       `json:"display_id"`
	AgentCallbackID  string    `json:"agent_callback_id"`
	InitialCheckin   time.Time `json:"initial_checkin"`
	LastCheckin      time.Time `json:"last_checkin"`
	SleepInfo        string    `json:"sleep_info"`
	ActiveC2Profiles []string  `json:"active_c2_profiles"`
}
type PTCheckIfCallbacksAliveMessage struct {
	ContainerName string               `json:"container_name"`
	Callbacks     []PTCallbacksToCheck `json:"callbacks"`
}
type PTCallbacksToCheckResponse struct {
	ID    int  `json:"id"`
	Alive bool `json:"alive"`
}
type PTCheckIfCallbacksAliveMessageResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	Callbacks []PTCallbacksToCheckResponse
}

func checkIfActiveCallbacksAreAliveForever() {
	for {
		// iterate and check once every minute
		time.Sleep(60 * time.Second)
		activeCallbacks := []databaseStructs.Callback{}
		err := database.DB.Select(&activeCallbacks, `SELECT
    	callback.id, callback.display_id, callback.agent_callback_id, 
    	callback.init_callback, callback.last_checkin, callback.sleep_info,
    	payloadtype.name "payload.payloadtype.name",
    	payloadtype.container_running "payload.payloadtype.container_running"
    	FROM callback
    	JOIN payload ON callback.registered_payload_id = payload.id
		JOIN payloadtype ON payload.payload_type_id = payloadtype.id
    	WHERE active=true`)
		if errors.Is(err, sql.ErrNoRows) {
			continue
		}
		if err != nil {
			logging.LogError(err, "failed to query for callbacks")
			continue
		}
		// process active callbacks
		queryMap := make(map[string][]databaseStructs.Callback)
		// group all callbacks by payload type name that have payload types that are online
		for _, callback := range activeCallbacks {
			if !callback.Payload.Payloadtype.ContainerRunning {
				continue
			}
			if _, ok := queryMap[callback.Payload.Payloadtype.Name]; !ok {
				queryMap[callback.Payload.Payloadtype.Name] = make([]databaseStructs.Callback, 0)
			}
			queryMap[callback.Payload.Payloadtype.Name] = append(queryMap[callback.Payload.Payloadtype.Name], callback)
		}
		// reach out to each payload type and ask if the callbacks are alive or not
		for payloadType, _ := range queryMap {
			checkMsg := PTCheckIfCallbacksAliveMessage{
				ContainerName: payloadType,
				Callbacks:     make([]PTCallbacksToCheck, len(queryMap[payloadType])),
			}
			for i, callback := range queryMap[payloadType] {
				checkMsg.Callbacks[i].AgentCallbackID = callback.AgentCallbackID
				checkMsg.Callbacks[i].ID = callback.ID
				checkMsg.Callbacks[i].DisplayID = callback.DisplayID
				checkMsg.Callbacks[i].InitialCheckin = callback.InitCallback
				checkMsg.Callbacks[i].LastCheckin = callback.LastCheckin
				checkMsg.Callbacks[i].SleepInfo = callback.SleepInfo
				edges := []databaseStructs.Callbackgraphedge{}
				err = database.DB.Select(&edges, `SELECT 
    				c2profile.name "c2profile.name" 
					FROM callbackgraphedge 
					JOIN c2profile ON c2profile.id = callbackgraphedge.c2_profile_id
					WHERE (source_id=$1 or destination_id=$1) and end_timestamp IS NULL`, callback.ID)
				if err != nil {
					logging.LogError(err, "failed to get active callback edges")
				}
				checkMsg.Callbacks[i].ActiveC2Profiles = make([]string, 0)
				for _, edge := range edges {
					checkMsg.Callbacks[i].ActiveC2Profiles = append(checkMsg.Callbacks[i].ActiveC2Profiles, edge.C2Profile.Name)
				}
			}
			checkMsgResponse, err := RabbitMQConnection.SendPTRPCCheckIfCallbacksAlive(checkMsg)
			if err != nil {
				continue
			}
			if !checkMsgResponse.Success {
				logging.LogError(nil, "checkIfCallbacksAlive failed", "error", checkMsgResponse.Error)
				continue
			}
			for _, updateCallback := range checkMsgResponse.Callbacks {
				_, err = database.DB.Exec(`UPDATE callback SET dead=$1 WHERE id=$2`,
					!updateCallback.Alive, updateCallback.ID)
				if err != nil {
					logging.LogError(err, "failed to update dead status")
				}
			}
		}
	}
}

func (r *rabbitMQConnection) SendPTRPCCheckIfCallbacksAlive(sendMsg PTCheckIfCallbacksAliveMessage) (*PTCheckIfCallbacksAliveMessageResponse, error) {
	c2WriteFileResponse := PTCheckIfCallbacksAliveMessageResponse{}
	exclusiveQueue := true
	opsecBytes, err := json.Marshal(sendMsg)
	if err != nil {
		logging.LogError(err, "Failed to convert sendMsg to JSON", "sendMsg", sendMsg)
		return nil, err
	}
	response, err := r.SendRPCMessage(
		MYTHIC_EXCHANGE,
		GetPtCheckIfCallbacksAliveRoutingKey(sendMsg.ContainerName),
		opsecBytes,
		exclusiveQueue,
	)
	if err != nil {
		return nil, err
	}
	err = json.Unmarshal(response, &c2WriteFileResponse)
	if err != nil {
		logging.LogError(err, "Failed to parse SendPTRPCCheckIfCallbacksAlive response back to struct", "response", response)
		return nil, err
	}
	return &c2WriteFileResponse, nil
}
