package rabbitmq

import (
	"encoding/json"
	"fmt"
	"strings"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCChatChannelMetadataUpdateMessage struct {
	OperationID     int                    `json:"operation_id"`
	ChannelID       int                    `json:"channel_id"`
	ContainerName   string                 `json:"container_name"`
	ChannelMetadata map[string]interface{} `json:"channel_metadata"`
}

type MythicRPCChatChannelMetadataUpdateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type chatChannelMetadataUpdateTarget struct {
	ID                int    `db:"id"`
	OperationID       int    `db:"operation_id"`
	ChannelType       string `db:"channel_type"`
	ChatContainerName string `db:"chat_container_name"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CHAT_CHANNEL_METADATA_UPDATE,
		RoutingKey: MYTHIC_RPC_CHAT_CHANNEL_METADATA_UPDATE,
		Handler:    processMythicRPCChatChannelMetadataUpdate,
		Scopes:     []string{mythicjwt.SCOPE_CHAT_AI_WRITE},
	})
}

func MythicRPCChatChannelMetadataUpdate(input MythicRPCChatChannelMetadataUpdateMessage, authContext RabbitMQAuthContext) MythicRPCChatChannelMetadataUpdateMessageResponse {
	response := MythicRPCChatChannelMetadataUpdateMessageResponse{Success: false}
	target, err := getChatChannelMetadataUpdateTarget(input.ChannelID)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	if err = validateChatChannelMetadataUpdate(input, authContext, target); err != nil {
		response.Error = err.Error()
		return response
	}
	metadata := normalizeChatChannelMetadata(input.ChannelMetadata)
	metadataJSON := GetMythicJSONTextFromStruct(metadata)
	_, err = database.DB.Exec(`UPDATE chat_channel
		SET ai_metadata = jsonb_set(COALESCE(ai_metadata, '{}'::jsonb), '{channel_metadata}', $3::jsonb, true)
		WHERE id=$1 AND operation_id=$2`,
		target.ID, target.OperationID, metadataJSON.String())
	if err != nil {
		logging.LogError(err, "Failed to update chat channel metadata", "channel_id", input.ChannelID)
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}

func processMythicRPCChatChannelMetadataUpdate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCChatChannelMetadataUpdateMessage{}
	responseMsg := MythicRPCChatChannelMetadataUpdateMessageResponse{Success: false}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into chat channel metadata update")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCChatChannelMetadataUpdate(incomingMessage, authContext)
}

func getChatChannelMetadataUpdateTarget(channelID int) (chatChannelMetadataUpdateTarget, error) {
	target := chatChannelMetadataUpdateTarget{}
	if channelID <= 0 {
		return target, fmt.Errorf("channel_id is required")
	}
	err := database.DB.Get(&target, `SELECT chat_channel.id,
			chat_channel.operation_id,
			chat_channel.channel_type,
			COALESCE(consuming_container.name, '') "chat_container_name"
		FROM chat_channel
		LEFT JOIN consuming_container ON consuming_container.id = chat_channel.chat_container_id
		WHERE chat_channel.id=$1`, channelID)
	return target, err
}

func validateChatChannelMetadataUpdate(input MythicRPCChatChannelMetadataUpdateMessage, authContext RabbitMQAuthContext, target chatChannelMetadataUpdateTarget) error {
	if target.ID <= 0 {
		return fmt.Errorf("failed to find chat channel")
	}
	if target.ChannelType != databaseStructs.ChatChannelTypeAI {
		return fmt.Errorf("channel metadata updates are only valid for AI chat channels")
	}
	if input.OperationID > 0 && input.OperationID != target.OperationID {
		return fmt.Errorf("metadata update operation %d does not match channel operation %d", input.OperationID, target.OperationID)
	}
	if authContext.OperationID > 0 && authContext.OperationID != target.OperationID {
		return fmt.Errorf("metadata update auth operation %d does not match channel operation %d", authContext.OperationID, target.OperationID)
	}
	if strings.TrimSpace(input.ContainerName) == "" {
		return fmt.Errorf("container_name is required")
	}
	if target.ChatContainerName == "" || input.ContainerName != target.ChatContainerName {
		return fmt.Errorf("metadata update container %q does not match channel container %q", input.ContainerName, target.ChatContainerName)
	}
	if input.ChannelMetadata == nil {
		return fmt.Errorf("channel_metadata is required")
	}
	return nil
}

func normalizeChatChannelMetadata(metadata map[string]interface{}) map[string]interface{} {
	output := chatMetadataCopyMap(metadata)
	if _, ok := output["version"]; !ok {
		output["version"] = 1
	}
	if updatedAt, ok := output["updated_at"].(string); !ok || strings.TrimSpace(updatedAt) == "" {
		output["updated_at"] = time.Now().UTC().Format(time.RFC3339)
	}
	return output
}
