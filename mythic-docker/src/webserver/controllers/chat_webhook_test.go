package webcontroller

import (
	"encoding/json"
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestGetAIModelSlashCommandsDecodesJSONStringSubscriptions(t *testing.T) {
	model := map[string]interface{}{
		"name":        "LiteLLM Tools",
		"description": "tool model",
		"metadata": map[string]interface{}{
			"slash_commands": []map[string]interface{}{
				{"name": "help", "description": "show help"},
			},
		},
	}
	modelBytes, err := json.Marshal(model)
	if err != nil {
		t.Fatalf("failed to marshal model subscription: %v", err)
	}
	subscriptionsBytes, err := json.Marshal([]string{string(modelBytes)})
	if err != nil {
		t.Fatalf("failed to marshal subscriptions: %v", err)
	}
	container := databaseStructs.ConsumingContainer{
		Subscriptions: databaseStructs.MythicJSONArray(subscriptionsBytes),
	}

	commands := getAIModelSlashCommands(container, "LiteLLM Tools")
	if commands["help"].Description != "show help" {
		t.Fatalf("slash command from JSON string subscription was not decoded: %#v", commands)
	}
}

func TestDecodeAIChatModelSubscriptionAcceptsDecodedMaps(t *testing.T) {
	var model aiChatModelDefinition
	err := decodeAIChatModelSubscription(map[string]interface{}{
		"name": "Echo",
		"metadata": map[string]interface{}{
			"slash_commands": []interface{}{
				map[string]interface{}{"name": "ping", "description": "ping model"},
			},
		},
	}, &model)
	if err != nil {
		t.Fatalf("unexpected decode error: %v", err)
	}
	if model.Name != "Echo" || len(model.Metadata.SlashCommands) != 1 || model.Metadata.SlashCommands[0].Name != "ping" {
		t.Fatalf("decoded model did not preserve slash commands: %#v", model)
	}
}
