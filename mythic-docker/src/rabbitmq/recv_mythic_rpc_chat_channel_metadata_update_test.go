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
