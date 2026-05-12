package rabbitmq

import (
	"database/sql"
	"errors"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
)

type callbackCheckinUpdate struct {
	CallbackID    int
	OperationID   int
	C2ProfileID   int
	C2ProfileName string
	UUID          string
}

var updateCheckinTimeChannel = make(chan callbackCheckinUpdate, 2000)

// updateCheckinTimeEverySecond coalesces frequent callback check-ins and writes
// last_checkin updates in batches. This keeps high-frequency polling from
// repeatedly walking the callback graph and issuing per-callback database writes.
func updateCheckinTimeEverySecond() {
	ticker := time.NewTicker(time.Second)
	defer ticker.Stop()
	callbackIDMap := make(map[int]callbackCheckinUpdate)

	for {
		select {
		case update := <-updateCheckinTimeChannel:
			callbackIDMap[update.CallbackID] = update
		case <-ticker.C:
			drainCallbackCheckinUpdateChannel(callbackIDMap)
			flushCallbackCheckinUpdates(callbackIDMap)
			callbackIDMap = make(map[int]callbackCheckinUpdate)
		}
	}
}

func drainCallbackCheckinUpdateChannel(callbackIDMap map[int]callbackCheckinUpdate) {
	for {
		select {
		case update := <-updateCheckinTimeChannel:
			callbackIDMap[update.CallbackID] = update
		default:
			return
		}
	}
}

func flushCallbackCheckinUpdates(callbackIDMap map[int]callbackCheckinUpdate) {
	if len(callbackIDMap) == 0 {
		return
	}
	standardCheckinIDs, streamingCheckinIDs := buildCallbackCheckinUpdateTargets(callbackIDMap)
	for callbackID := range standardCheckinIDs {
		delete(streamingCheckinIDs, callbackID)
	}
	if len(streamingCheckinIDs) > 0 {
		updateTimes(time.UnixMicro(0), callbackIDMapKeys(streamingCheckinIDs))
	}
	if len(standardCheckinIDs) > 0 {
		updateTimes(time.Now().UTC(), callbackIDMapKeys(standardCheckinIDs))
	}
}

func buildCallbackCheckinUpdateTargets(callbackIDMap map[int]callbackCheckinUpdate) (map[int]bool, map[int]bool) {
	standardCheckinIDs := make(map[int]bool)
	streamingCheckinIDs := make(map[int]bool)
	for _, update := range callbackIDMap {
		targetIDs := callbackGraph.getAllChildIDs(update.CallbackID)
		if isCallbackStreaming(update.CallbackID) {
			for _, callbackID := range targetIDs {
				streamingCheckinIDs[callbackID] = true
			}
			continue
		}
		for _, callbackID := range targetIDs {
			standardCheckinIDs[callbackID] = true
		}
	}
	return standardCheckinIDs, streamingCheckinIDs
}

func callbackIDMapKeys(callbackIDMap map[int]bool) []int {
	callbackIDs := make([]int, 0, len(callbackIDMap))
	for callbackID := range callbackIDMap {
		callbackIDs = append(callbackIDs, callbackID)
	}
	return callbackIDs
}

func enqueueCallbackCheckinUpdate(update callbackCheckinUpdate) {
	select {
	case updateCheckinTimeChannel <- update:
	default:
		logging.LogDebug("Skipping callback checkin update enqueue because channel is full", "callback_id", update.CallbackID)
	}
}

func ensureCallbackCheckinEdge(uuidInfo *cachedUUIDInfo) {
	if uuidInfo.EdgeId != 0 || uuidInfo.IsP2P {
		return
	}
	err := database.DB.Get(&uuidInfo.EdgeId, `SELECT id FROM callbackgraphedge
		WHERE source_id=$1 AND destination_id=$2 AND c2_profile_id=$3 AND operation_id=$4`,
		uuidInfo.CallbackID, uuidInfo.CallbackID, uuidInfo.C2ProfileID, uuidInfo.OperationID)
	if errors.Is(err, sql.ErrNoRows) {
		err = database.DB.Get(&uuidInfo.EdgeId, `INSERT INTO callbackgraphedge
			(source_id, destination_id, c2_profile_id, operation_id)
			VALUES ($1, $1, $2, $3)
			RETURNING id`,
			uuidInfo.CallbackID, uuidInfo.C2ProfileID, uuidInfo.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to add callback graph edge id for callback checking in",
				"c2 id", uuidInfo.C2ProfileID, "callback id", uuidInfo.CallbackID)
			return
		}
		logging.LogInfo("Added new callbackgraph edge when updating edges and checkin times",
			"c2", uuidInfo.C2ProfileID, "name", uuidInfo.C2ProfileName, "callback", uuidInfo.CallbackID)
	} else if err != nil {
		logging.LogError(err, "Failed to fetch callback graph edge id for callback checking in",
			"c2 id", uuidInfo.C2ProfileID, "callback id", uuidInfo.CallbackID)
		return
	}
	callback := databaseStructs.Callback{
		AgentCallbackID: uuidInfo.UUID,
		ID:              uuidInfo.CallbackID,
		OperationID:     uuidInfo.OperationID,
	}
	callbackGraph.Add(callback, callback, uuidInfo.C2ProfileName, true)
}

func reactivateCallbackIfNeeded(uuidInfo *cachedUUIDInfo) {
	if uuidInfo.Active {
		return
	}
	uuidInfo.Active = true
	_, err := database.DB.Exec(`UPDATE callback SET active=true WHERE id=$1`, uuidInfo.CallbackID)
	if err != nil {
		logging.LogError(err, "Failed to update active time", "callback", uuidInfo.UUID)
	}
	if uuidInfo.EdgeId > 0 {
		_, err = database.DB.Exec(`UPDATE callbackgraphedge SET
			end_timestamp=NULL
			WHERE id=$1`, uuidInfo.EdgeId)
		if err != nil {
			logging.LogError(err, "Failed to callbackgraph edges time", "callback", uuidInfo.UUID)
		}
	}
}

func emitCallbackCheckinTriggerIfNeeded(uuidInfo *cachedUUIDInfo, previousCheckin time.Time, currentCheckin time.Time) {
	if uuidInfo.TriggerOnCheckinAfterTime <= 0 {
		return
	}
	checkinDifference := int(currentCheckin.Sub(previousCheckin).Minutes())
	if checkinDifference < uuidInfo.TriggerOnCheckinAfterTime {
		return
	}
	go func(operationID int, callbackID int, oldCheckin time.Time, difference int) {
		EventingChannel <- EventNotification{
			Trigger:     eventing.TriggerCallbackCheckin,
			OperationID: operationID,
			CallbackID:  callbackID,
			Outputs: map[string]interface{}{
				"previous_checkin":   oldCheckin,
				"checkin_difference": difference,
			},
		}
	}(uuidInfo.OperationID, uuidInfo.CallbackID, previousCheckin, checkinDifference)
}

func UpdateCallbackEdgesAndCheckinTime(uuidInfo *cachedUUIDInfo) {
	uuidInfo.stateMutex.Lock()
	defer uuidInfo.stateMutex.Unlock()

	currentCheckin := time.Now().UTC()
	// only bother updating the last checkin time if it's been more than one second
	if currentCheckin.Sub(uuidInfo.LastCheckinTime).Seconds() <= 1 {
		return
	}

	previousCheckin := uuidInfo.LastCheckinTime
	enqueueCallbackCheckinUpdate(callbackCheckinUpdate{
		CallbackID:    uuidInfo.CallbackID,
		OperationID:   uuidInfo.OperationID,
		C2ProfileID:   uuidInfo.C2ProfileID,
		C2ProfileName: uuidInfo.C2ProfileName,
		UUID:          uuidInfo.UUID,
	})
	ensureCallbackCheckinEdge(uuidInfo)
	reactivateCallbackIfNeeded(uuidInfo)
	emitCallbackCheckinTriggerIfNeeded(uuidInfo, previousCheckin, currentCheckin)
	uuidInfo.LastCheckinTime = currentCheckin
}
