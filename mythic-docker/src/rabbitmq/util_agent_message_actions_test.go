package rabbitmq

import (
	"fmt"
	"slices"
	"testing"

	"github.com/mitchellh/mapstructure"
)

type benchmarkAgentMessagePostResponseMessage struct {
	Responses []agentMessagePostResponse `json:"responses" mapstructure:"responses" xml:"responses"`
	Other     map[string]interface{}     `json:"-" mapstructure:",remain"`
}

var benchmarkDecodedPostResponseMessage decodedAgentMessagePostResponseMessage
var benchmarkWholeArrayPostResponseMessage benchmarkAgentMessagePostResponseMessage

func TestDecodeAgentMessagePostResponseMessageIsolatesMalformedResponses(t *testing.T) {
	incoming := map[string]interface{}{
		"action":         "post_response",
		"batch_tracking": "batch-1",
		"responses": []interface{}{
			map[string]interface{}{
				"task_id":           "task-good",
				"user_output":       "good output",
				"response_tracking": "response-1",
			},
			map[string]interface{}{
				"task_id":           "task-bad",
				"download":          "not a download object",
				"response_tracking": "response-2",
			},
		},
	}

	decodedMessage, err := decodeAgentMessagePostResponseMessage(incoming)
	if err != nil {
		t.Fatalf("unexpected top-level decode error: %v", err)
	}
	if decodedMessage.Other["batch_tracking"] != "batch-1" {
		t.Fatalf("expected top-level tracking key to be preserved, got %#v", decodedMessage.Other)
	}
	if len(decodedMessage.Responses) != 2 {
		t.Fatalf("expected two decoded response entries, got %d", len(decodedMessage.Responses))
	}
	if decodedMessage.Responses[0].DecodeError != nil {
		t.Fatalf("expected first response to decode successfully, got %v", decodedMessage.Responses[0].DecodeError)
	}
	if decodedMessage.Responses[0].Response.Other["response_tracking"] != "response-1" {
		t.Fatalf("expected response-level tracking key to be preserved, got %#v", decodedMessage.Responses[0].Response.Other)
	}
	if decodedMessage.Responses[1].DecodeError == nil {
		t.Fatal("expected malformed response to have a decode error")
	}
	if decodedMessage.Responses[1].TaskID != "task-bad" {
		t.Fatalf("expected task_id to be recovered from malformed response, got %q", decodedMessage.Responses[1].TaskID)
	}
	if decodedMessage.Responses[1].Other["response_tracking"] != "response-2" {
		t.Fatalf("expected malformed response tracking key to be preserved, got %#v", decodedMessage.Responses[1].Other)
	}
	if _, ok := decodedMessage.Responses[1].Other["download"]; ok {
		t.Fatalf("expected consumed response key to be omitted from reflected keys, got %#v", decodedMessage.Responses[1].Other)
	}

	mythicResponse := map[string]interface{}{
		"task_id": decodedMessage.Responses[0].Response.TaskID,
		"status":  "success",
	}
	reflectBackOtherKeys(&mythicResponse, &decodedMessage.Responses[0].Response.Other)
	if mythicResponse["response_tracking"] != "response-1" {
		t.Fatalf("expected successful response tracking key to be reflected, got %#v", mythicResponse)
	}

	badMythicResponse := buildAgentMessagePostResponseDecodeError(decodedMessage.Responses[1])
	if badMythicResponse["task_id"] != "task-bad" {
		t.Fatalf("expected malformed response task_id to be reflected in error response, got %#v", badMythicResponse)
	}
	if badMythicResponse["response_tracking"] != "response-2" {
		t.Fatalf("expected malformed response tracking key to be reflected, got %#v", badMythicResponse)
	}
	if _, ok := badMythicResponse["download"]; ok {
		t.Fatalf("expected consumed malformed response key to stay out of error response, got %#v", badMythicResponse)
	}
}

func TestHandleAgentMessageGetTaskingReflectsOnlyUnusedKeys(t *testing.T) {
	replaceSubmittedTasksForProxyTest(t, nil)
	incoming := map[string]interface{}{
		"action":             "get_tasking",
		"tasking_size":       float64(-1),
		"get_delegate_tasks": false,
		"agent_tracking":     "track-me",
	}

	response, err := handleAgentMessageGetTasking(&incoming, 1)
	if err != nil {
		t.Fatalf("unexpected get_tasking error: %v", err)
	}
	if response["agent_tracking"] != "track-me" {
		t.Fatalf("expected custom get_tasking tracking key to be reflected, got %#v", response)
	}
	if _, ok := response["tasking_size"]; ok {
		t.Fatalf("expected consumed tasking_size key to be omitted from response, got %#v", response)
	}
	if _, ok := response["get_delegate_tasks"]; ok {
		t.Fatalf("expected consumed get_delegate_tasks key to be omitted from response, got %#v", response)
	}
	if _, ok := incoming["tasking_size"]; ok {
		t.Fatalf("expected tasking_size to be removed after get_tasking processing, got %#v", incoming)
	}
	if incoming["get_delegate_tasks"] != false {
		t.Fatalf("expected get_delegate_tasks to remain for outer delegate processing, got %#v", incoming)
	}
}

func TestSelectAgentMessageTaskIDsForIssueMatchesDirectTaskingOrder(t *testing.T) {
	taskIDs := []int{5, 2, 9, 1}

	if selected := selectAgentMessageTaskIDsForIssue(taskIDs, 0); len(selected) != 0 {
		t.Fatalf("expected no issued task IDs for tasking_size 0, got %#v", selected)
	}
	if selected := selectAgentMessageTaskIDsForIssue(taskIDs, 2); !slices.Equal(selected, []int{1, 2}) {
		t.Fatalf("expected first two task IDs in ascending DB order, got %#v", selected)
	}
	if selected := selectAgentMessageTaskIDsForIssue(taskIDs, -1); !slices.Equal(selected, []int{1, 2, 5, 9}) {
		t.Fatalf("expected all task IDs in ascending DB order, got %#v", selected)
	}
	if selected := selectAgentMessageTaskIDsForIssue(taskIDs, 99); !slices.Equal(selected, []int{1, 2, 5, 9}) {
		t.Fatalf("expected all task IDs when tasking_size exceeds pending count, got %#v", selected)
	}
	if !slices.Equal(taskIDs, []int{5, 2, 9, 1}) {
		t.Fatalf("expected original task ID slice to remain unchanged, got %#v", taskIDs)
	}
}

func BenchmarkDecodeAgentMessagePostResponseMessage(b *testing.B) {
	benchmarks := []struct {
		name          string
		responseCount int
		badIndex      int
	}{
		{name: "valid_1", responseCount: 1, badIndex: -1},
		{name: "valid_10", responseCount: 10, badIndex: -1},
		{name: "valid_100", responseCount: 100, badIndex: -1},
		{name: "one_bad_10", responseCount: 10, badIndex: 5},
		{name: "one_bad_100", responseCount: 100, badIndex: 50},
	}

	for _, benchmark := range benchmarks {
		incoming := buildBenchmarkPostResponseMessage(benchmark.responseCount, benchmark.badIndex)
		b.Run("whole_array_mapstructure/"+benchmark.name, func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				var decoded benchmarkAgentMessagePostResponseMessage
				_ = mapstructure.Decode(incoming, &decoded)
				benchmarkWholeArrayPostResponseMessage = decoded
			}
		})
		b.Run("per_response_decode/"+benchmark.name, func(b *testing.B) {
			b.ReportAllocs()
			for i := 0; i < b.N; i++ {
				decoded, _ := decodeAgentMessagePostResponseMessage(incoming)
				benchmarkDecodedPostResponseMessage = decoded
			}
		})
	}
}

func buildBenchmarkPostResponseMessage(responseCount int, badIndex int) map[string]interface{} {
	responses := make([]interface{}, 0, responseCount)
	for i := 0; i < responseCount; i++ {
		response := map[string]interface{}{
			"task_id":           fmt.Sprintf("task-%d", i),
			"completed":         i%3 == 0,
			"status":            "processed",
			"user_output":       fmt.Sprintf("output-%d", i),
			"stdout":            fmt.Sprintf("stdout-%d", i),
			"stderr":            fmt.Sprintf("stderr-%d", i),
			"sequence_num":      int64(i),
			"response_tracking": fmt.Sprintf("response-tracking-%d", i),
		}
		if i == badIndex {
			response["download"] = "not a download object"
		}
		responses = append(responses, response)
	}
	return map[string]interface{}{
		"action":         "post_response",
		"batch_tracking": "batch-tracking",
		"responses":      responses,
	}
}
