package rabbitmq

import (
	"encoding/json"
	"errors"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database/enums/PushC2Connections"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type pendingAgentRPCResponseQueue struct {
	sync.Mutex
	responsesByCallbackID map[int][]PTTaskAgentRPCMessageResponse
}

var pendingAgentRPCResponses pendingAgentRPCResponseQueue

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_TASK_AGENT_RPC_RESPONSE,
		RoutingKey: PT_TASK_AGENT_RPC_RESPONSE,
		Handler:    processPtTaskAgentRPCResponseMessages,
		Scopes:     []string{mythicjwt.SCOPE_TASK_WRITE},
	})
}

func validatePTTaskAgentRPCMessageResponse(response PTTaskAgentRPCMessageResponse) error {
	if response.CallbackID <= 0 {
		return errors.New("agent RPC response missing a valid callback_id")
	}
	if response.AgentTaskID == "" {
		return errors.New("agent RPC response missing agent_task_id")
	}
	if response.Status == "" {
		return errors.New("agent RPC response missing status")
	}
	return nil
}

func processPtTaskAgentRPCResponseMessages(msg amqp.Delivery) {
	response := PTTaskAgentRPCMessageResponse{}
	if err := json.Unmarshal(msg.Body, &response); err != nil {
		logging.LogError(err, "Failed to process PTTaskAgentRPCMessageResponse into struct")
		return
	}
	if err := validatePTTaskAgentRPCMessageResponse(response); err != nil {
		logging.LogError(err, "Refusing malformed agent RPC response")
		return
	}
	pendingAgentRPCResponses.enqueue(response)
}

func (q *pendingAgentRPCResponseQueue) enqueue(response PTTaskAgentRPCMessageResponse) {
	q.Lock()
	if q.responsesByCallbackID == nil {
		q.responsesByCallbackID = make(map[int][]PTTaskAgentRPCMessageResponse)
	}
	q.responsesByCallbackID[response.CallbackID] = append(q.responsesByCallbackID[response.CallbackID], response)
	defer q.Unlock()
	// before we add this for agents to pick up, see if this task can go to a pushC2 connected callback
	if grpc.PushC2Server.CheckClientConnected(response.CallbackID) > PushC2Connections.Connected {
		// we have a task directly for a pushC2 connected callback
		messages := q.responsesByCallbackID[response.CallbackID]
		newTask := map[string]interface{}{
			"action": "get_tasking",
		}
		appendPendingAgentRPCResponses(&newTask, messages)
		err := sendMessageToDirectPushC2(response.CallbackID, newTask)
		if err != nil {
			logging.LogError(err, "failed to send pushc2 task message")
		} else {
			delete(q.responsesByCallbackID, response.CallbackID)
		}
		return
	}
	// check if the task is for a linked agent of a push c2 style client
	connectedPushClient := grpc.PushC2Server.GetConnectedClients()
	for _, clientID := range connectedPushClient {
		if routablePath := callbackGraph.GetBFSPath(clientID, response.CallbackID); routablePath != nil && len(routablePath) > 0 {
			// we have a p2p path from callbackID to task.CallbackID
			delegateMessages := []delegateMessageResponse{}
			messages := q.responsesByCallbackID[response.CallbackID]
			newTask := map[string]interface{}{
				"action": "get_tasking",
			}
			appendPendingAgentRPCResponses(&newTask, messages)
			if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, false); err != nil {
				logging.LogError(err, "Failed to recursively encrypt message")
				break
			} else {
				delegateMessages = append(delegateMessages, delegateMessageResponse{
					Message:       string(wrappedMessage),
					SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
					C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
				})
			}
			if delegateMessages != nil {
				newTaskMsg := map[string]interface{}{
					"action":    "get_tasking",
					"delegates": delegateMessages,
				}
				responseChan, callbackUUID, base64Encoded, c2ProfileName, trackingID, _, err := grpc.PushC2Server.GetPushC2ClientInfo(clientID)
				//logging.LogDebug("new msg for push c2", "task", newTaskMsg)
				uUIDInfo, err := LookupEncryptionData(c2ProfileName, callbackUUID, false)
				if err != nil {
					logging.LogError(err, "Failed to find encryption data for callback")
					break
				}
				responseBytes, err := EncryptMessageWithAuthContext(uUIDInfo, callbackUUID, newTaskMsg, base64Encoded,
					getMessageProcessingAuthContext(uUIDInfo, RabbitMQAuthContext{}))
				if err != nil {
					logging.LogError(err, "Failed to encrypt message")
					break
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
					logging.LogDebug("Sent message to PushC2 Channel")
					delete(q.responsesByCallbackID, response.CallbackID)
				case <-time.After(grpc.PushC2Server.GetChannelTimeout()):
					logging.LogError(nil, "timeout trying to send to responseChannel")
				}
				return
			}
		}
	}
}
func (q *pendingAgentRPCResponseQueue) restore(callbackID int, responses []PTTaskAgentRPCMessageResponse) {
	q.Lock()
	defer q.Unlock()
	if q.responsesByCallbackID == nil {
		q.responsesByCallbackID = make(map[int][]PTTaskAgentRPCMessageResponse)
	}
	if len(responses) == 0 {
		return
	}
	if q.responsesByCallbackID[callbackID] == nil {
		q.responsesByCallbackID[callbackID] = responses
	} else {
		tempResponses := make([]PTTaskAgentRPCMessageResponse, len(responses))
		copy(tempResponses, responses)
		for _, response := range q.responsesByCallbackID[callbackID] {
			tempResponses = append(tempResponses, response)
		}
		q.responsesByCallbackID[callbackID] = tempResponses
	}
}

func (q *pendingAgentRPCResponseQueue) drain(callbackID int) []PTTaskAgentRPCMessageResponse {
	if callbackID <= 0 {
		return nil
	}
	q.Lock()
	defer q.Unlock()
	if len(q.responsesByCallbackID[callbackID]) == 0 {
		return nil
	}
	responses := append([]PTTaskAgentRPCMessageResponse(nil), q.responsesByCallbackID[callbackID]...)
	delete(q.responsesByCallbackID, callbackID)
	return responses
}

func (q *pendingAgentRPCResponseQueue) getCallbackIDs() []int {
	q.Lock()
	defer q.Unlock()
	callbackIDs := make([]int, len(q.responsesByCallbackID))
	callbackIndx := 0
	for callbackID := range q.responsesByCallbackID {
		callbackIDs[callbackIndx] = callbackID
		callbackIndx++
	}
	return callbackIDs
}

func appendPendingAgentRPCResponses(response *map[string]interface{}, pending []PTTaskAgentRPCMessageResponse) {
	if len(pending) == 0 {
		return
	}
	if *response == nil {
		*response = map[string]interface{}{
			"action": "get_tasking",
		}
	}
	responses, ok := (*response)[CALLBACK_MESSAGE_KEY_RESPONSES].([]map[string]interface{})
	if !ok {
		responses = make([]map[string]interface{}, 0, len(pending))
	}
	for _, pendingResponse := range pending {
		responses = append(responses, map[string]interface{}{
			"task_id": pendingResponse.AgentTaskID,
			"status":  pendingResponse.Status,
			"output":  pendingResponse.Output,
		})
	}
	(*response)[CALLBACK_MESSAGE_KEY_RESPONSES] = responses
}
