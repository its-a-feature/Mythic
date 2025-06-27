package grpc

import (
	"database/sql"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"io"
	"sync"
	"time"
)

type RabbitMQProcessAgentMessageFromPushC2 struct {
	C2Profile         string
	RawMessage        *[]byte
	Base64Message     *[]byte
	RemoteIP          string
	UpdateCheckinTime bool
	ResponseChannel   chan RabbitMQProcessAgentMessageFromPushC2Response
	TrackingID        string
}
type RabbitMQProcessAgentMessageFromPushC2Response struct {
	Message             []byte
	NewCallbackUUID     string
	OuterUuid           string
	OuterUuidIsCallback bool
	Err                 error
	TrackingID          string
	AgentUUIDSize       int
}

func (t *pushC2Server) StartPushC2Streaming(stream services.PushC2_StartPushC2StreamingServer) error {
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
			logging.LogError(err, "Client closed before ever sending anything, err is EOF")
			return nil // the client closed before ever sending anything
		}
		if err != nil {
			logging.LogError(err, "Client ran into an error before sending anything")
			return err
		}
		c2ProfileName = fromAgent.GetC2ProfileName()
		if c2ProfileName == "" {
			logging.LogError(nil, "failed to get c2 profile name from c2 connection")
			return errors.New("failed to get c2 profile name from connection")
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
			C2Profile:         c2ProfileName,
			ResponseChannel:   rabbitmqProcessAgentMessageResponseChannel,
			RawMessage:        rawMessage,
			Base64Message:     base64Message,
			RemoteIP:          fromAgent.GetRemoteIP(),
			UpdateCheckinTime: true,
			TrackingID:        fromAgent.TrackingID,
		}:
		case <-time.After(t.GetChannelTimeout()):
			err = errors.New("timeout sending to rabbitmqProcessAgentMessageChannel")
			logging.LogError(err, "gRPC stream connection needs to exit due to timeouts")
			return err
		}
		var fromMythic RabbitMQProcessAgentMessageFromPushC2Response
		select {
		case fromMythic = <-rabbitmqProcessAgentMessageResponseChannel:
		case <-time.After(t.GetChannelTimeout()):
			err = errors.New("timeout receiving msg from mythic to channel")
			logging.LogError(err, "gRPC stream connection needs to exit due to timeouts")
			return err
		}
		if fromMythic.Err != nil {
			// mythic encountered an error with the first message from the agent, return error and wait for the next
			err = stream.Send(&services.PushC2MessageFromMythic{
				Success:    false,
				Error:      fromMythic.Err.Error(),
				Message:    nil,
				TrackingID: fromMythic.TrackingID,
			})
			if err != nil {
				// we failed to send the message back to the agent, bail
				// not tracking any full listening callback yet, so nothing to mark closed
				return err
			}
			// successfully sent our error message, re-loop waiting for next message
			continue
		}
		err = stream.Send(&services.PushC2MessageFromMythic{
			Success:    true,
			Error:      "",
			Message:    fromMythic.Message,
			TrackingID: fromMythic.TrackingID,
		})
		if err != nil {
			return err
		}
		var callbackUUID string
		if fromMythic.NewCallbackUUID != "" {
			// we just finished staging and got a new callback
			callbackUUID = fromMythic.NewCallbackUUID
		} else if fromMythic.OuterUuidIsCallback {
			// we already have an existing callback sending messages
			callbackUUID = fromMythic.OuterUuid
		} else {
			// go no further, restart the loop because we're not looking at a finished callback yet
			continue
		}
		callback := databaseStructs.Callback{
			LastCheckin:     time.UnixMicro(0),
			AgentCallbackID: callbackUUID,
		}
		err = database.DB.Get(&callback, `SELECT id, operation_id FROM callback WHERE agent_callback_id=$1`,
			callback.AgentCallbackID)
		if err != nil {
			logging.LogError(err, "Failed to find callback")
			return err
		}
		_, err = database.DB.NamedExec(`UPDATE callback SET last_checkin=:last_checkin
			WHERE agent_callback_id=:agent_callback_id`, callback)
		if err != nil {
			logging.LogError(err, "Failed to update callback last checkin time")
			return err
		}
		updatePushC2LastCheckinConnectTimestamp(callback.ID, c2ProfileName, callback.OperationID)
		// successfully processed x messages and have a new callback id to process
		// register that callback as listening
		newPushMessageFromMythicChannel, err := t.addNewPushC2Client(callback.ID, callbackUUID, base64Message != nil, c2ProfileName, fromMythic.AgentUUIDSize)
		if err != nil {
			// mythic can't keep track of the new connection for some reason, abort it
			logging.LogError(err, "Failed to add new channels to listen for connection")
			t.SetPushC2ChannelExited(callback.ID)
			//go updatePushC2LastCheckinDisconnectTimestamp(callback.ID, c2ProfileName)
			return err
		}
		logging.LogDebug("Got new push c2 agent", "agent id", callbackUUID)
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
				}
				if err != nil {
					logging.LogError(err, "Client ran into an error before sending anything")
					failedReadFromAgent <- true
					return
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
				t.SetPushC2ChannelExited(callback.ID)
				//go updatePushC2LastCheckinDisconnectTimestamp(callback.ID, c2ProfileName)
				return errors.New(fmt.Sprintf("client disconnected: %s", callbackUUID))
			case <-stream.Context().Done():
				// something closed the grpc connection, bail out
				logging.LogError(stream.Context().Err(), fmt.Sprintf("client disconnected: %s", callbackUUID))
				t.SetPushC2ChannelExited(callback.ID)
				//go updatePushC2LastCheckinDisconnectTimestamp(callback.ID, c2ProfileName)
				return errors.New(fmt.Sprintf("client disconnected: %s", callbackUUID))
			case msgToSend, ok := <-newPushMessageFromMythicChannel:
				if !ok {
					logging.LogError(nil, "got !ok from messageToSend, channel was closed for push c2")
					t.SetPushC2ChannelExited(callback.ID)
					//go updatePushC2LastCheckinDisconnectTimestamp(callback.ID, c2ProfileName)
					return nil
				}
				// msgToSend.Message should be in the form:
				// UUID[encrypted bytes or unencrypted data]
				//logging.LogDebug("sending message from Mythic to agent")
				err = stream.Send(&msgToSend)
				if err != nil {
					logging.LogError(err, "Failed to send message through stream to push c2")
					t.SetPushC2ChannelExited(callback.ID)
					//go updatePushC2LastCheckinDisconnectTimestamp(callback.ID, c2ProfileName)
					return err
				}
			}
		}
	}
}

var c2ProfileMap = make(map[string]int)
var c2ProfileMapPushC2MapLock sync.RWMutex

func updatePushC2LastCheckinDisconnectTimestamp(callbackId int, c2ProfileName string) {
	c2ProfileId := -1
	c2ProfileMapPushC2MapLock.Lock()
	if _, ok := c2ProfileMap[c2ProfileName]; ok {
		c2ProfileId = c2ProfileMap[c2ProfileName]
	} else {
		err := database.DB.Get(&c2ProfileId, `SELECT id FROM c2profile WHERE "name"=$1`, c2ProfileName)
		if err != nil {
			logging.LogError(err, "failed to get c2 profile id from name")
		} else {
			c2ProfileMap[c2ProfileName] = c2ProfileId
		}
	}
	c2ProfileMapPushC2MapLock.Unlock()
	_, err := database.DB.Exec(`UPDATE callback SET
		last_checkin=$2 WHERE id=$1`, callbackId, time.Now().UTC())
	if err != nil {
		logging.LogError(err, "Failed to update callback time when push c2 disconnected")
	}
	if c2ProfileId > 0 {
		_, err = database.DB.Exec(`UPDATE callbackgraphedge SET 
		 end_timestamp=$1 WHERE source_id=$2 and destination_id=$3 and c2_profile_id=$4
		 and end_timestamp IS NULL`,
			time.Now().UTC(), callbackId, callbackId, c2ProfileId)
		if err != nil {
			logging.LogError(err, "Failed to update callback edge when push c2 disconnected")
		}
	}
	select {
	case pushC2StreamingDisconnectNotification <- callbackId:
	default:
	}
}
func updatePushC2LastCheckinConnectTimestamp(callbackId int, c2ProfileName string, operationId int) {
	c2ProfileId := -1
	c2ProfileMapPushC2MapLock.Lock()
	if _, ok := c2ProfileMap[c2ProfileName]; ok {
		c2ProfileId = c2ProfileMap[c2ProfileName]
	} else {
		err := database.DB.Get(&c2ProfileId, `SELECT id FROM c2profile WHERE "name"=$1`, c2ProfileName)
		if err != nil {
			logging.LogError(err, "failed to get c2 profile id from name")
		} else {
			c2ProfileMap[c2ProfileName] = c2ProfileId
		}
	}
	c2ProfileMapPushC2MapLock.Unlock()
	currentEdge := databaseStructs.Callbackgraphedge{}
	err := database.DB.Get(&currentEdge, `SELECT id FROM callbackgraphedge WHERE
		 source_id=$1 and destination_id=$2 and c2_profile_id=$3 and end_timestamp IS NULL`,
		callbackId, callbackId, c2ProfileId)
	if err == sql.ErrNoRows {
		// no active edges, so add one
		_, err = database.DB.Exec(`INSERT INTO callbackgraphedge
						(source_id, destination_id, c2_profile_id, operation_id)
						VALUES ($1, $1, $2, $3)`,
			callbackId, c2ProfileId, operationId)
		if err != nil {
			logging.LogError(err, "Failed to add new callback graph edge")
		} else {
			logging.LogInfo("Added new callbackgraph edge in pushC2", "c2", c2ProfileId, "callback", callbackId)
		}
	}
	select {
	case pushC2StreamingConnectNotification <- callbackId:
	default:
	}
}
