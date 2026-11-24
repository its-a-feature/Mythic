package webcontroller

import (
	"context"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"maps"
	"net/http"
	"regexp"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

const (
	chatContextMessageLimit           = 40
	chatGeneralChannelName            = "general"
	chatSpecialTypeInputRequested     = "input_requested"
	chatInputRequestedStatusPending   = "pending"
	chatInputRequestedStatusAccepted  = "accepted"
	chatInputRequestedStatusRejected  = "rejected"
	chatInputRequestedStatusResponded = "responded"
	chatInputRequestedStatusSelected  = "selected"
)

var chatSlugInvalidCharacters = regexp.MustCompile(`[^a-z0-9]+`)

type aiChatRequestOptions struct {
	RetryOfID              *int
	RequestMessageMetadata map[string]any
	InputResponse          *rabbitmq.ChatContainerInputResponse
	SlashCommand           *rabbitmq.ChatSlashCommandInvocation
	AliasResolution        *rabbitmq.OperatorAliasResolution
	SlashMetadata          map[string]any
}

type ChatActionResponse struct {
	Status    string             `json:"status"`
	Error     string             `json:"error,omitempty"`
	ID        int                `json:"id,omitempty"`
	ChannelID int                `json:"channel_id,omitempty"`
	MessageID int                `json:"message_id,omitempty"`
	RequestID int                `json:"request_id,omitempty"`
	Results   []ChatSearchResult `json:"results,omitempty"`
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
	ChannelID      int    `json:"channel_id" binding:"required"`
	Message        string `json:"message" binding:"required"`
	SystemMessage  bool   `json:"system_message"`
	AllOperations  bool   `json:"all_operations"`
	DelegationID   string `json:"delegation_id"`
	DelegationName string `json:"delegation_name"`
}

func CreateChatChannelWebhook(c *gin.Context) {
	var input CreateChatChannelInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for chat webhook")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	operatorOperation, err := authentication.GetRequestOperation(c)
	if err != nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	channelType := strings.ToLower(strings.TrimSpace(input.Input.ChannelType))
	if channelType == "" {
		channelType = databaseStructs.ChatChannelTypeStandard
	}
	if channelType != databaseStructs.ChatChannelTypeStandard && channelType != databaseStructs.ChatChannelTypeAI {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "unknown chat channel type"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(databaseStructs.ChatChannel{ChannelType: channelType}, true)) {
		return
	}
	name := strings.TrimSpace(input.Input.Name)
	if name == "" {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "channel name is required"})
		return
	}
	slug, err := uniqueChatSlug(operatorOperation.CurrentOperation.ID, slugifyChatChannelName(name), 0)
	if err != nil {
		logging.LogError(err, "Failed to generate unique chat slug")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}

	var chatContainerID interface{}
	var apiTokenID interface{}
	if channelType == databaseStructs.ChatChannelTypeAI {
		if input.Input.ChatContainerID == nil || *input.Input.ChatContainerID <= 0 {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "AI chat channels require a chat_container_id"})
			return
		}
		if input.Input.APITokenID == nil || *input.Input.APITokenID <= 0 {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "AI chat channels require an apitokens_id"})
			return
		}
		if _, err = rabbitmq.GetChatContainer(*input.Input.ChatContainerID); err != nil {
			logging.LogError(err, "Failed to find chat container")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find a chat container with that id"})
			return
		}
		if _, err = validateAIChatChannelAPIToken(*input.Input.APITokenID, operatorOperation.CurrentOperation.ID); err != nil {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
		chatContainerID = *input.Input.ChatContainerID
		apiTokenID = *input.Input.APITokenID
	} else if input.Input.APITokenID != nil && *input.Input.APITokenID > 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "apitokens_id can only be set for AI chat channels"})
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
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: channelID, ChannelID: channelID})
}

func CreateChatMessageWebhook(c *gin.Context) {
	var input CreateChatMessageInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get JSON parameters for chat webhook")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	operatorOperation, err := authentication.GetRequestOperation(c)
	if err != nil {
		return
	}
	message := strings.TrimSpace(input.Input.Message)
	if message == "" {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "message is required"})
		return
	}
	channel, err := getChatChannel(c.Request.Context(), input.Input.ChannelID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat channel for message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat channel"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, true)) {
		return
	}
	if input.Input.AllOperations {
		if !input.Input.SystemMessage {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "sending to all operations requires a system message"})
			return
		}
		if !operatorOperation.CurrentOperator.Admin {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only a Mythic admin can create system messages in all operations"})
			return
		}
		messageID, err := insertSystemChatMessageAllOperations(operatorOperation, message, authentication.RabbitMQAuthContextFromGin(c))
		if err != nil {
			logging.LogError(err, "Failed to create system chat messages in all operations")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
		c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: messageID, MessageID: messageID, ChannelID: channel.ID})
		return
	}
	if channel.Archived {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cannot post to an archived chat channel"})
		return
	}
	if input.Input.SystemMessage {
		if !userIsAdminOrOperationLead(operatorOperation) {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only an admin can create system messages"})
			return
		}
		if !chatIsGeneralChannel(channel) {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "can only send system messages to the general channel"})
			return
		}
		messageID, err := insertSystemChatMessage(operatorOperation, channel, message, authentication.RabbitMQAuthContextFromGin(c))
		if err != nil {
			logging.LogError(err, "Failed to create system chat message")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
		c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: messageID, MessageID: messageID, ChannelID: channel.ID})
		return
	}
	metadata := map[string]interface{}{}
	delegationID := strings.TrimSpace(input.Input.DelegationID)
	delegationName := strings.TrimSpace(input.Input.DelegationName)
	if delegationID != "" {
		metadata["delegation_id"] = delegationID
	}
	if delegationName != "" {
		metadata["delegation_name"] = delegationName
	}
	if len(metadata) == 0 {
		metadata = nil
	}
	if channel.ChannelType == databaseStructs.ChatChannelTypeAI {
		// check if AI Channel is locked
		if !chatCanPostToAIChannel(operatorOperation, channel) {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "this AI chat is locked to another operator"})
			return
		}
		createAIChatMessageWithOptions(c,
			operatorOperation,
			channel,
			message,
			aiChatRequestOptions{
				RequestMessageMetadata: metadata,
			},
		)
		return
	}
	// if we're here, this is just a standard chat channel message
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	var apiTokenID interface{}
	if authContext.APITokensID > 0 {
		apiTokenID = authContext.APITokensID
	}
	if metadata == nil {
		metadata = map[string]interface{}{}
	}
	metadataText := rabbitmq.GetMythicJSONTextFromStruct(metadata)
	var messageID int
	err = database.DB.Get(&messageID, `INSERT INTO chat_message
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
	if err != nil {
		logging.LogError(err, "Failed to create chat message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: messageID, MessageID: messageID, ChannelID: channel.ID})
}

func createAIChatMessageWithOptions(c *gin.Context, operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, options aiChatRequestOptions) {
	var activeRequestID int
	err := database.DB.Get(&activeRequestID, `SELECT id
		FROM chat_request
		WHERE operation_id=$1
			AND channel_id=$2
			AND status IN ('pending', 'streaming')
		ORDER BY id DESC
		LIMIT 1`,
		operatorOperation.CurrentOperation.ID, channel.ID)
	if err != nil && !errors.Is(err, sql.ErrNoRows) {
		logging.LogError(err, "Failed to check active AI chat request")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	if activeRequestID > 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error",
			Error: fmt.Sprintf("AI chat request is still in progress; wait for it to finish or cancel it before sending another prompt")})
		return
	}
	container, err := rabbitmq.GetChatContainer(int(channel.ChatContainerID.Int64))
	if err != nil {
		logging.LogError(err, "Failed to find AI chat container")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find AI chat container"})
		return
	}
	if !container.ContainerRunning {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error",
			Error: fmt.Sprintf("chat container %s is not running", container.Name)})
		return
	}

	// send in message and get back prompt, if there's a slash command, and any alias resolution that happened
	aliasResolvedPrompt, slashMetadata, slashCommand, aliasResolution, err := resolveAIChatStartingSlashAliases(
		operatorOperation.CurrentOperator.ID,
		channel,
		container,
		message,
	)
	if err != nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	// now that the message is resolved for / aliases, check for additional @ generic aliases
	aliasResolvedPrompt, genericMetadata, aliasResolution, err := processAIChatGenericAliases(
		operatorOperation.CurrentOperator.ID,
		channel,
		aliasResolvedPrompt,
		aliasResolution,
	)
	if err != nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}

	if slashCommand != nil {
		// this means we ended up with a /something after initial resolution
		// need to update slashCommand name and argument after generic @ alias resolutions
		if finalCommand, finalArgument, startedWithSlash := rabbitmq.ParseStringIntoSlashCommandAndArgs(aliasResolvedPrompt); startedWithSlash {
			slashCommand.Name = finalCommand
			slashCommand.Argument = finalArgument
			slashCommand.Raw = aliasResolvedPrompt
		}
	}
	options.RequestMessageMetadata = mergeChatMetadata(options.RequestMessageMetadata, slashMetadata)
	options.RequestMessageMetadata = mergeChatMetadata(options.RequestMessageMetadata, genericMetadata)
	options.SlashCommand = slashCommand
	options.AliasResolution = aliasResolution
	options.SlashMetadata = mergeChatMetadata(slashMetadata, genericMetadata)
	chatAuthContext, err := chatChannelGetRabbitMQAuthContext(channel)
	if err != nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	// update the operatorID to be the user and not the api token when issuing the message
	chatAuthContext.ChatOperatorID = operatorOperation.CurrentOperator.ID
	chatAuthContext.TargetContainerName = container.Name
	chatAuthContext.ChatChannelID = channel.ID
	// Store the expanded prompt as the visible request message so every
	// operator sees exactly what was submitted to the AI container.
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	var apiTokenID interface{}
	if authContext.APITokensID > 0 {
		apiTokenID = authContext.APITokensID
	}

	metadataText := rabbitmq.GetMythicJSONTextFromStruct(options.RequestMessageMetadata)
	var requestMessageID int
	err = database.DB.Get(&requestMessageID, `INSERT INTO chat_message
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
	if err != nil {
		logging.LogError(err, "Failed to create AI prompt message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	var retryOf interface{}
	if options.RetryOfID != nil {
		retryOf = *options.RetryOfID
	}
	var requestID int
	err = database.DB.Get(&requestID, `INSERT INTO chat_request
		(operation_id, channel_id, request_message_id, chat_container_id,
		 model, status, context_snapshot, retry_of_id, created_by)
		VALUES ($1, $2, $3, $4, $5, 'pending', $6::jsonb, $7, $8)
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		channel.ID,
		requestMessageID,
		container.ID,
		channel.ChatModel,
		rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{}).String(),
		retryOf,
		operatorOperation.CurrentOperator.ID,
	)
	if err != nil {
		logging.LogError(err, "Failed to create AI chat request")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	// now that an AI request exists, ship it off to the container for processing
	go dispatchAIChatRequest(
		operatorOperation.CurrentOperation.ID,
		operatorOperation.CurrentOperator.ID,
		operatorOperation.CurrentOperator.Username,
		channel,
		container,
		requestID,
		requestMessageID,
		aliasResolvedPrompt,
		retryOf,
		options.SlashCommand,
		options.AliasResolution,
		options.SlashMetadata,
		options.InputResponse,
		chatAuthContext,
	)

	c.JSON(http.StatusOK, ChatActionResponse{
		Status:    "success",
		ID:        requestMessageID,
		MessageID: requestMessageID,
		ChannelID: channel.ID,
		RequestID: requestID,
	})
}

func dispatchAIChatRequest(
	operationID int,
	operatorID int,
	operatorUsername string,
	channel databaseStructs.ChatChannel,
	container databaseStructs.ConsumingContainer,
	requestID int,
	requestMessageID int,
	prompt string,
	retryOf interface{},
	slashCommand *rabbitmq.ChatSlashCommandInvocation,
	aliasResolution *rabbitmq.OperatorAliasResolution,
	slashMetadata map[string]interface{},
	inputResponse *rabbitmq.ChatContainerInputResponse,
	chatAuthContext rabbitmq.RabbitMQAuthContext,
) {
	contextMessages, err := getChatContextMessages(operationID, channel.ID, requestMessageID)
	if err != nil {
		logging.LogError(err, "Failed to fetch AI chat context")
		markChatRequestFailed(requestID, operationID, err.Error())
		return
	}
	metadata := channel.AIMetadata.StructValue()
	chatConfig, ok := metadata["config"].(map[string]any)
	if !ok {
		chatConfig = map[string]any{}
	}
	contextIDs := make([]int, len(contextMessages))
	for i := range contextMessages {
		contextIDs[i] = contextMessages[i].ID
	}
	contextSnapshotMap := map[string]interface{}{
		"context_message_ids":   contextIDs,
		"request_message_id":    requestMessageID,
		"retry_of_id":           retryOf,
		"input_response":        inputResponse,
		"context_message_limit": chatContextMessageLimit,
		"config":                chatConfig,
		"final_prompt":          prompt,
	}
	requestMetadata := map[string]interface{}{}
	if len(contextMessages) > 0 {
		if err = json.Unmarshal(contextMessages[len(contextMessages)-1].Metadata, &requestMetadata); err != nil {
			requestMetadata = map[string]interface{}{}
		}
	}
	delegationID, _ := requestMetadata["delegation_id"].(string)
	delegationName, _ := requestMetadata["delegation_name"].(string)
	delegationID = strings.TrimSpace(delegationID)
	delegationName = strings.TrimSpace(delegationName)
	if delegationID != "" {
		contextSnapshotMap["delegation_id"] = delegationID
	}
	if delegationName != "" {
		contextSnapshotMap["delegation_name"] = delegationName
	}
	if slashCommand != nil {
		contextSnapshotMap["slash_command"] = slashCommand
	}
	if aliasResolution != nil {
		contextSnapshotMap["alias_expansion"] = aliasResolution
	}
	if len(slashMetadata) > 0 {
		contextSnapshotMap["slash_metadata"] = slashMetadata
	}
	contextSnapshot := rabbitmq.GetMythicJSONTextFromStruct(contextSnapshotMap)
	_, _ = database.DB.Exec(`UPDATE chat_request
		SET context_snapshot=$3::jsonb
		WHERE id=$1 AND operation_id=$2`, requestID, operationID, contextSnapshot.String())

	err = rabbitmq.RabbitMQConnection.SendChatContainerRequest(container.Name, rabbitmq.ChatContainerRequestMessage{
		OperationID:      operationID,
		OperatorID:       operatorID,
		OperatorUsername: operatorUsername,
		ChannelID:        channel.ID,
		APITokenID:       int(channel.APITokensID.Int64),
		ChannelName:      channel.Name,
		ChannelSlug:      channel.Slug,
		RequestID:        requestID,
		RequestMessageID: requestMessageID,
		Model:            channel.ChatModel,
		Prompt:           prompt,
		Config:           chatConfig,
		Context:          contextMessages,
		Secrets:          rabbitmq.GetSecrets(operatorID, 0),
		SlashCommand:     slashCommand,
		InputResponse:    inputResponse,
		DelegationID:     delegationID,
		DelegationName:   delegationName,
	}, chatAuthContext)
	if err != nil {
		logging.LogError(err, "Failed to send AI chat request", "request_id", requestID)
		markChatRequestFailed(requestID, operationID, err.Error())
	}
}

// validateRequiredScopeForChat validates if the user has the right scope
func validateRequiredScopeForChat(c *gin.Context, requiredScope string) bool {
	scopes, err := authentication.GetScopesSetFromClaims(c)
	if err != nil {
		logging.LogError(err, "Failed to get grants for chat scope check")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to get authentication claims"})
		return false
	}
	if !scopes[authorization.SCOPE_ALL] && !scopes[requiredScope] {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: fmt.Sprintf("missing required scope: %s", requiredScope)})
		return false
	}
	// Personal read-state changes are allowed for spectators. Shared chat writes
	// must still respect the token owner's current role on this request.
	claims, _ := authentication.GetClaims(c)
	if claims.APITokensID > 0 && strings.HasSuffix(requiredScope, ".write") {
		operation, err := authentication.GetRequestOperation(c)
		if err != nil || !operation.CurrentOperator.Admin && operation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "the token owner's role does not allow chat writes"})
			return false
		}
	}
	return true
}

// chatScopeForChannel checks with authorization scope is needed based on the channel type
func chatScopeForChannel(channel databaseStructs.ChatChannel, write bool) string {
	if channel.ChannelType == databaseStructs.ChatChannelTypeAI {
		if write {
			return authorization.SCOPE_CHAT_AI_WRITE
		}
		return authorization.SCOPE_CHAT_AI_READ
	}
	if write {
		return authorization.SCOPE_CHAT_WRITE
	}
	return authorization.SCOPE_CHAT_READ
}

// userIsAdminOrOperationLead checks if the user for this operation is an operation lead or a global admin
func userIsAdminOrOperationLead(operatorOperation *databaseStructs.Operatoroperation) bool {
	return operatorOperation.CurrentOperator.Admin ||
		operatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD
}

// chatIsGeneralChannel checks if the specified chat is the special general channel
func chatIsGeneralChannel(channel databaseStructs.ChatChannel) bool {
	return channel.ChannelType == databaseStructs.ChatChannelTypeStandard &&
		strings.EqualFold(channel.Slug, chatGeneralChannelName)
}

// chatCanPostToAIChannel checks if the AI channel is locked or if the current user is the one that locked it
func chatCanPostToAIChannel(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel) bool {
	if !channel.Locked {
		return true
	}
	return channel.LockedBy.Valid && int(channel.LockedBy.Int64) == operatorOperation.CurrentOperator.ID
}

// slugifyChatChannelName takes a channel name and replaces bad characters with -
func slugifyChatChannelName(name string) string {
	slug := strings.ToLower(strings.TrimSpace(name))
	slug = chatSlugInvalidCharacters.ReplaceAllString(slug, "-")
	slug = strings.Trim(slug, "-")
	if slug == "" {
		return "channel"
	}
	return slug
}

// uniqueChatSlug tries to generate a unique slug for the chat channel
func uniqueChatSlug(operationID int, baseSlug string, excludeChannelID int) (string, error) {
	for i := range 1000 {
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

func chatFindInputChoice(inputRequest map[string]interface{}, choiceID string) map[string]interface{} {
	choices, ok := inputRequest["choices"].([]interface{})
	if !ok {
		return nil
	}
	for index, choice := range choices {
		choiceMap, ok := choice.(map[string]interface{})
		if !ok {
			continue
		}
		if id, _ := choiceMap["id"].(string); id == choiceID {
			return chatCopyMetadataMap(choiceMap)
		}
		if _, ok = choiceMap["id"]; !ok && fmt.Sprintf("%d", index) == choiceID {
			return chatCopyMetadataMap(choiceMap)
		}
	}
	return nil
}

// resolveAIChatStartingSlashAliases resolves leading /aliases for prompt
func resolveAIChatStartingSlashAliases(operatorID int, channel databaseStructs.ChatChannel, container databaseStructs.ConsumingContainer, message string) (string, map[string]interface{}, *rabbitmq.ChatSlashCommandInvocation, *rabbitmq.OperatorAliasResolution, error) {
	trimmedMessage := strings.TrimSpace(message)
	// don't do anything if the message doesn't start with /
	if !strings.HasPrefix(trimmedMessage, "/") {
		return message, nil, nil, nil, nil
	}
	// Load the slash commands advertised by this model.
	modelCommands := map[string]bool{}
	for _, subscription := range container.Subscriptions.StructValue() {
		var modelDefinition aiChatModelDefinition
		if subscriptionString, ok := subscription.(string); ok {
			err := json.Unmarshal([]byte(subscriptionString), &modelDefinition)
			if err != nil {
				logging.LogError(err, "failed to decode subscription in getAIModelSlashCommands")
				continue
			}
		}
		if modelDefinition.Name != channel.ChatModel {
			continue
		}
		for _, rawCommand := range modelDefinition.Metadata.SlashCommands {
			modelCommands[rawCommand.Name] = true
		}
	}
	// input starts with /, process it for any operator alias slash commands
	aliasResolution, err := rabbitmq.ResolveOperatorAliasLineWithProvidedSlashCommands(
		operatorID,
		rabbitmq.OperatorAliasScope{ConsumingContainerID: int(channel.ChatContainerID.Int64)},
		trimmedMessage,
		modelCommands)
	if err != nil {
		return message, nil, nil, nil, err
	}
	metadata := map[string]interface{}{
		"slash_input": map[string]interface{}{
			"original_input": trimmedMessage,
			"final_prompt":   aliasResolution.Expanded,
		},
	}
	if aliasResolution.AliasMatched {
		aliasCopy := aliasResolution
		metadata["alias_expansion"] = aliasCopy
	}
	if !aliasResolution.FinalIsSlash {
		// we ended up with an operator defined / command that expanded out to something that's not another / command
		return aliasResolution.Expanded, metadata, nil, &aliasResolution, nil
	}
	if _, ok := modelCommands[aliasResolution.FinalCommand]; !ok {
		return message, nil, nil, nil, fmt.Errorf("unknown AI slash command /%s", aliasResolution.FinalCommand)
	}
	slashCommand := &rabbitmq.ChatSlashCommandInvocation{
		Name:     aliasResolution.FinalCommand,
		Argument: aliasResolution.FinalArgument,
		Raw:      aliasResolution.Expanded,
		Source:   "model",
	}
	metadata["slash_command"] = slashCommand
	// metadata ended with slash_input, alias_expansion, and slash_command potentially existing
	return aliasResolution.Expanded, metadata, slashCommand, &aliasResolution, nil
}

// processAIChatGenericAliases resolves generic @ aliases in body of prompt
func processAIChatGenericAliases(operatorID int, channel databaseStructs.ChatChannel, message string, aliasResolution *rabbitmq.OperatorAliasResolution) (string, map[string]interface{}, *rabbitmq.OperatorAliasResolution, error) {
	scope := rabbitmq.OperatorAliasScope{ConsumingContainerID: int(channel.ChatContainerID.Int64)}
	finalPrompt, aliasesExpanded, genericResolution, err := rabbitmq.ResolveOperatorGenericAliasesInString(operatorID, scope, message)
	if err != nil {
		return message, nil, aliasResolution, err
	}
	if !aliasesExpanded {
		return message, nil, aliasResolution, nil
	}
	aliasResolution = rabbitmq.MergeOperatorAliasResolution(aliasResolution, genericResolution)
	metadata := map[string]interface{}{
		"generic_alias_expansion": genericResolution,
	}
	return finalPrompt, metadata, aliasResolution, nil
}

type aiChatSlashCommandDefinition struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}
type aiChatModelMetadata struct {
	SlashCommands []aiChatSlashCommandDefinition `json:"slash_commands" mapstructure:"slash_commands"`
}
type aiChatModelDefinition struct {
	Name        string              `json:"name" mapstructure:"name"`
	Description string              `json:"description" mapstructure:"description"`
	Metadata    aiChatModelMetadata `json:"metadata" mapstructure:"metadata"`
}

// mergeChatMetadata just merges the two maps
func mergeChatMetadata(base map[string]any, extra map[string]any) map[string]any {
	if len(base) == 0 && len(extra) == 0 {
		return nil
	}
	merged := map[string]any{}
	maps.Copy(merged, base)
	maps.Copy(merged, extra)
	return merged
}

// validateAIChatChannelAPIToken makes sure the apitoken matches the operation id, user, and has the right scopes
func validateAIChatChannelAPIToken(apiTokenID int, operationID int) (databaseStructs.Apitokens, error) {
	apiToken := databaseStructs.Apitokens{}
	if apiTokenID <= 0 {
		return apiToken, fmt.Errorf("AI chat channels require an apitokens_id")
	}
	err := database.DB.Get(&apiToken, `SELECT apitokens.*
		FROM apitokens
		WHERE apitokens.id=$1 AND apitokens.operation_id=$2`,
		apiTokenID, operationID)
	if err != nil {
		return apiToken, fmt.Errorf("failed to find an active API token for this operation")
	}
	return apiToken, checkAIChatChannelAPIToken(apiToken)
}

// checkAIChatChannelAPIToken makes sure the supplied token has the right permissions for an AI Chat
func checkAIChatChannelAPIToken(apiToken databaseStructs.Apitokens) error {
	if apiToken.ID == 0 {
		return fmt.Errorf("failed to find an active API token for this operation")
	}
	if apiToken.Deleted || !apiToken.Active {
		return fmt.Errorf("AI chat channel API token must be active and not deleted")
	}
	if apiToken.TokenType != mythicjwt.AUTH_METHOD_API {
		return fmt.Errorf("AI chat channel API token must be a normal API token")
	}
	if !authorization.AllowsScope(apiToken.Scopes, authorization.SCOPE_APITOKEN_WRITE) ||
		!authorization.AllowsScope(apiToken.Scopes, authorization.SCOPE_CHAT_AI_WRITE) {
		return fmt.Errorf("AI chat channel API token must include %s and %s",
			authorization.SCOPE_APITOKEN_WRITE, authorization.SCOPE_CHAT_AI_WRITE)
	}
	return nil
}

func chatChannelGetRabbitMQAuthContext(channel databaseStructs.ChatChannel) (rabbitmq.RabbitMQAuthContext, error) {
	if !channel.APITokensID.Valid || channel.APITokensID.Int64 <= 0 {
		return rabbitmq.RabbitMQAuthContext{}, fmt.Errorf("AI chat channel is missing an API token")
	}
	apiToken, err := validateAIChatChannelAPIToken(int(channel.APITokensID.Int64), channel.OperationID)
	if err != nil {
		return rabbitmq.RabbitMQAuthContext{}, err
	}
	return chatRabbitMQAuthContextFromToken(apiToken), nil
}

func chatRabbitMQAuthContextFromToken(apiToken databaseStructs.Apitokens) rabbitmq.RabbitMQAuthContext {
	return rabbitmq.RabbitMQAuthContext{
		OperatorID:   apiToken.OperatorID,
		OperationID:  apiToken.OperationID,
		APITokensID:  apiToken.ID,
		SourceScopes: append([]string{}, apiToken.Scopes...),
	}
}

func getChatChannel(ctx context.Context, channelID, operationID int) (databaseStructs.ChatChannel, error) {
	var channel databaseStructs.ChatChannel
	err := database.DB.GetContext(ctx, &channel, `SELECT id, operation_id, name, slug, channel_type,
			archived, locked, locked_by, chat_container_id, chat_model, ai_metadata, apitokens_id
		FROM chat_channel WHERE id=$1 AND operation_id=$2`, channelID, operationID)
	return channel, err
}

func getChatMessageAndChannel(ctx context.Context, messageID, operationID int) (databaseStructs.ChatMessage, databaseStructs.ChatChannel, error) {
	var message databaseStructs.ChatMessage
	err := database.DB.GetContext(ctx, &message, `SELECT
			m.id, m.author_type, m.operator_id, m.deleted, m.metadata,
			ch.id "channel.id", ch.channel_type "channel.channel_type"
		FROM chat_message m
		JOIN chat_channel ch ON ch.id=m.channel_id AND ch.operation_id=m.operation_id
		WHERE m.id=$1 AND m.operation_id=$2`, messageID, operationID)
	return message, message.Channel, err
}

func getChatRequestAndChannel(ctx context.Context, requestID, operationID int) (databaseStructs.ChatRequest, databaseStructs.ChatChannel, error) {
	var request databaseStructs.ChatRequest
	err := database.DB.GetContext(ctx, &request, `SELECT r.id, r.request_message_id,
			ch.id "channel.id", ch.operation_id "channel.operation_id",
			ch.name "channel.name", ch.slug "channel.slug", ch.channel_type "channel.channel_type",
			ch.archived "channel.archived", ch.locked "channel.locked", ch.locked_by "channel.locked_by",
			ch.chat_container_id "channel.chat_container_id", ch.chat_model "channel.chat_model",
			ch.ai_metadata "channel.ai_metadata", ch.apitokens_id "channel.apitokens_id"
		FROM chat_request r
		JOIN chat_channel ch ON ch.id=r.channel_id AND ch.operation_id=r.operation_id
		WHERE r.id=$1 AND r.operation_id=$2`, requestID, operationID)
	return request, request.Channel, err
}

// insertSystemChatMessage writes the system message to the specific chat channel
func insertSystemChatMessage(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, authContext rabbitmq.RabbitMQAuthContext) (int, error) {
	var apiTokenID *int
	if authContext.APITokensID > 0 {
		apiTokenID = &authContext.APITokensID
	}
	metadata := rabbitmq.GetMythicJSONTextFromStruct(map[string]any{
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

// insertSystemChatMessageAllOperations makes sure the general channel exists and adds the message to them
func insertSystemChatMessageAllOperations(operatorOperation *databaseStructs.Operatoroperation, message string, authContext rabbitmq.RabbitMQAuthContext) (int, error) {
	// make sure there's an active general channel for every operation
	_, err := database.DB.Exec(`INSERT INTO chat_channel AS existing
    (operation_id, name, slug, description, channel_type, created_by)
    SELECT id, $1, $1, 'Default operation chat channel', $2, admin_id
    FROM operation
    WHERE deleted = false
    ON CONFLICT (operation_id, lower(slug)) DO UPDATE
    SET name = EXCLUDED.name,
        archived = false,
        archived_by = NULL,
        archived_at = NULL
    WHERE existing.channel_type = EXCLUDED.channel_type
      AND existing.name <> EXCLUDED.name`,
		chatGeneralChannelName,
		databaseStructs.ChatChannelTypeStandard,
	)
	if err != nil {
		return 0, err
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
	messageID := 0
	err = database.DB.Get(&messageID, `WITH inserted AS (
    	INSERT INTO chat_message
		(operation_id, channel_id, apitokens_id, author_type, sender_display_name, message, status, metadata)
		SELECT chat_channel.operation_id, chat_channel.id, $1, 'system', 'System', $2, 'complete', $3::jsonb
		FROM chat_channel
		JOIN operation ON operation.id=chat_channel.operation_id
		WHERE operation.deleted=false
			AND chat_channel.channel_type=$4
			AND lower(chat_channel.slug)=$5
		RETURNING id, operation_id)
		SELECT id FROM inserted WHERE operation_id = $6`,
		apiTokenID,
		message,
		metadata.String(),
		databaseStructs.ChatChannelTypeStandard,
		chatGeneralChannelName,
		operatorOperation.CurrentOperation.ID,
	)
	if err != nil {
		return 0, err
	}
	return messageID, nil
}

func getChatContextMessages(operationID int, channelID int, lastMessageID int) ([]rabbitmq.ChatContainerContextMessage, error) {
	contextMessages := []rabbitmq.ChatContainerContextMessage{}
	err := database.DB.Select(&contextMessages, `SELECT
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
		LIMIT $4`, operationID, channelID, lastMessageID, chatContextMessageLimit)
	if err != nil {
		return contextMessages, err
	}
	for i, j := 0, len(contextMessages)-1; i < j; i, j = i+1, j-1 {
		contextMessages[i], contextMessages[j] = contextMessages[j], contextMessages[i]
	}
	return contextMessages, nil
}

func markChatRequestFailed(requestID int, operationID int, errorMessage string) {
	metadata := rabbitmq.GetMythicJSONTextFromStruct(map[string]any{
		"error":             errorMessage,
		"chat_request_id":   requestID,
		"chat_response_key": "system:error",
	})
	_, _ = database.DB.Exec(`INSERT INTO chat_message
		(operation_id, channel_id, author_type, chat_request_id, chat_response_key,
		 chat_container_id, sender_display_name, message, status, metadata)
		SELECT operation_id, channel_id, 'ai', chat_request.id, 'system:error',
			chat_container_id, COALESCE(consuming_container.name, ''), $3, 'error', $4::jsonb
		FROM chat_request
		LEFT JOIN consuming_container ON consuming_container.id = chat_request.chat_container_id
		WHERE chat_request.id=$1 AND chat_request.operation_id=$2
		ON CONFLICT (chat_request_id, chat_response_key) WHERE chat_request_id IS NOT NULL
		DO UPDATE SET message=EXCLUDED.message, status='error', metadata=chat_message.metadata || EXCLUDED.metadata`,
		requestID, operationID, errorMessage, metadata.String())
	_, _ = database.DB.Exec(`UPDATE chat_request
		SET status='error', error=$3
		WHERE id=$1 AND operation_id=$2`, requestID, operationID, errorMessage)
}
