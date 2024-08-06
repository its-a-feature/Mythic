package grpc

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
	"io"
	"sync"
	"time"
)

func (t *pushC2Server) StartPushC2StreamingOneToMany(stream services.PushC2_StartPushC2StreamingOneToManyServer) error {
	var c2ProfileName string
	var rawMessage *[]byte
	var base64Message *[]byte
	rabbitmqProcessAgentMessageResponseChannel := make(chan RabbitMQProcessAgentMessageFromPushC2Response, 2)
	rabbitmqProcessAgentMessageToMythicChannel := make(chan RabbitMQProcessAgentMessageFromPushC2, 1)
	disconnectChannel := make(chan bool)
	newPushConnectionChannel := t.GetRabbitMqProcessAgentMessageChannel()
	// make channel with 2 in case something happens and disconnects the client before mythic responds
	// don't want to block mythic accidentally
	newPushConnectionChannel <- PushC2ServerConnected{
		PushC2MessagesToMythic:   rabbitmqProcessAgentMessageToMythicChannel,
		DisconnectProcessingChan: disconnectChannel,
	}
	defer func() {
		disconnectChannel <- true
	}()
	for {
		// first get a message from stream, process it, and see what we're dealing with
		fromAgent, err := stream.Recv()
		if err == io.EOF {
			logging.LogDebug("Client closed before ever sending anything, err is EOF")
			return nil // the client closed before ever sending anything
		} else if err != nil {
			logging.LogError(err, "Client ran into an error before sending anything")
			return err
		}
		c2ProfileName = fromAgent.GetC2ProfileName()
		if c2ProfileName == "" {
			logging.LogError(nil, "failed to get c2 profile name from c2 connection")
			return errors.New("failed to get c2 profile name from connection")
		}

		newPushMessageFromMythicChannel, err := t.addNewPushC2OneToManyClient(c2ProfileName)
		if err != nil {
			// mythic can't keep track of the new connection for some reason, abort it
			logging.LogError(err, "Failed to add new channels to listen for connections")
			return err
		}
		logging.LogDebug("Got new push c2 for one-to-many", "c2", c2ProfileName)
		failedReadFromAgent := make(chan bool)
		go func() {
			// continue to read new messages from the agent, these should realistically only be
			// responses and streamed data based on what we push to the agent, but doesn't matter
			for {
				fromAgent, err = stream.Recv()
				if err == io.EOF {
					logging.LogDebug("Client closed before ever sending anything, err is EOF")
					failedReadFromAgent <- true // the client closed before ever sending anything
					return
				} else if err != nil {
					logging.LogError(err, "Client ran into an error before sending anything")
					failedReadFromAgent <- true
					return
				}
				if fromAgent.AgentDisconnected {
					go updatePushC2OneToManyLastCheckinDisconnectTimestamp(c2ProfileName, fromAgent.TrackingID)
					continue
				}
				if len(fromAgent.Message) > 0 {
					rawMessage = &fromAgent.Message
				} else {
					rawMessage = nil
				}
				if len(fromAgent.Base64Message) > 0 {
					base64Message = &fromAgent.Base64Message
				} else {
					base64Message = nil
				}
				// send the agent message along to Mythic for processing and catch response
				select {
				case rabbitmqProcessAgentMessageToMythicChannel <- RabbitMQProcessAgentMessageFromPushC2{
					C2Profile:       c2ProfileName,
					ResponseChannel: rabbitmqProcessAgentMessageResponseChannel,
					RawMessage:      rawMessage,
					Base64Message:   base64Message,
					RemoteIP:        fromAgent.GetRemoteIP(),
					TrackingID:      fromAgent.TrackingID,
				}:
				case <-time.After(t.GetChannelTimeout()):
					err = errors.New("timeout sending to rabbitmqProcessAgentMessageChannel")
					logging.LogError(err, "gRPC stream connection needs to exit due to timeouts")
					failedReadFromAgent <- true
					return
				}
				var fromMythicResponse RabbitMQProcessAgentMessageFromPushC2Response
				select {
				case fromMythicResponse = <-rabbitmqProcessAgentMessageResponseChannel:
				case <-time.After(t.GetChannelTimeout()):
					err = errors.New("timeout receiving msg from mythic to channel")
					logging.LogError(err, "gRPC stream connection needs to exit due to timeouts")
					failedReadFromAgent <- true
					return
				}
				go updatePushC2OneToManyLastCheckinConnectTimestamp(fromMythicResponse, len(fromAgent.Base64Message) > 0, c2ProfileName)
				if fromMythicResponse.Err != nil {
					// mythic encountered an error with the first message from the agent, return error and wait for the next
					err = stream.Send(&services.PushC2MessageFromMythic{
						Success:    false,
						Error:      fromMythicResponse.Err.Error(),
						Message:    nil,
						TrackingID: fromMythicResponse.TrackingID,
					})
					if err != nil {
						// we failed to send the message back to the agent, bail
						// not tracking any full listening callback yet, so nothing to mark closed
						failedReadFromAgent <- true
						return
					}
					// successfully sent our error message, re-loop waiting for next message
					continue
				}
				err = stream.Send(&services.PushC2MessageFromMythic{
					Success:    true,
					Error:      "",
					Message:    fromMythicResponse.Message,
					TrackingID: fromMythicResponse.TrackingID,
				})
				if err != nil {
					// we failed to send the message back to the agent, bail
					// not tracking any full listening callback yet, so nothing to mark closed
					failedReadFromAgent <- true
					return
				}
			}
		}()
		for {
			// now that we have seen at least one message from this agent, we can push new messages
			//logging.LogInfo("pushc2 stream waiting to hear from Mythic to send to agent")
			select {
			case <-failedReadFromAgent:
				logging.LogError(nil, "hit error reading and processing message from agent, bailing")
				t.SetPushC2OneToManyChannelExited(c2ProfileName)
				go updatePushC2OneToManyLastCheckinDisconnectTimestamp(c2ProfileName, "")
				return errors.New(fmt.Sprintf("c2 disconnected: %s", c2ProfileName))
			case <-stream.Context().Done():
				// something closed the grpc connection, bail out
				logging.LogError(stream.Context().Err(), fmt.Sprintf("c2 disconnected: %s", c2ProfileName))
				t.SetPushC2OneToManyChannelExited(c2ProfileName)
				go updatePushC2OneToManyLastCheckinDisconnectTimestamp(c2ProfileName, "")
				return errors.New(fmt.Sprintf("c2 disconnected: %s", c2ProfileName))
			case msgToSend, ok := <-newPushMessageFromMythicChannel:
				if !ok {
					logging.LogError(nil, "got !ok from messageToSend, channel was closed for push c2")
					t.SetPushC2OneToManyChannelExited(c2ProfileName)
					go updatePushC2OneToManyLastCheckinDisconnectTimestamp(c2ProfileName, "")
					return nil
				}
				// msgToSend.Message should be in the form:
				// UUID[encrypted bytes or unencrypted data]
				//logging.LogDebug("sending message from Mythic to agent")
				err = stream.Send(&msgToSend)
				if err != nil {
					logging.LogError(err, "Failed to send message through stream to push c2")
					t.SetPushC2OneToManyChannelExited(c2ProfileName)
					go updatePushC2OneToManyLastCheckinDisconnectTimestamp(c2ProfileName, "")
					return err
				}
			}
		}
	}
}

var callbackUUIDToIDMap = make(map[string]int)
var callbackIDToOperationIDMap = make(map[int]int)

type cachedCallbackInfo struct {
	CallbackUUID  string
	Base64Encoded bool
	TrackingID    string
	AgentUUIDSize int
}

var c2ProfileToCallbackIDsMap = make(map[string]map[int]cachedCallbackInfo)
var c2ProfileToCallbackIDsMapLock sync.RWMutex

func updatePushC2OneToManyLastCheckinDisconnectTimestamp(c2ProfileName string, trackingID string) {
	c2ProfileId := -1
	c2ProfileMapPushC2MapLock.RLock()
	c2ProfileId, ok := c2ProfileMap[c2ProfileName]
	c2ProfileMapPushC2MapLock.RUnlock()
	if !ok {
		c2ProfileMapPushC2MapLock.Lock()
		err := database.DB.Get(&c2ProfileId, `SELECT id FROM c2profile WHERE "name"=$1`, c2ProfileName)
		if err != nil {
			logging.LogError(err, "failed to get c2 profile id from name")
		} else {
			c2ProfileMap[c2ProfileName] = c2ProfileId
		}
		c2ProfileMapPushC2MapLock.Unlock()
		if err != nil {
			return
		}
	}
	var callbackIDs []int
	callbacks := []databaseStructs.Callback{}
	if trackingID != "" {
		c2ProfileToCallbackIDsMapLock.Lock()
		if _, ok = c2ProfileToCallbackIDsMap[c2ProfileName]; !ok {
			c2ProfileToCallbackIDsMap[c2ProfileName] = make(map[int]cachedCallbackInfo)
		}
		for currentCallbackID := range c2ProfileToCallbackIDsMap[c2ProfileName] {
			if c2ProfileToCallbackIDsMap[c2ProfileName][currentCallbackID].TrackingID == trackingID {
				logging.LogDebug("Found matching tracking id to disconnect")
				callbackIDs = []int{currentCallbackID}
				delete(c2ProfileToCallbackIDsMap[c2ProfileName], currentCallbackID)
				break
			}
		}
		c2ProfileToCallbackIDsMapLock.Unlock()
	} else {
		err := database.DB.Select(&callbacks, `SELECT
			callback.id
			FROM callback
			JOIN callbackc2profiles ON callbackc2profiles.callback_id = callback.id
			WHERE callback.active = true AND callbackc2profiles.c2_profile_id = $1
		`, c2ProfileId)
		if err != nil {
			if !errors.Is(err, sql.ErrNoRows) {
				logging.LogError(err, "Failed to get callbacks associated with c2 profile one-to-many disconnect")
			}
			return
		}
		callbackIDs = make([]int, len(callbacks))
		for i, _ := range callbacks {
			callbackIDs[i] = callbacks[i].ID
		}
	}
	query, args, err := sqlx.Named(`UPDATE callback SET last_checkin=:last_checkin WHERE id IN (:ids)`,
		map[string]interface{}{"last_checkin": time.Now().UTC(), "ids": callbackIDs})
	if err != nil {
		logging.LogError(err, "Failed to make named statement for updating last checkin of callback ids")
		return
	}
	query, args, err = sqlx.In(query, args...)
	if err != nil {
		logging.LogError(err, "Failed to do sqlx.In for updating last checkin of callback ids")
		return
	}
	query = database.DB.Rebind(query)
	_, err = database.DB.Exec(query, args...)
	if err != nil {
		logging.LogError(err, "Failed to update callback time when push one-to-many c2 disconnected")
		return
	}
	for _, callbackID := range callbackIDs {
		_, err = database.DB.Exec(`UPDATE callbackgraphedge SET 
		 end_timestamp=$1 WHERE source_id=$2 and destination_id=$3 and c2_profile_id=$4
		 and end_timestamp IS NULL`,
			time.Now().UTC(), callbackID, callbackID, c2ProfileId)
		if err != nil {
			logging.LogError(err, "Failed to update callback edge when push c2 disconnected")
		}
		select {
		case pushC2StreamingDisconnectNotification <- callbackID:
		default:
		}
	}
	// now that the c2 disconnected, flush all the cached data about the connections
	if trackingID == "" {
		c2ProfileToCallbackIDsMapLock.Lock()
		delete(c2ProfileToCallbackIDsMap, c2ProfileName)
		c2ProfileToCallbackIDsMapLock.Unlock()
	}

}
func updatePushC2OneToManyLastCheckinConnectTimestamp(fromMythicResponse RabbitMQProcessAgentMessageFromPushC2Response,
	base64Encoded bool,
	c2ProfileName string) {
	c2ProfileId := -1
	callbackId := -1
	operationId := -1
	callbackUUID := ""
	c2ProfileMapPushC2MapLock.RLock()
	c2ProfileId, ok := c2ProfileMap[c2ProfileName]
	c2ProfileMapPushC2MapLock.RUnlock()
	if !ok {
		c2ProfileMapPushC2MapLock.Lock()
		err := database.DB.Get(&c2ProfileId, `SELECT id FROM c2profile WHERE "name"=$1`, c2ProfileName)
		if err != nil {
			logging.LogError(err, "failed to get c2 profile id from name")
		} else {
			c2ProfileMap[c2ProfileName] = c2ProfileId
		}
		c2ProfileMapPushC2MapLock.Unlock()
		if err != nil {
			return
		}
	}
	if fromMythicResponse.OuterUuidIsCallback {
		callbackUUID = fromMythicResponse.OuterUuid
		callback := databaseStructs.Callback{}
		callbackId, ok = callbackUUIDToIDMap[fromMythicResponse.OuterUuid]
		if !ok {
			err := database.DB.Get(&callback, `SELECT id, operation_id FROM callback WHERE agent_callback_id=$1`, fromMythicResponse.OuterUuid)
			if err != nil {
				logging.LogError(err, "Failed to find callback info to update connection time")
				return
			}
			callbackUUIDToIDMap[fromMythicResponse.OuterUuid] = callback.ID
			callbackIDToOperationIDMap[callback.ID] = callback.OperationID
			callbackId = callback.ID
			operationId = callback.OperationID
		} else {
			operationId = callbackIDToOperationIDMap[callbackId]
		}
	} else if fromMythicResponse.NewCallbackUUID != "" {
		callbackUUID = fromMythicResponse.NewCallbackUUID
		callbackId, ok = callbackUUIDToIDMap[fromMythicResponse.NewCallbackUUID]
		if !ok {
			callback := databaseStructs.Callback{}
			err := database.DB.Get(&callback, `SELECT id, operation_id FROM callback WHERE agent_callback_id=$1`, fromMythicResponse.NewCallbackUUID)
			if err != nil {
				logging.LogError(err, "Failed to find callback info to update connection time")
				return
			}
			callbackUUIDToIDMap[fromMythicResponse.NewCallbackUUID] = callback.ID
			callbackIDToOperationIDMap[callback.ID] = callback.OperationID
			callbackId = callback.ID
			operationId = callback.OperationID
		} else {
			operationId = callbackIDToOperationIDMap[callbackId]
		}
	} else if callbackId == -1 {
		// make sure we only save off and track callbacks, not staging sessions
		return
	}
	newConnection := false
	c2ProfileToCallbackIDsMapLock.RLock()
	if _, ok = c2ProfileToCallbackIDsMap[c2ProfileName]; !ok {
		newConnection = true
		c2ProfileToCallbackIDsMap[c2ProfileName] = make(map[int]cachedCallbackInfo)
	}
	if _, ok = c2ProfileToCallbackIDsMap[c2ProfileName][callbackId]; !ok {
		newConnection = true
		c2ProfileToCallbackIDsMap[c2ProfileName][callbackId] = cachedCallbackInfo{
			CallbackUUID:  callbackUUID,
			Base64Encoded: base64Encoded,
			TrackingID:    fromMythicResponse.TrackingID,
			AgentUUIDSize: fromMythicResponse.AgentUUIDSize,
		}
	}
	c2ProfileToCallbackIDsMapLock.RUnlock()
	if newConnection {
		_, err := database.DB.Exec(`UPDATE callback SET last_checkin=$1 WHERE id=$2`,
			time.UnixMicro(0), callbackId)
		if err != nil {
			logging.LogError(err, "Failed to update callback last checkin time")
		}
	}
	currentEdge := databaseStructs.Callbackgraphedge{}
	err := database.DB.Get(&currentEdge, `SELECT id FROM callbackgraphedge WHERE
		 source_id=$1 and destination_id=$2 and c2_profile_id=$3 and end_timestamp IS NULL`,
		callbackId, callbackId, c2ProfileId)
	if errors.Is(err, sql.ErrNoRows) {
		// no active edges, so add one
		_, err = database.DB.Exec(`INSERT INTO callbackgraphedge
						(source_id, destination_id, c2_profile_id, operation_id)
						VALUES ($1, $1, $2, $3)`,
			callbackId, c2ProfileId, operationId)
		if err != nil {
			logging.LogError(err, "Failed to add new callback graph edge", "callbackID", callbackId)
		} else {
			logging.LogInfo("Added new callbackgraph edge in pushC2 one to many", "c2", c2ProfileId, "callback", callbackId)
		}
	}
	select {
	case pushC2StreamingConnectNotification <- callbackId:
	default:
	}
}
