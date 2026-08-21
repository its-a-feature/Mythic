package rabbitmq

import (
	"encoding/json"
	"fmt"
	"sync"
	"testing"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
)

func isolatePendingAgentRPCResponses(t *testing.T) {
	t.Helper()
	pendingAgentRPCResponses.Lock()
	original := pendingAgentRPCResponses.responsesByCallbackID
	pendingAgentRPCResponses.responsesByCallbackID = make(map[int][]PTTaskAgentRPCMessageResponse)
	pendingAgentRPCResponses.Unlock()
	t.Cleanup(func() {
		pendingAgentRPCResponses.Lock()
		pendingAgentRPCResponses.responsesByCallbackID = original
		pendingAgentRPCResponses.Unlock()
	})
}

func TestDecodeAgentMessagePostResponseAgentRPC(t *testing.T) {
	incoming := map[string]interface{}{
		"responses": []interface{}{
			map[string]interface{}{
				"task_id": "agent-task-id",
				"agent_rpc": map[string]interface{}{
					"name": "lookup",
					"arguments": map[string]interface{}{
						"items": []interface{}{"one", float64(2), true},
					},
				},
				"tracking": "keep-me",
			},
		},
	}

	decoded, err := decodeAgentMessagePostResponseMessage(incoming)
	if err != nil {
		t.Fatalf("unexpected decode error: %v", err)
	}
	if len(decoded.Responses) != 1 || decoded.Responses[0].DecodeError != nil {
		t.Fatalf("unexpected decoded responses: %#v", decoded.Responses)
	}
	agentRPC := decoded.Responses[0].Response.AgentRPC
	if agentRPC == nil {
		t.Fatal("expected agent_rpc to decode")
	}
	if agentRPC.Name != "lookup" {
		t.Fatalf("expected RPC name lookup, got %q", agentRPC.Name)
	}
	arguments, ok := agentRPC.Arguments.(map[string]interface{})
	if !ok {
		t.Fatalf("expected map arguments, got %T", agentRPC.Arguments)
	}
	if _, ok = arguments["items"]; !ok {
		t.Fatalf("expected nested arguments to survive decode, got %#v", arguments)
	}
	if _, ok = decoded.Responses[0].Response.Other["agent_rpc"]; ok {
		t.Fatalf("agent_rpc must not be reflected as an unknown key: %#v", decoded.Responses[0].Response.Other)
	}
	if decoded.Responses[0].Response.Other["tracking"] != "keep-me" {
		t.Fatalf("expected tracking key to remain, got %#v", decoded.Responses[0].Response.Other)
	}
}

func TestPTTaskAgentRPCWireContractAndRouting(t *testing.T) {
	message := PTTaskAgentRPCMessage{
		TaskData: PTTaskMessageAllData{
			PayloadType:        "apollo",
			CommandPayloadType: "command-augment",
			Task: PTTaskMessageTaskData{
				AgentTaskID: "agent-task-id",
			},
		},
		Name:      "lookup",
		Arguments: []interface{}{"one", float64(2), nil},
	}
	encoded, err := json.Marshal(message)
	if err != nil {
		t.Fatalf("failed to marshal request: %v", err)
	}
	decoded := map[string]interface{}{}
	if err = json.Unmarshal(encoded, &decoded); err != nil {
		t.Fatalf("failed to unmarshal request: %v", err)
	}
	if decoded["name"] != "lookup" {
		t.Fatalf("unexpected request JSON: %#v", decoded)
	}
	if GetPtTaskAgentRPCRoutingKey(message.TaskData.PayloadType) != "apollo_pt_task_agent_rpc" {
		t.Fatalf("request must route by callback payload type, got %q", GetPtTaskAgentRPCRoutingKey(message.TaskData.PayloadType))
	}
}

func TestPTTaskAgentRPCResponseQueueRegistration(t *testing.T) {
	for _, directQueue := range RabbitMQConnection.DirectQueues {
		if directQueue.Queue != PT_TASK_AGENT_RPC_RESPONSE {
			continue
		}
		if directQueue.RoutingKey != PT_TASK_AGENT_RPC_RESPONSE {
			t.Fatalf("unexpected response routing key: %q", directQueue.RoutingKey)
		}
		if len(directQueue.Scopes) != 1 || directQueue.Scopes[0] != mythicjwt.SCOPE_TASK_WRITE {
			t.Fatalf("agent RPC response queue must require task write scope: %#v", directQueue.Scopes)
		}
		return
	}
	t.Fatal("agent RPC response queue was not registered")
}

func TestPendingAgentRPCResponsesAreFIFOIsolatedAndDeliveredOnce(t *testing.T) {
	isolatePendingAgentRPCResponses(t)

	pendingAgentRPCResponses.enqueue(PTTaskAgentRPCMessageResponse{
		CallbackID:  1,
		AgentTaskID: "task-one",
		Status:      "success",
		Output:      map[string]interface{}{"index": 1},
	})
	pendingAgentRPCResponses.enqueue(PTTaskAgentRPCMessageResponse{
		CallbackID:  1,
		AgentTaskID: "task-two",
		Status:      "custom",
		Output:      []interface{}{"two"},
	})
	pendingAgentRPCResponses.enqueue(PTTaskAgentRPCMessageResponse{
		CallbackID:  2,
		AgentTaskID: "other-callback",
		Status:      "success",
		Output:      nil,
	})

	captured := pendingAgentRPCResponses.drain(1)
	if len(captured) != 2 || captured[0].AgentTaskID != "task-one" || captured[1].AgentTaskID != "task-two" {
		t.Fatalf("expected FIFO callback results, got %#v", captured)
	}

	// Simulate a result arriving while the captured check-in is being
	// processed. It must remain queued for the following check-in.
	pendingAgentRPCResponses.enqueue(PTTaskAgentRPCMessageResponse{
		CallbackID:  1,
		AgentTaskID: "task-next-checkin",
		Status:      "success",
		Output:      "later",
	})

	response := map[string]interface{}{
		CALLBACK_MESSAGE_KEY_RESPONSES: []map[string]interface{}{
			{"task_id": "current-ack", "status": "success"},
		},
	}
	appendPendingAgentRPCResponses(&response, captured)
	responses, ok := response[CALLBACK_MESSAGE_KEY_RESPONSES].([]map[string]interface{})
	if !ok {
		t.Fatalf("unexpected responses type: %T", response[CALLBACK_MESSAGE_KEY_RESPONSES])
	}
	if len(responses) != 3 {
		t.Fatalf("expected current acknowledgement plus two queued results, got %#v", responses)
	}
	if responses[0]["task_id"] != "current-ack" || responses[1]["task_id"] != "task-one" || responses[2]["task_id"] != "task-two" {
		t.Fatalf("expected acknowledgements first and queued FIFO results after, got %#v", responses)
	}
	if _, ok = responses[1]["output"]; !ok {
		t.Fatalf("queued response must contain output: %#v", responses[1])
	}
	if len(pendingAgentRPCResponses.drain(1)) != 1 {
		t.Fatal("result arriving during the check-in should be held for the next check-in")
	}
	if len(pendingAgentRPCResponses.drain(1)) != 0 {
		t.Fatal("drained responses must be delivered at most once")
	}
	other := pendingAgentRPCResponses.drain(2)
	if len(other) != 1 || other[0].AgentTaskID != "other-callback" {
		t.Fatalf("callback queues must be isolated, got %#v", other)
	}
}

func TestPendingAgentRPCResponsesConcurrentEnqueue(t *testing.T) {
	isolatePendingAgentRPCResponses(t)
	const responseCount = 200
	var waitGroup sync.WaitGroup
	for index := 0; index < responseCount; index++ {
		waitGroup.Add(1)
		go func(index int) {
			defer waitGroup.Done()
			pendingAgentRPCResponses.enqueue(PTTaskAgentRPCMessageResponse{
				CallbackID:  7,
				AgentTaskID: fmt.Sprintf("task-%d", index),
				Status:      "success",
				Output:      index,
			})
		}(index)
	}
	waitGroup.Wait()

	responses := pendingAgentRPCResponses.drain(7)
	if len(responses) != responseCount {
		t.Fatalf("expected %d concurrent responses, got %d", responseCount, len(responses))
	}
}
