package webcontroller

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

const (
	chatContextMessageLimit                = 40
	chatGeneralChannelName                 = "general"
	chatSpecialTypeMCPToolConfirmation     = "mcp_tool_confirmation"
	chatMCPToolConfirmationStatusPending   = "pending"
	chatMCPToolConfirmationStatusConfirmed = "confirmed"
	chatMCPToolConfirmationStatusRejected  = "rejected"
	chatMCPToolConfirmationStatusResponded = "responded"
)

var chatSlugInvalidCharacters = regexp.MustCompile(`[^a-z0-9]+`)

type aiChatRequestOptions struct {
	RetryOfID              *int
	RequestMessageMetadata map[string]interface{}
	ConfirmedToolCall      map[string]interface{}
}

type ChatActionResponse struct {
	Status            string             `json:"status"`
	Error             string             `json:"error,omitempty"`
	ID                int                `json:"id,omitempty"`
	ChannelID         int                `json:"channel_id,omitempty"`
	MessageID         int                `json:"message_id,omitempty"`
	RequestID         int                `json:"request_id,omitempty"`
	ResponseMessageID int                `json:"response_message_id,omitempty"`
	Results           []ChatSearchResult `json:"results,omitempty"`
}

type CreateChatChannelInput struct {
	Input CreateChatChannel `json:"input" binding:"required"`
}

type CreateChatChannel struct {
	Name            string      `json:"name" binding:"required"`
	Description     string      `json:"description"`
	ChannelType     string      `json:"channel_type"`
	ChatContainerID *int        `json:"chat_container_id"`
	ChatModel       string      `json:"chat_model"`
	Locked          bool        `json:"locked"`
	AIMetadata      interface{} `json:"ai_metadata"`
	APITokenID      *int        `json:"apitokens_id"`
}

type CreateChatMessageInput struct {
	Input CreateChatMessage `json:"input" binding:"required"`
}

type CreateChatMessage struct {
	ChannelID     int    `json:"channel_id" binding:"required"`
	Message       string `json:"message" binding:"required"`
	SystemMessage bool   `json:"system_message"`
	AllOperations bool   `json:"all_operations"`
}

func CreateChatChannelWebhook(c *gin.Context) {
	var input CreateChatChannelInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	channelType := strings.ToLower(strings.TrimSpace(input.Input.ChannelType))
	if channelType == "" {
		channelType = databaseStructs.ChatChannelTypeStandard
	}
	if channelType != databaseStructs.ChatChannelTypeStandard && channelType != databaseStructs.ChatChannelTypeAI {
		chatRespondError(c, "unknown chat channel type")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(databaseStructs.ChatChannel{ChannelType: channelType}, true)) {
		return
	}
	name := strings.TrimSpace(input.Input.Name)
	if name == "" {
		chatRespondError(c, "channel name is required")
		return
	}
	slug, err := uniqueChatSlug(operatorOperation.CurrentOperation.ID, slugifyChatChannelName(name), 0)
	if err != nil {
		logging.LogError(err, "Failed to generate unique chat slug")
		chatRespondError(c, err.Error())
		return
	}

	var chatContainerID interface{}
	var apiTokenID interface{}
	if channelType == databaseStructs.ChatChannelTypeAI {
		if input.Input.ChatContainerID == nil || *input.Input.ChatContainerID <= 0 {
			chatRespondError(c, "AI chat channels require a chat_container_id")
			return
		}
		if input.Input.APITokenID == nil || *input.Input.APITokenID <= 0 {
			chatRespondError(c, "AI chat channels require an apitokens_id")
			return
		}
		if _, err = getChatContainer(*input.Input.ChatContainerID); err != nil {
			logging.LogError(err, "Failed to find chat container")
			chatRespondError(c, "failed to find a chat container with that id")
			return
		}
		if _, err = validateAIChatChannelAPIToken(*input.Input.APITokenID, operatorOperation.CurrentOperation.ID); err != nil {
			chatRespondError(c, err.Error())
			return
		}
		chatContainerID = *input.Input.ChatContainerID
		apiTokenID = *input.Input.APITokenID
	} else if input.Input.APITokenID != nil && *input.Input.APITokenID > 0 {
		chatRespondError(c, "apitokens_id can only be set for AI chat channels")
		return
	}
	var lockedBy interface{}
	var lockedAt interface{}
	if channelType == databaseStructs.ChatChannelTypeAI && input.Input.Locked {
		lockedBy = operatorOperation.CurrentOperator.ID
		lockedAt = time.Now().UTC()
	}
	metadata := chatJSONText(input.Input.AIMetadata)
	var channelID int
	err = database.DB.Get(&channelID, `INSERT INTO chat_channel
		(operation_id, name, slug, description, channel_type, created_by, locked, locked_by, locked_at,
		 chat_container_id, chat_model, ai_metadata, apitokens_id)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb, $13)
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		name,
		slug,
		input.Input.Description,
		channelType,
		operatorOperation.CurrentOperator.ID,
		channelType == databaseStructs.ChatChannelTypeAI && input.Input.Locked,
		lockedBy,
		lockedAt,
		chatContainerID,
		input.Input.ChatModel,
		metadata.String(),
		apiTokenID,
	)
	if err != nil {
		logging.LogError(err, "Failed to create chat channel")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: channelID, ChannelID: channelID})
}

func CreateChatMessageWebhook(c *gin.Context) {
	var input CreateChatMessageInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	message := strings.TrimSpace(input.Input.Message)
	if message == "" {
		chatRespondError(c, "message is required")
		return
	}
	channel, err := getChatChannel(input.Input.ChannelID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat channel for message")
		chatRespondError(c, "failed to find chat channel")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if input.Input.AllOperations {
		if !input.Input.SystemMessage {
			chatRespondError(c, "sending to all operations requires a system message")
			return
		}
		if !operatorOperation.CurrentOperator.Admin {
			chatRespondError(c, "only a Mythic admin can create system messages in all operations")
			return
		}
		messageID, _, err := insertSystemChatMessageAllOperations(operatorOperation, message, authentication.RabbitMQAuthContextFromGin(c))
		if err != nil {
			logging.LogError(err, "Failed to create system chat messages in all operations")
			chatRespondError(c, err.Error())
			return
		}
		c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: messageID, MessageID: messageID, ChannelID: channel.ID})
		return
	}
	if channel.Archived {
		chatRespondError(c, "cannot post to an archived chat channel")
		return
	}
	if input.Input.SystemMessage {
		if !chatIsModerator(operatorOperation) {
			chatRespondError(c, "only an admin can create system messages")
			return
		}
		messageID, err := insertSystemChatMessage(operatorOperation, channel, message, authentication.RabbitMQAuthContextFromGin(c))
		if err != nil {
			logging.LogError(err, "Failed to create system chat message")
			chatRespondError(c, err.Error())
			return
		}
		c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: messageID, MessageID: messageID, ChannelID: channel.ID})
		return
	}
	if channel.ChannelType == databaseStructs.ChatChannelTypeAI {
		if !chatCanPostToAIChannel(operatorOperation, channel) {
			chatRespondError(c, "this AI chat is locked to another operator")
			return
		}
		createAIChatMessage(c, operatorOperation, channel, message, nil)
		return
	}
	messageID, err := insertOperatorChatMessage(operatorOperation, channel, message, authentication.RabbitMQAuthContextFromGin(c))
	if err != nil {
		logging.LogError(err, "Failed to create chat message")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: messageID, MessageID: messageID, ChannelID: channel.ID})
}

func createAIChatMessage(c *gin.Context, operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, retryOfID *int) {
	createAIChatMessageWithOptions(c, operatorOperation, channel, message, aiChatRequestOptions{RetryOfID: retryOfID})
}

func createAIChatMessageWithOptions(c *gin.Context, operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, options aiChatRequestOptions) {
	container, err := getChatContainer(int(channel.ChatContainerID.Int64))
	if err != nil {
		logging.LogError(err, "Failed to find AI chat container")
		chatRespondError(c, "failed to find AI chat container")
		return
	}
	if !container.ContainerRunning {
		chatRespondError(c, fmt.Sprintf("chat container %s is not running", container.Name))
		return
	}
	activeRequestID, err := getActiveAIChatRequest(operatorOperation.CurrentOperation.ID, channel.ID)
	if err != nil {
		logging.LogError(err, "Failed to check active AI chat request")
		chatRespondError(c, err.Error())
		return
	}
	if activeRequestID > 0 {
		chatRespondError(c, fmt.Sprintf("AI chat request %d is still in progress; wait for it to finish or cancel it before sending another prompt", activeRequestID))
		return
	}
	chatAuthContext, err := chatChannelAuthContext(channel)
	if err != nil {
		chatRespondError(c, err.Error())
		return
	}
	operatorAuthContext := authentication.RabbitMQAuthContextFromGin(c)
	requestMessageID, err := insertOperatorChatMessageWithMetadata(operatorOperation, channel, message, operatorAuthContext, options.RequestMessageMetadata)
	if err != nil {
		logging.LogError(err, "Failed to create AI prompt message")
		chatRespondError(c, err.Error())
		return
	}
	var responseMessageID int
	if err = database.DB.Get(&responseMessageID, `INSERT INTO chat_message
		(operation_id, channel_id, author_type, chat_container_id, sender_display_name, status, metadata)
		VALUES ($1, $2, 'ai', $3, $4, 'pending', $5::jsonb)
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		channel.ID,
		container.ID,
		container.Name,
		rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{"model": channel.ChatModel}).String(),
	); err != nil {
		logging.LogError(err, "Failed to create AI response placeholder")
		chatRespondError(c, err.Error())
		return
	}
	var retryOf interface{}
	if options.RetryOfID != nil {
		retryOf = *options.RetryOfID
	}
	var requestID int
	if err = database.DB.Get(&requestID, `INSERT INTO chat_request
		(operation_id, channel_id, request_message_id, response_message_id, chat_container_id,
		 model, status, context_snapshot, retry_of_id, created_by)
		VALUES ($1, $2, $3, $4, $5, $6, 'pending', $7::jsonb, $8, $9)
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		channel.ID,
		requestMessageID,
		responseMessageID,
		container.ID,
		channel.ChatModel,
		rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{}).String(),
		retryOf,
		operatorOperation.CurrentOperator.ID,
	); err != nil {
		logging.LogError(err, "Failed to create AI chat request")
		chatRespondError(c, err.Error())
		return
	}

	go dispatchAIChatRequest(
		operatorOperation.CurrentOperation.ID,
		operatorOperation.CurrentOperator.ID,
		channel,
		container,
		requestID,
		requestMessageID,
		responseMessageID,
		message,
		retryOf,
		options.ConfirmedToolCall,
		chatAuthContext,
	)

	c.JSON(http.StatusOK, ChatActionResponse{
		Status:            "success",
		ID:                requestMessageID,
		MessageID:         requestMessageID,
		ChannelID:         channel.ID,
		RequestID:         requestID,
		ResponseMessageID: responseMessageID,
	})
}

func dispatchAIChatRequest(
	operationID int,
	operatorID int,
	channel databaseStructs.ChatChannel,
	container databaseStructs.ConsumingContainer,
	requestID int,
	requestMessageID int,
	responseMessageID int,
	prompt string,
	retryOf interface{},
	confirmedToolCall map[string]interface{},
	chatAuthContext rabbitmq.RabbitMQAuthContext,
) {
	contextMessages, err := getChatContextMessages(operationID, channel.ID, requestMessageID)
	if err != nil {
		logging.LogError(err, "Failed to fetch AI chat context")
		markChatRequestFailed(requestID, responseMessageID, operationID, err.Error())
		return
	}
	chatConfig := getChatChannelConfig(channel)
	contextIDs := make([]int, len(contextMessages))
	for i := range contextMessages {
		contextIDs[i] = contextMessages[i].ID
	}
	contextSnapshot := rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{
		"context_message_ids":   contextIDs,
		"request_message_id":    requestMessageID,
		"response_message_id":   responseMessageID,
		"retry_of_id":           retryOf,
		"confirmed_tool_call":   confirmedToolCall,
		"context_message_limit": chatContextMessageLimit,
		"config":                chatConfig,
	})
	_, _ = database.DB.Exec(`UPDATE chat_request
		SET context_snapshot=$3::jsonb
		WHERE id=$1 AND operation_id=$2`, requestID, operationID, contextSnapshot.String())

	err = rabbitmq.RabbitMQConnection.SendChatContainerRequest(container.Name, rabbitmq.ChatContainerRequestMessage{
		OperationID:       operationID,
		ChannelID:         channel.ID,
		APITokenID:        int(channel.APITokensID.Int64),
		ChannelName:       channel.Name,
		ChannelSlug:       channel.Slug,
		RequestID:         requestID,
		RequestMessageID:  requestMessageID,
		ResponseMessageID: responseMessageID,
		Model:             channel.ChatModel,
		Prompt:            prompt,
		Config:            chatConfig,
		Context:           contextMessages,
		Secrets:           rabbitmq.GetSecrets(operatorID, 0),
		ConfirmedToolCall: confirmedToolCall,
	}, chatAuthContext)
	if err != nil {
		logging.LogError(err, "Failed to send AI chat request", "request_id", requestID, "response_message_id", responseMessageID)
		markChatRequestFailed(requestID, responseMessageID, operationID, err.Error())
	}
}

func bindChatInput(c *gin.Context, input interface{}) bool {
	if err := c.ShouldBindJSON(input); err != nil {
		logging.LogError(err, "Failed to get JSON parameters for chat webhook")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return false
	}
	return true
}

func chatOperatorOperation(c *gin.Context) (*databaseStructs.Operatoroperation, bool) {
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		chatRespondError(c, "failed to get current operation")
		return nil, false
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	return operatorOperation, true
}

func chatRespondError(c *gin.Context, err string) {
	c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err})
}

func chatRequireScope(c *gin.Context, requiredScope string) bool {
	claims, err := authentication.GetClaims(c)
	if err != nil {
		logging.LogError(err, "Failed to get claims for chat scope check")
		chatRespondError(c, "failed to get authentication claims")
		return false
	}
	if !mythicjwt.AllowsScope(claims.Scopes, requiredScope) {
		chatRespondError(c, fmt.Sprintf("missing required scope: %s", requiredScope))
		return false
	}
	return true
}

func chatScopeForChannel(channel databaseStructs.ChatChannel, write bool) string {
	if channel.ChannelType == databaseStructs.ChatChannelTypeAI {
		if write {
			return mythicjwt.SCOPE_CHAT_AI_WRITE
		}
		return mythicjwt.SCOPE_CHAT_AI_READ
	}
	if write {
		return mythicjwt.SCOPE_CHAT_WRITE
	}
	return mythicjwt.SCOPE_CHAT_READ
}

func chatIsModerator(operatorOperation *databaseStructs.Operatoroperation) bool {
	return operatorOperation.CurrentOperator.Admin ||
		operatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD
}

func chatIsGeneralChannel(channel databaseStructs.ChatChannel) bool {
	return channel.ChannelType == databaseStructs.ChatChannelTypeStandard &&
		strings.EqualFold(channel.Slug, chatGeneralChannelName)
}

func chatCanPostToAIChannel(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel) bool {
	if !channel.Locked {
		return true
	}
	return channel.LockedBy.Valid && int(channel.LockedBy.Int64) == operatorOperation.CurrentOperator.ID
}

func slugifyChatChannelName(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = chatSlugInvalidCharacters.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		return "channel"
	}
	return slug
}

func uniqueChatSlug(operationID int, baseSlug string, excludeChannelID int) (string, error) {
	for i := 0; i < 1000; i++ {
		candidate := baseSlug
		if i > 0 {
			candidate = fmt.Sprintf("%s-%d", baseSlug, i+1)
		}
		var existingID int
		err := database.DB.Get(&existingID, `SELECT id FROM chat_channel
			WHERE operation_id=$1 AND lower(slug)=lower($2) AND id <> $3`,
			operationID, candidate, excludeChannelID)
		if errors.Is(err, sql.ErrNoRows) {
			return candidate, nil
		}
		if err != nil {
			return "", err
		}
	}
	return "", fmt.Errorf("failed to find an available slug for %s", baseSlug)
}

func chatJSONText(input interface{}) databaseStructs.MythicJSONText {
	if input == nil {
		return rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{})
	}
	if inputString, ok := input.(string); ok {
		var raw json.RawMessage
		if err := json.Unmarshal([]byte(inputString), &raw); err == nil {
			return rabbitmq.GetMythicJSONTextFromStruct(raw)
		}
	}
	return rabbitmq.GetMythicJSONTextFromStruct(input)
}

func chatMetadataInt(metadata map[string]interface{}, key string) (int, bool) {
	value, ok := metadata[key]
	if !ok {
		return 0, false
	}
	switch typedValue := value.(type) {
	case int:
		return typedValue, true
	case int64:
		return int(typedValue), true
	case float64:
		return int(typedValue), true
	default:
		return 0, false
	}
}

func chatCopyMetadataMap(metadata map[string]interface{}) map[string]interface{} {
	copied := make(map[string]interface{}, len(metadata))
	for key, value := range metadata {
		copied[key] = value
	}
	return copied
}

func chatMCPToolDisplayName(confirmation map[string]interface{}) string {
	toolName, _ := confirmation["tool_name"].(string)
	serverName, _ := confirmation["server_name"].(string)
	if serverName != "" && toolName != "" {
		return fmt.Sprintf("%s.%s", serverName, toolName)
	}
	if toolName != "" {
		return toolName
	}
	return "requested tool"
}

func getChatChannelConfig(channel databaseStructs.ChatChannel) map[string]interface{} {
	metadata := channel.AIMetadata.StructValue()
	for _, key := range []string{"config", "configuration"} {
		if config, ok := metadata[key].(map[string]interface{}); ok {
			return config
		}
	}
	return map[string]interface{}{}
}

func validateAIChatChannelAPIToken(apiTokenID int, operationID int) (databaseStructs.Apitokens, error) {
	apiToken := databaseStructs.Apitokens{}
	if apiTokenID <= 0 {
		return apiToken, fmt.Errorf("AI chat channels require an apitokens_id")
	}
	err := database.DB.Get(&apiToken, `SELECT apitokens.*
		FROM apitokens
		JOIN operatoroperation ON operatoroperation.operator_id = apitokens.operator_id
		WHERE apitokens.id=$1 AND operatoroperation.operation_id=$2`,
		apiTokenID, operationID)
	if err != nil {
		return apiToken, fmt.Errorf("failed to find an active API token for this operation")
	}
	if apiToken.Deleted || !apiToken.Active {
		return apiToken, fmt.Errorf("AI chat channel API token must be active and not deleted")
	}
	if apiToken.TokenType != mythicjwt.AUTH_METHOD_API {
		return apiToken, fmt.Errorf("AI chat channel API token must be a normal API token")
	}
	if !mythicjwt.AllowsScope(apiToken.Scopes, mythicjwt.SCOPE_APITOKEN_WRITE) ||
		!mythicjwt.AllowsScope(apiToken.Scopes, mythicjwt.SCOPE_CHAT_AI_WRITE) {
		return apiToken, fmt.Errorf("AI chat channel API token must include %s and %s",
			mythicjwt.SCOPE_APITOKEN_WRITE, mythicjwt.SCOPE_CHAT_AI_WRITE)
	}
	return apiToken, nil
}

func chatChannelAuthContext(channel databaseStructs.ChatChannel) (rabbitmq.RabbitMQAuthContext, error) {
	if !channel.APITokensID.Valid || channel.APITokensID.Int64 <= 0 {
		return rabbitmq.RabbitMQAuthContext{}, fmt.Errorf("AI chat channel is missing an API token")
	}
	apiToken, err := validateAIChatChannelAPIToken(int(channel.APITokensID.Int64), channel.OperationID)
	if err != nil {
		return rabbitmq.RabbitMQAuthContext{}, err
	}
	return rabbitmq.RabbitMQAuthContext{
		OperatorID:   apiToken.OperatorID,
		OperationID:  channel.OperationID,
		APITokensID:  apiToken.ID,
		SourceScopes: mythicjwt.EffectiveScopes(apiToken.Scopes),
	}, nil
}

func getChatContainer(containerID int) (databaseStructs.ConsumingContainer, error) {
	container := databaseStructs.ConsumingContainer{}
	err := database.DB.Get(&container, `SELECT *
		FROM consuming_container
		WHERE id=$1 AND type=$2 AND deleted=false`, containerID, string(rabbitmq.CONSUMING_SERVICES_TYPE_CHAT))
	return container, err
}

func getChatMessageAndChannel(messageID int, operationID int) (databaseStructs.ChatMessage, databaseStructs.ChatChannel, error) {
	chatMessage := databaseStructs.ChatMessage{}
	if err := database.DB.Get(&chatMessage, `SELECT
			id,
			operation_id,
			channel_id,
			operator_id,
			apitokens_id,
			author_type,
			chat_container_id,
			sender_display_name,
			message,
			edited,
			edited_at,
			deleted,
			deleted_by,
			deleted_at,
			status,
			metadata,
			created_at,
			updated_at
		FROM chat_message
		WHERE id=$1 AND operation_id=$2`, messageID, operationID); err != nil {
		return chatMessage, databaseStructs.ChatChannel{}, err
	}
	channel, err := getChatChannel(chatMessage.ChannelID, operationID)
	return chatMessage, channel, err
}

func getChatRequestAndChannel(requestID int, operationID int) (databaseStructs.ChatRequest, databaseStructs.ChatChannel, error) {
	request := databaseStructs.ChatRequest{}
	if err := database.DB.Get(&request, `SELECT *
		FROM chat_request
		WHERE id=$1 AND operation_id=$2`, requestID, operationID); err != nil {
		return request, databaseStructs.ChatChannel{}, err
	}
	channel, err := getChatChannel(request.ChannelID, operationID)
	return request, channel, err
}

func insertOperatorChatMessage(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, authContext rabbitmq.RabbitMQAuthContext) (int, error) {
	return insertOperatorChatMessageWithMetadata(operatorOperation, channel, message, authContext, nil)
}

func insertOperatorChatMessageWithMetadata(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, authContext rabbitmq.RabbitMQAuthContext, metadata map[string]interface{}) (int, error) {
	var apiTokenID interface{}
	if authContext.APITokensID > 0 {
		apiTokenID = authContext.APITokensID
	}
	if metadata == nil {
		metadata = map[string]interface{}{}
	}
	metadataText := rabbitmq.GetMythicJSONTextFromStruct(metadata)
	var messageID int
	err := database.DB.Get(&messageID, `INSERT INTO chat_message
		(operation_id, channel_id, operator_id, apitokens_id, author_type, sender_display_name, message, status, metadata)
		VALUES ($1, $2, $3, $4, 'operator', $5, $6, 'complete', $7::jsonb)
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		channel.ID,
		operatorOperation.CurrentOperator.ID,
		apiTokenID,
		operatorOperation.CurrentOperator.Username,
		message,
		metadataText.String(),
	)
	return messageID, err
}

func insertSystemChatMessage(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, authContext rabbitmq.RabbitMQAuthContext) (int, error) {
	var apiTokenID interface{}
	if authContext.APITokensID > 0 {
		apiTokenID = authContext.APITokensID
	}
	metadata := rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{
		"submitted_by_operator_id": operatorOperation.CurrentOperator.ID,
		"submitted_by":             operatorOperation.CurrentOperator.Username,
	})
	var messageID int
	err := database.DB.Get(&messageID, `INSERT INTO chat_message
		(operation_id, channel_id, apitokens_id, author_type, sender_display_name, message, status, metadata)
		VALUES ($1, $2, $3, 'system', 'System', $4, 'complete', $5::jsonb)
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		channel.ID,
		apiTokenID,
		message,
		metadata.String(),
	)
	return messageID, err
}

func insertSystemChatMessageAllOperations(operatorOperation *databaseStructs.Operatoroperation, message string, authContext rabbitmq.RabbitMQAuthContext) (int, int, error) {
	if err := ensureGeneralChatChannels(); err != nil {
		return 0, 0, err
	}
	var apiTokenID interface{}
	if authContext.APITokensID > 0 {
		apiTokenID = authContext.APITokensID
	}
	metadata := rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{
		"submitted_by_operator_id": operatorOperation.CurrentOperator.ID,
		"submitted_by":             operatorOperation.CurrentOperator.Username,
		"all_operations":           true,
	})
	messageIDs := []int{}
	err := database.DB.Select(&messageIDs, `INSERT INTO chat_message
		(operation_id, channel_id, apitokens_id, author_type, sender_display_name, message, status, metadata)
		SELECT chat_channel.operation_id, chat_channel.id, $1, 'system', 'System', $2, 'complete', $3::jsonb
		FROM chat_channel
		JOIN operation ON operation.id=chat_channel.operation_id
		WHERE operation.deleted=false
			AND chat_channel.channel_type=$4
			AND lower(chat_channel.slug)=$5
		RETURNING id`,
		apiTokenID,
		message,
		metadata.String(),
		databaseStructs.ChatChannelTypeStandard,
		chatGeneralChannelName,
	)
	if err != nil {
		return 0, 0, err
	}
	if len(messageIDs) == 0 {
		return 0, 0, fmt.Errorf("failed to find general channels for any operations")
	}
	return messageIDs[0], len(messageIDs), nil
}

func ensureGeneralChatChannels() error {
	_, err := database.DB.Exec(`INSERT INTO chat_channel
		(operation_id, name, slug, description, channel_type, created_by)
		SELECT id, $1, $1, 'Default operation chat channel', $2, admin_id
		FROM operation
		WHERE deleted=false
		ON CONFLICT DO NOTHING`,
		chatGeneralChannelName,
		databaseStructs.ChatChannelTypeStandard,
	)
	if err != nil {
		return err
	}
	_, err = database.DB.Exec(`UPDATE chat_channel
		SET name=$1,
			archived=false,
			archived_by=NULL,
			archived_at=NULL
		WHERE channel_type=$2
			AND lower(slug)=$1
			AND (name <> $1 OR archived=true OR archived_by IS NOT NULL OR archived_at IS NOT NULL)`,
		chatGeneralChannelName,
		databaseStructs.ChatChannelTypeStandard,
	)
	return err
}

func getActiveAIChatRequest(operationID int, channelID int) (int, error) {
	var requestID int
	err := database.DB.Get(&requestID, `SELECT id
		FROM chat_request
		WHERE operation_id=$1
			AND channel_id=$2
			AND status IN ('pending', 'streaming')
		ORDER BY id DESC
		LIMIT 1`, operationID, channelID)
	if err == sql.ErrNoRows {
		return 0, nil
	}
	return requestID, err
}

func getChatContextMessages(operationID int, channelID int, lastMessageID int) ([]rabbitmq.ChatContainerContextMessage, error) {
	contextMessages := []rabbitmq.ChatContainerContextMessage{}
	if err := database.DB.Select(&contextMessages, `SELECT
			id,
			author_type,
			sender_display_name,
			message,
			metadata,
			created_at
		FROM chat_message
		WHERE operation_id=$1
			AND channel_id=$2
			AND id <= $3
			AND deleted=false
			AND (author_type <> 'ai' OR status='complete')
		ORDER BY id DESC
		LIMIT $4`, operationID, channelID, lastMessageID, chatContextMessageLimit); err != nil {
		return contextMessages, err
	}
	for i, j := 0, len(contextMessages)-1; i < j; i, j = i+1, j-1 {
		contextMessages[i], contextMessages[j] = contextMessages[j], contextMessages[i]
	}
	return contextMessages, nil
}

func markChatRequestFailed(requestID int, responseMessageID int, operationID int, errorMessage string) {
	metadata := rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{
		"error": errorMessage,
	})
	_, _ = database.DB.Exec(`UPDATE chat_message
		SET status='error', metadata=metadata || $3::jsonb
		WHERE id=$1 AND operation_id=$2`, responseMessageID, operationID, metadata.String())
	_, _ = database.DB.Exec(`UPDATE chat_request
		SET status='error', error=$3
		WHERE id=$1 AND operation_id=$2`, requestID, operationID, errorMessage)
}
