package rabbitmq

import (
	"encoding/json"
	"testing"
)

func TestChatContainerResponseMetadataPreservesKnownAndUnknownKeys(t *testing.T) {
	message := ChatContainerResponseMessage{}
	err := json.Unmarshal([]byte(`{
		"request_id": 10,
		"metadata": {
			"model": "basic_chat",
			"special_type": "input_requested",
			"input_requested": {
				"status": "pending",
				"input_type": "single_choice",
				"title": "Choose one",
				"prompt": "Pick a path",
				"data": {"source": "test"},
				"choices": [
					{"id": "a", "label": "A", "data": {"value": 1}, "custom_choice_key": "kept"}
				],
				"custom_input_key": "kept"
			}
		}
	}`), &message)
	if err != nil {
		t.Fatalf("failed to unmarshal metadata: %v", err)
	}

	if message.Metadata.SpecialType != ChatMessageSpecialTypeInputRequested {
		t.Fatalf("special type was not parsed: %q", message.Metadata.SpecialType)
	}
	if message.Metadata.InputRequested == nil {
		t.Fatal("missing input request metadata")
	}
	if len(message.Metadata.InputRequested.Choices) != 1 || message.Metadata.InputRequested.Choices[0].ID != "a" {
		t.Fatalf("choices must be preserved for input request cards: %#v", message.Metadata.InputRequested.Choices)
	}
	if message.Metadata.Other["model"] != "basic_chat" {
		t.Fatalf("unknown top-level key was not preserved: %#v", message.Metadata.Other)
	}
	if message.Metadata.InputRequested.Other["custom_input_key"] != "kept" {
		t.Fatalf("unknown nested key was not preserved: %#v", message.Metadata.InputRequested.Other)
	}
	if message.Metadata.InputRequested.Choices[0].Other["custom_choice_key"] != "kept" {
		t.Fatalf("unknown choice key was not preserved: %#v", message.Metadata.InputRequested.Choices[0].Other)
	}

	serialized := message.Metadata.StructValue()
	inputRequest := serialized["input_requested"].(map[string]interface{})
	if inputRequest["input_type"] != "single_choice" {
		t.Fatalf("input_type missing from serialized input request: %#v", inputRequest)
	}
	if serialized["model"] != "basic_chat" {
		t.Fatalf("unknown top-level key missing from serialized metadata: %#v", serialized)
	}
}

func TestChatContainerResponseKeyFieldsRoundTrip(t *testing.T) {
	message := ChatContainerResponseMessage{}
	err := json.Unmarshal([]byte(`{
		"request_id": 10,
		"response_key": "input_requested:abc",
		"complete_request": true,
		"content": "input required"
	}`), &message)
	if err != nil {
		t.Fatalf("failed to unmarshal response key fields: %v", err)
	}
	if message.ResponseKey != "input_requested:abc" {
		t.Fatalf("response_key was not parsed: %q", message.ResponseKey)
	}
	if !message.CompleteRequest {
		t.Fatal("complete_request was not parsed")
	}
	serialized, err := json.Marshal(message)
	if err != nil {
		t.Fatalf("failed to marshal response key fields: %v", err)
	}
	values := map[string]interface{}{}
	if err = json.Unmarshal(serialized, &values); err != nil {
		t.Fatalf("failed to unmarshal serialized response key fields: %v", err)
	}
	if values["response_key"] != "input_requested:abc" {
		t.Fatalf("response_key missing from serialized message: %#v", values)
	}
	legacyKey := "response" + "_message_id"
	if _, ok := values[legacyKey]; ok {
		t.Fatalf("legacy response id should not be serialized: %#v", values)
	}
	if values["complete_request"] != true {
		t.Fatalf("complete_request missing from serialized message: %#v", values)
	}
}
