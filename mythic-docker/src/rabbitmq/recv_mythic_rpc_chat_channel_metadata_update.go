package rabbitmq

import (
	"encoding/json"
	"time"

	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCChatChannelMetadataUpdateMessage struct {
	ChannelMetadata map[string]any `json:"channel_metadata"`
	ChannelConfig   map[string]any `json:"channel_config"`
	ChannelModel    string         `json:"channel_model"`
}

type MythicRPCChatChannelMetadataUpdateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type chatChannelMetadataUpdateTarget struct {
	ChannelType string                         `db:"channel_type"`
	AIMetadata  databaseStructs.MythicJSONText `db:"ai_metadata"`
	ChatModel   string                         `db:"chat_model"`
	CreatedBy   int                            `db:"created_by"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CHAT_CHANNEL_METADATA_UPDATE,
		RoutingKey: MYTHIC_RPC_CHAT_CHANNEL_METADATA_UPDATE,
		Handler:    processMythicRPCChatChannelMetadataUpdate,
		Scopes:     []string{authorization.SCOPE_CHAT_AI_WRITE},
	})
}

func MythicRPCChatChannelMetadataUpdate(input MythicRPCChatChannelMetadataUpdateMessage, authContext RabbitMQAuthContext) MythicRPCChatChannelMetadataUpdateMessageResponse {
	response := MythicRPCChatChannelMetadataUpdateMessageResponse{Success: false}
	target := chatChannelMetadataUpdateTarget{}
	err := database.DB.Get(&target, `SELECT 
		chat_channel.channel_type,
		chat_channel.ai_metadata,
		chat_channel.chat_model,
		chat_channel.created_by
		FROM chat_channel
		JOIN consuming_container ON chat_channel.chat_container_id = consuming_container.id
		WHERE chat_channel.id=$1 AND chat_channel.operation_id=$2 AND consuming_container.name =$3`,
		authContext.ChatChannelID, authContext.OperationID, authContext.TargetContainerName)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	if target.ChannelType != databaseStructs.ChatChannelTypeAI {
		response.Error = "channel metadata updates are only valid for AI chat channels"
		return response
	}
	// start off with metadata as the current ai_metadata config
	metadata := chatMetadataCopyMap(target.AIMetadata.StructValue())
	if input.ChannelMetadata != nil && len(input.ChannelMetadata) > 0 {
		if _, ok := metadata["channel_metadata"]; !ok {
			metadata["channel_metadata"] = make(map[string]any)
		}
		channelMetadata, ok := metadata["channel_metadata"].(map[string]any)
		if !ok {
			channelMetadata = make(map[string]any)
		}
		if input.ChannelMetadata["items"] != nil {
			channelMetadata["items"] = input.ChannelMetadata["items"]
		}
		channelMetadata["updated_at"] = time.Now().UTC().Format(time.RFC3339)
		if input.ChannelMetadata["default_display"] != nil {
			channelMetadata["default_display"] = input.ChannelMetadata["default_display"]
		}
		metadata["channel_metadata"] = channelMetadata
	}
	chatModel := target.ChatModel
	if input.ChannelModel != "" || input.ChannelConfig != nil {
		// need to do some extra user verification
		issuingUser, err := database.GetUserFromID(authContext.ChatOperatorID)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		operatorOperation, err := database.GetUserOperation(issuingUser, authContext.OperationID)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		// only an admin, the creator of the ai chat, or the lead of the operation can make changes to the config
		if !operatorOperation.CurrentOperator.Admin &&
			operatorOperation.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_LEAD &&
			target.CreatedBy != authContext.ChatOperatorID {
			response.Error = "only the channel creator or an operation admin can update this channel"
			return response
		}
		if input.ChannelModel != "" {
			chatModel = input.ChannelModel
		}
		if input.ChannelConfig != nil && len(input.ChannelConfig) > 0 {
			metadata["config"] = input.ChannelConfig
		}
	}
	metadataJSON := GetMythicJSONTextFromStruct(metadata)
	_, err = database.DB.Exec(`UPDATE chat_channel
		SET ai_metadata = $3, chat_model = $4
		WHERE id=$1 AND operation_id=$2`,
		authContext.ChatChannelID, authContext.OperationID, metadataJSON.String(), chatModel)
	if err != nil {
		logging.LogError(err, "Failed to update chat channel metadata", "channel_id", authContext.ChatChannelID)
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
