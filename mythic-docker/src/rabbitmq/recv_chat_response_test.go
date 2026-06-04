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
			"special_type": "mcp_tool_confirmation",
			"mcp_confirmation_required": true,
			"mcp_tool_confirmation": {
				"status": "pending",
				"server_name": "docs",
				"tool_name": "docs_search",
				"arguments": {"query": "metadata"},
				"read_only": false,
				"custom_confirmation_key": "kept"
			}
		}
	}`), &message)
	if err != nil {
		t.Fatalf("failed to unmarshal metadata: %v", err)
	}

	if message.Metadata.SpecialType != ChatMessageSpecialTypeMCPToolConfirmation {
		t.Fatalf("special type was not parsed: %q", message.Metadata.SpecialType)
	}
	if message.Metadata.MCPToolConfirmation == nil {
		t.Fatal("missing MCP tool confirmation metadata")
	}
	if message.Metadata.MCPToolConfirmation.ReadOnly == nil || *message.Metadata.MCPToolConfirmation.ReadOnly {
		t.Fatal("read_only=false must be preserved for confirmation cards")
	}
	if message.Metadata.Other["model"] != "basic_chat" {
		t.Fatalf("unknown top-level key was not preserved: %#v", message.Metadata.Other)
	}
	if message.Metadata.MCPToolConfirmation.Other["custom_confirmation_key"] != "kept" {
		t.Fatalf("unknown nested key was not preserved: %#v", message.Metadata.MCPToolConfirmation.Other)
	}

	serialized := message.Metadata.StructValue()
	confirmation := serialized["mcp_tool_confirmation"].(map[string]interface{})
	if confirmation["read_only"] != false {
		t.Fatalf("read_only=false missing from serialized confirmation: %#v", confirmation)
	}
	if serialized["model"] != "basic_chat" {
		t.Fatalf("unknown top-level key missing from serialized metadata: %#v", serialized)
	}
}
