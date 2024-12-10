package rabbitmq

import (
	"encoding/base64"
	"errors"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	"github.com/its-a-feature/Mythic/database/enums/PushC2Connections"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
	"time"
)

func processAgentMessageFromPushC2() {
	agentMessageChannel := grpc.PushC2Server.GetRabbitMqProcessAgentMessageChannel()
	for {
		agentMessageToProcess := <-agentMessageChannel
		//logging.LogDebug("got new connected pushC2 channel")
		// spin off a goroutine to handle this connection
		go func(newConnection grpc.PushC2ServerConnected) {
			for {
				select {
				case agentMessage := <-newConnection.PushC2MessagesToMythic:
					//logging.LogDebug("about to recursively process agent message")
					messageResponse := recursiveProcessAgentMessage(&AgentMessageRawInput{
						C2Profile:         agentMessage.C2Profile,
						RemoteIP:          agentMessage.RemoteIP,
						RawMessage:        agentMessage.RawMessage,
						Base64Message:     agentMessage.Base64Message,
						Base64Response:    agentMessage.Base64Message != nil,
						UpdateCheckinTime: agentMessage.UpdateCheckinTime,
						TrackingID:        agentMessage.TrackingID,
					})
					//logging.LogDebug("finished processing message, about to send response back to grpc")
					select {
					case agentMessage.ResponseChannel <- grpc.RabbitMQProcessAgentMessageFromPushC2Response{
						Message:             messageResponse.Message,
						NewCallbackUUID:     messageResponse.NewCallbackUUID,
						OuterUuid:           messageResponse.OuterUuid,
						OuterUuidIsCallback: messageResponse.OuterUuidIsCallback,
						Err:                 messageResponse.Err,
						TrackingID:          messageResponse.TrackingID,
						AgentUUIDSize:       messageResponse.AgentUUIDSize,
					}:
					case <-time.After(grpc.PushC2Server.GetChannelTimeout()):
						err := errors.New("timeout sending agent message response back to agentMessageToProcess.ResponseChannel")
						logging.LogError(err, "not sending response back")
					}
				case <-newConnection.DisconnectProcessingChan:
					logging.LogInfo("PushC2 client disconnected, exiting routine processing messages")
					return
				}
			}
			//logging.LogDebug("sent message back to grpc")
		}(agentMessageToProcess)
	}
}
func sendMessageToDirectPushC2(callbackID int, message map[string]interface{}, updateCheckinTime bool) error {
	responseChan, callbackUUID, base64Encoded, c2ProfileName, trackingID, _, err := grpc.PushC2Server.GetPushC2ClientInfo(callbackID)
	if err != nil {
		logging.LogError(err, "Failed to get push c2 client info")
		return err
	}
	uUIDInfo, err := LookupEncryptionData(c2ProfileName, callbackUUID, updateCheckinTime)
	if err != nil {
		logging.LogError(err, "Failed to find encryption data for callback")
		return err
	}
	responseBytes, err := EncryptMessage(uUIDInfo, callbackUUID, message, base64Encoded)
	if err != nil {
		logging.LogError(err, "Failed to encrypt message")
		return err
	}
	//logging.LogDebug("new encrypted msg for push c2", "enc", string(responseBytes))
	select {
	case responseChan <- services.PushC2MessageFromMythic{
		Message:    responseBytes,
		Success:    true,
		Error:      "",
		TrackingID: trackingID,
	}:
		// everything went ok, return from this
		//logging.LogDebug("Sent message back to responseChan")
		return nil
	case <-time.After(grpc.PushC2Server.GetChannelTimeout()):
		logging.LogError(nil, "timeout trying to send to responseChannel")
		return errors.New("timeout trying to send to responseChannel")
	}

}
func isCallbackStreaming(callbackID int) bool {
	_, _, _, _, _, _, err := grpc.PushC2Server.GetPushC2ClientInfo(callbackID)
	return err == nil
}

type interceptProxyToAgentMessage struct {
	MessagesToAgent            chan proxyToAgentMessage
	InteractiveMessagesToAgent chan agentMessagePostResponseInteractive
	Message                    proxyToAgentMessage
	InteractiveMessage         agentMessagePostResponseInteractive
	ProxyType                  string
	CallbackID                 int
}

var interceptProxyToAgentMessageChan = make(chan interceptProxyToAgentMessage, 2000)

// interceptProxyDataToAgentForPushC2 checks if Proxy messages can be sent to a PushC2 agent first
func interceptProxyDataToAgentForPushC2() {
	for {
		attemptedToSend := false
		msg := <-interceptProxyToAgentMessageChan
		//logging.LogInfo("got proxy message", "data", msg.Message, "other data", msg.InteractiveMessage)
		if grpc.PushC2Server.CheckClientConnected(msg.CallbackID) > PushC2Connections.Connected {
			//logging.LogInfo("sending directly to callback")
			switch msg.ProxyType {
			case CALLBACK_PORT_TYPE_INTERACTIVE:
				_ = sendMessageToDirectPushC2(msg.CallbackID, map[string]interface{}{
					"action":      "post_response",
					msg.ProxyType: []interface{}{msg.InteractiveMessage},
				}, false)
			case CALLBACK_PORT_TYPE_SOCKS:
				fallthrough
			case CALLBACK_PORT_TYPE_RPORTFWD:
				_ = sendMessageToDirectPushC2(msg.CallbackID, map[string]interface{}{
					"action":      "post_response",
					msg.ProxyType: []interface{}{msg.Message},
				}, false)
			}
			attemptedToSend = true
		} else {
			connectedPushClient := grpc.PushC2Server.GetConnectedClients()
			for _, clientID := range connectedPushClient {
				if routablePath := callbackGraph.GetBFSPath(clientID, msg.CallbackID); routablePath != nil {
					var delegateMessages interface{}
					switch msg.ProxyType {
					case CALLBACK_PORT_TYPE_INTERACTIVE:
						delegateMessages = pushC2AgentGetDelegateProxyMessages([]interface{}{msg.InteractiveMessage}, msg.ProxyType, routablePath)
					case CALLBACK_PORT_TYPE_SOCKS:
						fallthrough
					case CALLBACK_PORT_TYPE_RPORTFWD:
						delegateMessages = pushC2AgentGetDelegateProxyMessages([]interface{}{msg.Message}, msg.ProxyType, routablePath)
					}

					if delegateMessages != nil {
						newTaskMsg := map[string]interface{}{
							"action":    "post_response",
							"delegates": delegateMessages,
						}
						_ = sendMessageToDirectPushC2(clientID, newTaskMsg, false)
						attemptedToSend = true
						break
					}
				}
			}
		}
		// if we attempted to send a message but failed, drop it, socks traffic won't generally accept it anyway if it's late
		if !attemptedToSend {
			//logging.LogInfo("Couldn't send to push c2, saving to msg")
			// we don't have a PushC2 client available, so save it like normal
			switch msg.ProxyType {
			case CALLBACK_PORT_TYPE_INTERACTIVE:
				select {
				case msg.InteractiveMessagesToAgent <- msg.InteractiveMessage:
				default:
				}
				//.LogInfo("saved to msg")
			case CALLBACK_PORT_TYPE_SOCKS:
				fallthrough
			case CALLBACK_PORT_TYPE_RPORTFWD:
				select {
				case msg.MessagesToAgent <- msg.Message:
				default:
					logging.LogError(nil, "dropping message because channel is full", "type", msg.ProxyType, "len(msg.MessagesToAgent)", len(msg.MessagesToAgent))
				}
			}
		}
	}
}

// handleAgentMessageGetInteractiveTasking when an agent checks in and there's interactive tasks waiting
func handleAgentMessageGetInteractiveTasking(callbackID int) ([]agentMessagePostResponseInteractive, error) {
	currentTasks := []databaseStructs.Task{}
	if taskIDs := submittedTasksAwaitingFetching.getInteractiveTasksForCallbackId(callbackID); len(taskIDs) > 0 {
		//logging.LogInfo("getting interactive tasks", "task ids", taskIDs)
		query, args, err := sqlx.Named(`SELECT 
    		params, parent_task_id, token_id, interactive_task_type, id
			FROM task WHERE id IN (:ids) AND parent_task_id > 0 ORDER BY id ASC`, map[string]interface{}{
			"ids": taskIDs,
		})
		if err != nil {
			logging.LogError(err, "Failed to make named statement when searching for tasks")
			return nil, errors.New("failed to make statement to search for tasks")
		}
		query, args, err = sqlx.In(query, args...)
		if err != nil {
			logging.LogError(err, "Failed to do sqlx.In")
			return nil, errors.New("failed to make query to search for tasks")
		}
		query = database.DB.Rebind(query)
		if err = database.DB.Select(&currentTasks, query, args...); err != nil {
			logging.LogError(err, "Failed to exec sqlx.IN modified statement")
			return nil, errors.New("failed to search for tasks")
		}

	}
	//logging.LogInfo("getting interactive tasks", "current Tasks", currentTasks)
	var response []agentMessagePostResponseInteractive
	for _, task := range currentTasks {
		var parentTaskUUID string
		err := database.DB.Get(&parentTaskUUID, `SELECT agent_task_id FROM task WHERE id=$1`, task.ParentTaskID.Int64)
		if err != nil {
			logging.LogError(err, "Failed to fetch parent task info for interactive task")
			continue
		}

		newTask := agentMessagePostResponseInteractive{
			TaskUUID:    parentTaskUUID,
			Data:        base64.StdEncoding.EncodeToString([]byte(task.Params)),
			MessageType: InteractiveTask.MessageType(task.InteractiveTaskType.Int64),
		}

		response = append(response, newTask)
		if _, err := database.DB.Exec(`UPDATE task SET
					status=$2, status_timestamp_processing=$3
					WHERE id=$1`, task.ID, PT_TASK_FUNCTION_STATUS_COMPLETED, time.Now().UTC()); err != nil {
			logging.LogError(err, "Failed to update interactive task status to completed")
		} else {
			submittedTasksAwaitingFetching.removeTask(task.ID)
		}
	}
	return response, nil

}

// pushC2AgentMessageGetTasking return a normal get_tasking message for a specific task
func pushC2AgentMessageGetTasking(taskId int) (map[string]interface{}, error) {
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT 
    		agent_task_id, "timestamp", command_name, params, id, token_id, parent_task_id,
    		is_interactive_task, interactive_task_type
			FROM task WHERE id = $1`, taskId)
	if err != nil {
		logging.LogError(err, "Failed to fetch task data")
		return nil, err
	}
	if task.IsInteractiveTask {
		// we need to get the parent_task's agent_task_id
		var parentTaskUUID string
		if err := database.DB.Get(&parentTaskUUID, `SELECT agent_task_id FROM task WHERE id=$1`, task.ParentTaskID.Int64); err != nil {
			logging.LogError(err, "Failed to fetch parent task data")
			return nil, err
		}
		newTask := agentMessagePostResponseInteractive{
			TaskUUID:    parentTaskUUID,
			Data:        base64.StdEncoding.EncodeToString([]byte(task.Params)),
			MessageType: InteractiveTask.MessageType(task.InteractiveTaskType.Int64),
		}
		if _, err := database.DB.Exec(`UPDATE task SET
					status=$2, status_timestamp_processing=$3, status_timestamp_processed=$3, completed=true
					WHERE id=$1`, task.ID, PT_TASK_FUNCTION_STATUS_COMPLETED, time.Now().UTC()); err != nil {
			logging.LogError(err, "Failed to update interactive task status to completed")
			return nil, err
		} else {
			response := map[string]interface{}{
				"action": "get_tasking",
			}
			response[CALLBACK_PORT_TYPE_INTERACTIVE] = []agentMessagePostResponseInteractive{newTask}
			return response, nil
		}
	} else {
		newTask := agentMessageGetTaskingTask{
			Command:    task.CommandName,
			Parameters: task.Params,
			ID:         task.AgentTaskID,
			Timestamp:  task.Timestamp.Unix(),
		}
		if task.TokenID.Valid {
			var tokenID int
			if err := database.DB.Get(&tokenID, `SELECT token_id FROM token WHERE id=$1`, task.TokenID.Int64); err != nil {
				logging.LogError(err, "failed to get token information")
			} else {
				newTask.Token = &tokenID
			}
		}
		if _, err := database.DB.Exec(`UPDATE task SET
					status=$2, status_timestamp_processing=$3
					WHERE id=$1`, task.ID, PT_TASK_FUNCTION_STATUS_PROCESSING, time.Now().UTC()); err != nil {
			logging.LogError(err, "Failed to update task status to processing")
			return nil, err
		} else {
			go addMitreAttackTaskMapping(task.ID)
		}
		response := map[string]interface{}{
			"action": "get_tasking",
		}
		response["tasks"] = []agentMessageGetTaskingTask{newTask}
		return response, nil
	}

}

// pushC2AgentGetDelegateTaskMessages return a wrapped get_tasking message for a specific task
func pushC2AgentGetDelegateTaskMessages(taskId int, callbackId int, routablePath []cbGraphAdjMatrixEntry) []delegateMessageResponse {
	// check to see if there's other submitted tasking that is routable through our callback
	delegateMessages := []delegateMessageResponse{}
	// there's a route between our callback and the target callback for some sort of task
	//logging.LogDebug("task exists for callback we can route to")
	currentTasks := []databaseStructs.Task{}
	taskIDs := submittedTasksAwaitingFetching.getTasksForCallbackId(callbackId)
	taskIDs = append(taskIDs, submittedTasksAwaitingFetching.getInteractiveTasksForCallbackId(callbackId)...)
	taskIDs = append(taskIDs, taskId)
	if query, args, err := sqlx.Named(`SELECT 
						agent_task_id, "timestamp", command_name, params, id, token_id, is_interactive_task,
						interactive_task_type, parent_task_id
						FROM task WHERE id IN (:ids) ORDER BY id ASC`, map[string]interface{}{
		"ids": taskIDs,
	}); err != nil {
		logging.LogError(err, "Failed to make named statement when searching for tasks")
		return nil
	} else if query, args, err := sqlx.In(query, args...); err != nil {
		logging.LogError(err, "Failed to do sqlx.In")
		return nil
	} else {
		query = database.DB.Rebind(query)
		if err := database.DB.Select(&currentTasks, query, args...); err != nil {
			logging.LogError(err, "Failed to exec sqlx.IN modified statement")
			return nil
		}
	}
	for i := 0; i < len(currentTasks); i++ {
		// now that we have a path, need to recursively encrypt and wrap
		var tokenID int
		if currentTasks[i].TokenID.Valid {
			if err := database.DB.Get(&tokenID, `SELECT token_id FROM token WHERE id=$1`, currentTasks[i].TokenID.Int64); err != nil {
				logging.LogError(err, "failed to get token information")
			}
		}
		var newTask map[string]interface{}
		newStatus := PT_TASK_FUNCTION_STATUS_PROCESSING
		if currentTasks[i].IsInteractiveTask {
			parentTaskUUID := ""
			err := database.DB.Get(&parentTaskUUID, `SELECT agent_task_id FROM task WHERE id=$1`, currentTasks[i].ParentTaskID)
			if err != nil {
				logging.LogError(err, "Failed to get parent task id from interactive task")
				submittedTasksAwaitingFetching.removeTask(currentTasks[i].ID)
				return nil
			}
			newTask = map[string]interface{}{
				"action": "get_tasking",
				CALLBACK_PORT_TYPE_INTERACTIVE: []agentMessagePostResponseInteractive{
					{
						TaskUUID:    parentTaskUUID,
						MessageType: InteractiveTask.MessageType(currentTasks[i].InteractiveTaskType.Int64),
						Data:        base64.StdEncoding.EncodeToString([]byte(currentTasks[i].Params)),
					},
				},
			}
			newStatus = PT_TASK_FUNCTION_STATUS_COMPLETED
			if _, err := database.DB.Exec(`UPDATE task SET
							status=$2, status_timestamp_processing=$3, status_timestamp_processed=$3, completed=true
							WHERE id=$1`, currentTasks[i].ID, newStatus, time.Now().UTC()); err != nil {
				logging.LogError(err, "Failed to update task status to processing")
			}
		} else {
			newTask = map[string]interface{}{
				"action": "get_tasking",
				"tasks": []agentMessageGetTaskingTask{
					{
						Command:    currentTasks[i].CommandName,
						Parameters: currentTasks[i].Params,
						ID:         currentTasks[i].AgentTaskID,
						Timestamp:  currentTasks[i].Timestamp.Unix(),
						Token:      &tokenID,
					},
				},
			}
			if _, err := database.DB.Exec(`UPDATE task SET
							status=$2, status_timestamp_processing=$3
							WHERE id=$1`, currentTasks[i].ID, newStatus, time.Now().UTC()); err != nil {
				logging.LogError(err, "Failed to update task status to processing")
			}
		}

		if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, true); err != nil {
			logging.LogError(err, "Failed to recursively encrypt message")
		} else {
			submittedTasksAwaitingFetching.removeTask(currentTasks[i].ID)
			go addMitreAttackTaskMapping(currentTasks[i].ID)
			delegateMessages = append(delegateMessages, delegateMessageResponse{
				Message:       string(wrappedMessage),
				SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
				C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
			})
		}
	}
	return delegateMessages
}

func pushC2AgentGetDelegateProxyMessages(messages []interface{}, portType string, routablePath []cbGraphAdjMatrixEntry) []delegateMessageResponse {
	delegateMessages := []delegateMessageResponse{}
	newTask := map[string]interface{}{
		"action": "get_tasking",
		portType: messages,
	}
	if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, true); err != nil {
		logging.LogError(err, "Failed to recursively encrypt message")
		return nil
	} else {
		delegateMessages = append(delegateMessages, delegateMessageResponse{
			Message:       string(wrappedMessage),
			SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
			C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
		})
	}
	return delegateMessages
}
