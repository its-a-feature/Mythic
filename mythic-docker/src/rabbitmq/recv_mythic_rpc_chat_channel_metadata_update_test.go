package rabbitmq

import (
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestValidateChatChannelMetadataUpdateRejectsNonAIChannel(t *testing.T) {
	err := validateChatChannelMetadataUpdate(
		MythicRPCChatChannelMetadataUpdateMessage{
			OperationID:     1,
			ChannelID:       10,
			ContainerName:   "basic_chat",
			ChannelMetadata: map[string]interface{}{"items": []interface{}{}},
		},
		RabbitMQAuthContext{OperationID: 1},
		chatChannelMetadataUpdateTarget{
			ID:                10,
			OperationID:       1,
			ChannelType:       databaseStructs.ChatChannelTypeStandard,
			ChatContainerName: "basic_chat",
		},
	)
	if err == nil {
		t.Fatalf("expected non-AI channel to be rejected")
	}
}

func TestValidateChatChannelMetadataUpdateRejectsWrongOperation(t *testing.T) {
	err := validateChatChannelMetadataUpdate(
		MythicRPCChatChannelMetadataUpdateMessage{
			OperationID:     2,
			ChannelID:       10,
			ContainerName:   "basic_chat",
			ChannelMetadata: map[string]interface{}{"items": []interface{}{}},
		},
		RabbitMQAuthContext{OperationID: 1},
		chatChannelMetadataUpdateTarget{
			ID:                10,
			OperationID:       1,
			ChannelType:       databaseStructs.ChatChannelTypeAI,
			ChatContainerName: "basic_chat",
		},
	)
	if err == nil {
		t.Fatalf("expected mismatched input operation to be rejected")
	}
}

func TestValidateChatChannelMetadataUpdateRejectsWrongContainer(t *testing.T) {
	err := validateChatChannelMetadataUpdate(
		MythicRPCChatChannelMetadataUpdateMessage{
			OperationID:     1,
			ChannelID:       10,
			ContainerName:   "other_chat",
			ChannelMetadata: map[string]interface{}{"items": []interface{}{}},
		},
		RabbitMQAuthContext{OperationID: 1},
		chatChannelMetadataUpdateTarget{
			ID:                10,
			OperationID:       1,
			ChannelType:       databaseStructs.ChatChannelTypeAI,
			ChatContainerName: "basic_chat",
		},
	)
	if err == nil {
		t.Fatalf("expected mismatched container to be rejected")
	}
}

func TestNormalizeChatChannelMetadataPreservesAndDefaults(t *testing.T) {
	input := map[string]interface{}{
		"items": []interface{}{
			map[string]interface{}{"key": "total_cost", "value": 1.25},
		},
	}
	output := normalizeChatChannelMetadata(input)
	if output["version"] != 1 {
		t.Fatalf("expected default version 1, got %#v", output["version"])
	}
	if output["updated_at"] == "" {
		t.Fatalf("expected updated_at to be populated")
	}
	if _, ok := input["updated_at"]; ok {
		t.Fatalf("normalizeChatChannelMetadata should not mutate the caller's map")
	}
}

func TestNormalizeChatChannelMetadataDropsStatusAndPreservesColor(t *testing.T) {
	input := map[string]interface{}{
		"items": []interface{}{
			map[string]interface{}{"key": "provider", "value": "LiteLLM", "status": "neutral"},
			map[string]interface{}{
				"key":    "five_hour_tokens",
				"value":  87,
				"status": "warning",
				"color": map[string]interface{}{
					"type":   "scale",
					"source": "value",
					"stops": []interface{}{
						map[string]interface{}{"at": 0, "color": "success"},
						map[string]interface{}{"at": 75, "color": "warning"},
						map[string]interface{}{"at": 90, "color": "error"},
					},
				},
			},
		},
	}

	output := normalizeChatChannelMetadata(input)
	items, ok := output["items"].([]interface{})
	if !ok || len(items) != 2 {
		t.Fatalf("expected normalized items, got %#v", output["items"])
	}
	firstItem, ok := items[0].(map[string]interface{})
	if !ok {
		t.Fatalf("expected first item to be a map, got %#v", items[0])
	}
	if _, ok = firstItem["color"]; ok {
		t.Fatalf("expected status-only item to have no color, got %#v", firstItem["color"])
	}
	if _, ok = firstItem["status"]; ok {
		t.Fatalf("expected status to be removed from normalized item")
	}
	secondItem, ok := items[1].(map[string]interface{})
	if !ok {
		t.Fatalf("expected second item to be a map, got %#v", items[1])
	}
	if _, ok = secondItem["color"].(map[string]interface{}); !ok {
		t.Fatalf("expected explicit color scale to be preserved, got %#v", secondItem["color"])
	}
	if _, ok = secondItem["status"]; ok {
		t.Fatalf("expected status to be removed when color is explicit")
	}
	originalItem := input["items"].([]interface{})[0].(map[string]interface{})
	if _, ok = originalItem["color"]; ok {
		t.Fatalf("normalizeChatChannelMetadata should not mutate caller item maps")
	}
}
