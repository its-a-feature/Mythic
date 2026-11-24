package webcontroller

import (
	"context"
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/lib/pq"
)

type UpdateChatChannelInput struct {
	Input UpdateChatChannel `json:"input" binding:"required"`
}

type UpdateChatChannel struct {
	ChannelID   int     `json:"channel_id" binding:"required"`
	Name        *string `json:"name"`
	Description *string `json:"description"`
	Archived    *bool   `json:"archived"`
	Locked      *bool   `json:"locked"`
	ChatModel   *string `json:"chat_model"`
	AIMetadata  any     `json:"ai_metadata"`
	APITokenID  *int    `json:"apitokens_id"`
	Muted       *bool   `json:"muted"`
}
type EditChatMessageInput struct {
	Input EditChatMessage `json:"input" binding:"required"`
}

type EditChatMessage struct {
	MessageID int    `json:"message_id" binding:"required"`
	Message   string `json:"message" binding:"required"`
}

type DeleteChatMessageInput struct {
	Input DeleteChatMessage `json:"input" binding:"required"`
}

type DeleteChatMessage struct {
	MessageID int `json:"message_id" binding:"required"`
}

type MarkChatReadInput struct {
	Input MarkChatRead `json:"input" binding:"required"`
}

type MarkChatRead struct {
	ChannelID         int  `json:"channel_id" binding:"required"`
	LastReadMessageID *int `json:"last_read_message_id"`
}

type RefreshChatSpecialMessageInput struct {
	Input RefreshChatSpecialMessage `json:"input" binding:"required"`
}

type RefreshChatSpecialMessage struct {
	MessageID int `json:"message_id" binding:"required"`
}

type SubmitChatInputResponseInput struct {
	Input SubmitChatInputResponse `json:"input" binding:"required"`
}

type SubmitChatInputResponse struct {
	MessageID int    `json:"message_id" binding:"required"`
	Action    string `json:"action" binding:"required"`
	Response  string `json:"response"`
	ChoiceID  string `json:"choice_id"`
}

type chatInputResponseTarget struct {
	Message   databaseStructs.ChatMessage        `db:"message"`
	Channel   databaseStructs.ChatChannel        `db:"channel"`
	Request   databaseStructs.ChatRequest        `db:"request"`
	Container databaseStructs.ConsumingContainer `db:"container"`
	APIToken  databaseStructs.Apitokens          `db:"token"`
	Prompt    sql.NullString                     `db:"prompt"`
}

type ChatSearchInput struct {
	Input ChatSearch `json:"input" binding:"required"`
}

type ChatSearch struct {
	Query     string `json:"query" binding:"required"`
	ChannelID *int   `json:"channel_id"`
	Limit     int    `json:"limit"`
	Offset    int    `json:"offset"`
}

type ChatSearchResult struct {
	ID                int       `db:"id" json:"id"`
	ChannelID         int       `db:"channel_id" json:"channel_id"`
	ChannelName       string    `db:"channel_name" json:"channel_name"`
	ChannelSlug       string    `db:"channel_slug" json:"channel_slug"`
	ChannelType       string    `db:"channel_type" json:"channel_type"`
	AuthorType        string    `db:"author_type" json:"author_type"`
	SenderDisplayName string    `db:"sender_display_name" json:"sender_display_name"`
	Message           string    `db:"message" json:"message"`
	Edited            bool      `db:"edited" json:"edited"`
	Status            string    `db:"status" json:"status"`
	CreatedAt         time.Time `db:"created_at" json:"created_at"`
	Rank              float64   `db:"rank" json:"rank"`
}

type ChatRequestActionInput struct {
	Input ChatRequestAction `json:"input" binding:"required"`
}

type ChatRequestAction struct {
	RequestID int `json:"request_id" binding:"required"`
}

func UpdateChatChannelWebhook(c *gin.Context) {
	var input UpdateChatChannelInput
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
	update := input.Input
	operationID := operatorOperation.CurrentOperation.ID
	operatorID := operatorOperation.CurrentOperator.ID
	ctx := c.Request.Context()
	var channel databaseStructs.ChatChannel
	err = database.DB.GetContext(ctx, &channel, `SELECT id, name, slug, channel_type, created_by,
			archived, locked_by, apitokens_id
		FROM chat_channel WHERE id=$1 AND operation_id=$2`, update.ChannelID, operationID)
	if err != nil {
		logging.LogError(err, "Failed to get chat channel")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat channel"})
		return
	}
	if update.Muted != nil {
		if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, false)) {
			return
		}
		_, err = database.DB.ExecContext(ctx, `INSERT INTO chat_read_state
		(operation_id, channel_id, operator_id, muted)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (operator_id, channel_id) DO UPDATE
		SET muted=excluded.muted`, operationID, channel.ID, operatorID, *update.Muted)
		if err != nil {
			logging.LogError(err, "Failed to update chat mute state")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, true)) {
		return
	}
	if !userIsAdminOrOperationLead(operatorOperation) && channel.CreatedBy != operatorID {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only the channel creator or an operation admin can update this channel"})
		return
	}
	var assignments []string
	params := map[string]any{"id": channel.ID, "operation_id": operationID}
	if update.Name != nil {
		name := strings.TrimSpace(*update.Name)
		if name == "" {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "channel name is required"})
			return
		}
		if chatIsGeneralChannel(channel) {
			if name != channel.Name {
				c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "the general channel name cannot be changed"})
				return
			}
		} else {
			slug, err := uniqueChatSlug(operationID, slugifyChatChannelName(name), channel.ID)
			if err != nil {
				logging.LogError(err, "Failed to generate unique chat slug")
				c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
				return
			}
			assignments = append(assignments, "name=:name", "slug=:slug")
			params["name"] = name
			params["slug"] = slug
		}
	}
	if update.Description != nil {
		assignments = append(assignments, "description=:description")
		params["description"] = *update.Description
	}
	archived := channel.Archived
	if update.Archived != nil {
		archived = *update.Archived
		if chatIsGeneralChannel(channel) && archived {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "the general channel cannot be archived"})
			return
		}
		assignments = append(assignments, "archived=:archived", "archived_by=:archived_by", "archived_at=:archived_at")
		params["archived"] = archived
		params["archived_by"], params["archived_at"] = nil, nil
		if archived {
			params["archived_by"], params["archived_at"] = operatorID, time.Now().UTC()
		}
	}
	const unlockError = "only the lock owner or an operation admin can unlock this AI chat"
	requireLockOwner := update.Locked != nil && !*update.Locked && !userIsAdminOrOperationLead(operatorOperation)
	if update.Locked != nil {
		if channel.ChannelType != databaseStructs.ChatChannelTypeAI {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only AI chat channels can be locked"})
			return
		}
		if requireLockOwner && (!channel.LockedBy.Valid || int(channel.LockedBy.Int64) != operatorID) {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: unlockError})
			return
		}
		assignments = append(assignments, "locked=:locked", "locked_by=:locked_by", "locked_at=:locked_at")
		params["locked"] = *update.Locked
		params["locked_by"], params["locked_at"] = nil, nil
		if *update.Locked {
			params["locked_by"], params["locked_at"] = operatorID, time.Now().UTC()
		}
	}
	if update.ChatModel != nil {
		assignments = append(assignments, "chat_model=:chat_model")
		params["chat_model"] = *update.ChatModel
	}
	if update.AIMetadata != nil {
		assignments = append(assignments, "ai_metadata=CAST(:ai_metadata AS jsonb)")
		params["ai_metadata"] = chatJSONText(update.AIMetadata).String()
	}
	tokenChanged := false
	if update.APITokenID != nil {
		if channel.ChannelType != databaseStructs.ChatChannelTypeAI {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "apitokens_id can only be set for AI chat channels"})
			return
		}
		if *update.APITokenID <= 0 {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "AI chat channels require an apitokens_id"})
			return
		}
		_, err = validateAIChatChannelAPIToken(*update.APITokenID, operationID)
		if err != nil {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
		tokenChanged = !channel.APITokensID.Valid || int(channel.APITokensID.Int64) != *update.APITokenID
		assignments = append(assignments, "apitokens_id=:apitokens_id")
		params["apitokens_id"] = *update.APITokenID
	}
	if channel.ChannelType == databaseStructs.ChatChannelTypeAI && !channel.APITokensID.Valid && update.APITokenID == nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "AI chat channels require an apitokens_id"})
		return
	}

	if len(assignments) > 0 {
		query := "UPDATE chat_channel SET " + strings.Join(assignments, ", ") + " WHERE id=:id AND operation_id=:operation_id"
		if requireLockOwner {
			query += " AND locked_by=:operator_id"
			params["operator_id"] = operatorID
		}
		result, err := database.DB.NamedExecContext(ctx, query, params)
		if err != nil {
			logging.LogError(err, "Failed to update chat channel")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
		if requireLockOwner {
			if rows, _ := result.RowsAffected(); rows == 0 {
				c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: unlockError})
				return
			}
		}
	}
	if archived || tokenChanged {
		expireGeneratedChatAPITokensForChannel(channel.ID)
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: channel.ID, ChannelID: channel.ID})
}

func EditChatMessageWebhook(c *gin.Context) {
	var input EditChatMessageInput
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
	chatMessage, channel, err := getChatMessageAndChannel(c.Request.Context(), input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat message for edit")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat message"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, true)) {
		return
	}
	if chatMessage.Deleted {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cannot edit a deleted chat message"})
		return
	}
	if chatMessage.AuthorType != databaseStructs.ChatMessageAuthorOperator ||
		!chatMessage.OperatorID.Valid ||
		int(chatMessage.OperatorID.Int64) != operatorOperation.CurrentOperator.ID {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only the message author can edit this message"})
		return
	}
	_, err = database.DB.Exec(`UPDATE chat_message
		SET message=$3, edited=true, edited_at=now()
		WHERE id=$1 AND operation_id=$2`, chatMessage.ID, operatorOperation.CurrentOperation.ID, message)
	if err != nil {
		logging.LogError(err, "Failed to edit chat message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID})
}

func DeleteChatMessageWebhook(c *gin.Context) {
	var input DeleteChatMessageInput
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
	chatMessage, channel, err := getChatMessageAndChannel(c.Request.Context(), input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat message for delete")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat message"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, true)) {
		return
	}
	if !userIsAdminOrOperationLead(operatorOperation) &&
		(!chatMessage.OperatorID.Valid || int(chatMessage.OperatorID.Int64) != operatorOperation.CurrentOperator.ID) {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only the message author or an operation admin can delete this message"})
		return
	}
	// when deleting a message, make sure any pending/streaming ai chat requests are also canceled
	_, err = database.DB.ExecContext(c.Request.Context(), `WITH deleted_message AS (
			UPDATE chat_message
			SET message='Message Deleted',
				deleted=true,
				deleted_by=$3,
				deleted_at=now(),
				status='complete'
			WHERE id=$1 AND operation_id=$2
			RETURNING id, operation_id, chat_request_id
		), cancelled_requests AS (
			UPDATE chat_request AS request
			SET status='cancelled', cancelled_at=now(), error='Chat message was deleted'
			FROM deleted_message
			WHERE request.operation_id=deleted_message.operation_id
				AND request.status IN ('pending', 'streaming')
				AND (request.request_message_id=deleted_message.id OR request.id=deleted_message.chat_request_id)
			RETURNING request.id, request.operation_id
		)
		UPDATE chat_message AS message
		SET status='cancelled'
		FROM cancelled_requests
		WHERE message.operation_id=cancelled_requests.operation_id
			AND message.chat_request_id=cancelled_requests.id
			AND message.id<>$1
			AND message.status IN ('pending', 'streaming')`,
		chatMessage.ID, operatorOperation.CurrentOperation.ID, operatorOperation.CurrentOperator.ID)
	if err != nil {
		logging.LogError(err, "Failed to delete chat message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID})
}

var chatChannelTypeMap = make(map[int]databaseStructs.ChatChannel)
var chatChannelTypeMapLock sync.RWMutex

func MarkChatReadWebhook(c *gin.Context) {
	var input MarkChatReadInput
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
	chatChannelTypeMapLock.RLock()
	chatChannel, ok := chatChannelTypeMap[input.Input.ChannelID]
	chatChannelTypeMapLock.RUnlock()
	if !ok {
		err = database.DB.GetContext(c.Request.Context(), &chatChannel, `SELECT 
			id, channel_type
			FROM chat_channel
			WHERE id=$1 AND operation_id=$2`,
			input.Input.ChannelID, operatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to get chat channel for read marker")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat channel"})
			return
		}
		chatChannelTypeMapLock.Lock()
		chatChannelTypeMap[input.Input.ChannelID] = chatChannel
		chatChannelTypeMapLock.Unlock()
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(chatChannel, false)) {
		return
	}
	var lastReadID any
	if input.Input.LastReadMessageID != nil {
		lastReadID = *input.Input.LastReadMessageID
	} else {
		var maxID sql.NullInt64
		err = database.DB.Get(&maxID, `SELECT max(id) FROM chat_message
			WHERE operation_id=$1 AND channel_id=$2`, operatorOperation.CurrentOperation.ID, chatChannel.ID)
		if err != nil {
			logging.LogError(err, "Failed to get max chat message id")
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
			return
		}
		if maxID.Valid {
			lastReadID = maxID.Int64
		}
	}
	if lastReadID == nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ChannelID: chatChannel.ID})
		return
	}
	_, err = database.DB.Exec(`INSERT INTO chat_read_state
		(operation_id, channel_id, operator_id, last_read_message_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (operator_id, channel_id) DO UPDATE
		SET last_read_message_id=excluded.last_read_message_id
		WHERE chat_read_state.last_read_message_id IS NULL
			OR chat_read_state.last_read_message_id < excluded.last_read_message_id`,
		operatorOperation.CurrentOperation.ID, chatChannel.ID, operatorOperation.CurrentOperator.ID, lastReadID)
	if err != nil {
		logging.LogError(err, "Failed to mark chat channel read")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ChannelID: chatChannel.ID})
}

func RefreshChatSpecialMessageWebhook(c *gin.Context) {
	var input RefreshChatSpecialMessageInput
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
	chatMessage, channel, err := getChatMessageAndChannel(c.Request.Context(), input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat message for refresh")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat message"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, false)) {
		return
	}
	if chatMessage.Deleted {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cannot refresh a deleted chat message"})
		return
	}
	metadata := chatMessage.Metadata.StructValue()
	if metadata["special_type"] != eventing.ChatSpecialTypeEventingUserInteraction {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "chat message is not refreshable"})
		return
	}
	eventStepInstanceID, ok := chatMetadataInt(metadata, "eventstepinstance_id")
	if !ok || eventStepInstanceID <= 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "chat message is missing its eventstep instance reference"})
		return
	}
	message, senderDisplayName, refreshedMetadata, err := eventing.BuildUserInteractionChatMessage(eventStepInstanceID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to refresh eventing user interaction chat message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	refreshedMetadataText := eventing.GetMythicJSONTextFromStruct(refreshedMetadata)
	_, err = database.DB.Exec(`UPDATE chat_message
		SET sender_display_name=$3, message=$4, metadata=$5::jsonb, status=$6, updated_at=now()
		WHERE id=$1 AND operation_id=$2`,
		chatMessage.ID,
		operatorOperation.CurrentOperation.ID,
		senderDisplayName,
		message,
		refreshedMetadataText.String(),
		databaseStructs.ChatMessageStatusComplete)
	if err != nil {
		logging.LogError(err, "Failed to update refreshed chat message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID})
}

func SubmitChatInputResponseWebhook(c *gin.Context) {
	var input SubmitChatInputResponseInput
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
	action := strings.ToLower(strings.TrimSpace(input.Input.Action))
	response := strings.TrimSpace(input.Input.Response)
	choiceID := strings.TrimSpace(input.Input.ChoiceID)
	if action == "respond" && response == "" {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "response is required"})
		return
	}
	if action == "select" && choiceID == "" {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "choice_id is required"})
		return
	}
	operationID := operatorOperation.CurrentOperation.ID
	ctx := c.Request.Context()
	target, err := getChatInputResponseTarget(ctx, input.Input.MessageID, operationID)
	if err != nil {
		logging.LogError(err, "Failed to find input request message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat message"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(target.Channel, true)) {
		return
	}
	if target.Channel.ChannelType != databaseStructs.ChatChannelTypeAI {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "input responses are only valid in AI chat channels"})
		return
	}
	if target.Channel.Archived {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cannot respond in an archived chat channel"})
		return
	}
	if !chatCanPostToAIChannel(operatorOperation, target.Channel) {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "this AI chat is locked to another operator"})
		return
	}
	if target.Message.Deleted {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cannot respond to a deleted chat message"})
		return
	}
	if target.Message.AuthorType != databaseStructs.ChatMessageAuthorAI {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "input requests must come from AI messages"})
		return
	}
	if !target.Message.ChatRequestID.Valid || target.Message.ChatRequestID.Int64 <= 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "input request is missing its chat request reference"})
		return
	}
	metadata := target.Message.Metadata.StructValue()
	if metadata["special_type"] != chatSpecialTypeInputRequested {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "chat message is not an input request"})
		return
	}
	inputRequest, ok := metadata[chatSpecialTypeInputRequested].(map[string]interface{})
	if !ok {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "input request metadata is missing"})
		return
	}
	status, _ := inputRequest["status"].(string)
	if status != chatInputRequestedStatusPending {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "input request is no longer pending"})
		return
	}

	updatedInputRequest := chatCopyMetadataMap(inputRequest)
	resolvedAt := time.Now().UTC().Format(time.RFC3339)
	var selectedChoice map[string]interface{}
	switch action {
	case "accept":
		updatedInputRequest["status"] = chatInputRequestedStatusAccepted
	case "reject":
		updatedInputRequest["status"] = chatInputRequestedStatusRejected
	case "respond":
		updatedInputRequest["status"] = chatInputRequestedStatusResponded
	case "select":
		updatedInputRequest["status"] = chatInputRequestedStatusSelected
		selectedChoice = chatFindInputChoice(updatedInputRequest, choiceID)
		if selectedChoice == nil {
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "choice_id does not match any pending input choice"})
			return
		}
	default:
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "invalid action. Only accept, reject, respond, or select are valid."})
		return
	}
	inputResponseMetadata := map[string]interface{}{
		"action":                   action,
		"input_request_message_id": target.Message.ID,
		"resolved_by_operator_id":  operatorOperation.CurrentOperator.ID,
		"resolved_by":              operatorOperation.CurrentOperator.Username,
		"resolved_at":              resolvedAt,
	}
	if response != "" {
		inputResponseMetadata["response"] = response
	}
	if selectedChoice != nil {
		inputResponseMetadata["choice"] = selectedChoice
	}
	updatedInputRequest["response"] = inputResponseMetadata
	updatedInputRequest["resolved_by_operator_id"] = operatorOperation.CurrentOperator.ID
	updatedInputRequest["resolved_by"] = operatorOperation.CurrentOperator.Username
	updatedInputRequest["resolved_at"] = resolvedAt
	if target.Request.ID == 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat request"})
		return
	}
	if target.Request.Status == databaseStructs.ChatMessageStatusComplete ||
		target.Request.Status == databaseStructs.ChatMessageStatusError ||
		target.Request.Status == databaseStructs.ChatMessageStatusCancelled {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "chat request is already complete"})
		return
	}
	if target.Container.ID == 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find AI chat container"})
		return
	}
	if !target.Container.ContainerRunning {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: fmt.Sprintf("chat container %s is not running", target.Container.Name)})
		return
	}
	if !target.Channel.APITokensID.Valid || target.Channel.APITokensID.Int64 <= 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "AI chat channel is missing an API token"})
		return
	}
	if err = checkAIChatChannelAPIToken(target.APIToken); err != nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	if !target.Prompt.Valid {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find original prompt"})
		return
	}

	metadataPatch := rabbitmq.GetMythicJSONTextFromStruct(map[string]interface{}{
		chatSpecialTypeInputRequested: updatedInputRequest,
		"updated_by_operator_id":      operatorOperation.CurrentOperator.ID,
		"updated_by":                  operatorOperation.CurrentOperator.Username,
		"updated_at":                  resolvedAt,
	})
	// Lock the request for the duration of the update so cancellation cannot
	// change its status between the guard and the input resolution.
	result, err := database.DB.ExecContext(ctx, `UPDATE chat_message
		SET metadata=metadata || $3::jsonb, updated_at=now()
		WHERE id=$1
			AND operation_id=$2
			AND deleted=false
			AND metadata->>'special_type'=$4
			AND metadata->'input_requested'->>'status'=$5
			AND chat_request_id=$6
			AND EXISTS (
				SELECT 1 FROM chat_request
				WHERE id=$6 AND operation_id=$2 AND channel_id=$7
					AND status NOT IN ('complete', 'error', 'cancelled')
				FOR SHARE
			)`,
		target.Message.ID, operationID, metadataPatch.String(), chatSpecialTypeInputRequested,
		chatInputRequestedStatusPending, target.Request.ID, target.Channel.ID,
	)
	if err != nil {
		logging.LogError(err, "Failed to update input request message")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logging.LogError(err, "Failed to check input request rows affected")
		rowsAffected = 0
	}
	if rowsAffected == 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "input request is no longer pending"})
		return
	}

	inputResponse := &rabbitmq.ChatContainerInputResponse{
		Action:                action,
		Response:              response,
		Choice:                selectedChoice,
		InputRequestMessageID: target.Message.ID,
		InputRequest:          updatedInputRequest,
		ResolvedByOperatorID:  operatorOperation.CurrentOperator.ID,
		ResolvedBy:            operatorOperation.CurrentOperator.Username,
		ResolvedAt:            resolvedAt,
	}
	chatAuthContext := chatRabbitMQAuthContextFromToken(target.APIToken)
	chatAuthContext.ChatOperatorID = operatorOperation.CurrentOperator.ID
	chatAuthContext.TargetContainerName = target.Container.Name
	chatAuthContext.ChatChannelID = target.Channel.ID
	go dispatchAIChatRequest(
		operationID,
		operatorOperation.CurrentOperator.ID,
		operatorOperation.CurrentOperator.Username,
		target.Channel,
		target.Container,
		target.Request.ID,
		target.Request.RequestMessageID,
		target.Prompt.String,
		nil,
		nil,
		nil,
		nil,
		inputResponse,
		chatAuthContext,
	)
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: target.Message.ID, MessageID: target.Message.ID, ChannelID: target.Channel.ID, RequestID: target.Request.ID})
}

func getChatInputResponseTarget(ctx context.Context, messageID, operationID int) (chatInputResponseTarget, error) {
	var target chatInputResponseTarget
	// Keep the message visible when related rows are missing so the handler can
	// still check its scope and return the appropriate validation error.
	// The lateral subquery's limit keeps PostgreSQL from flattening the two
	// point lookups into a larger join to plan on every call.
	err := database.DB.GetContext(ctx, &target, `SELECT
			m.id "message.id", m.deleted "message.deleted", m.author_type "message.author_type",
			m.chat_request_id "message.chat_request_id", m.metadata "message.metadata",
			ch.id "channel.id", ch.operation_id "channel.operation_id",
			ch.name "channel.name", ch.slug "channel.slug", ch.channel_type "channel.channel_type",
			ch.archived "channel.archived", ch.locked "channel.locked", ch.locked_by "channel.locked_by",
			ch.chat_model "channel.chat_model", ch.ai_metadata "channel.ai_metadata",
			ch.apitokens_id "channel.apitokens_id",
			dispatch.request_id "request.id",
			dispatch.request_message_id "request.request_message_id",
			dispatch.request_status "request.status",
			COALESCE(dispatch.container_id, 0) "container.id",
			COALESCE(dispatch.container_name, '') "container.name",
			COALESCE(dispatch.container_running, false) "container.container_running",
			COALESCE(dispatch.token_id, 0) "token.id",
			COALESCE(dispatch.operator_id, 0) "token.operator_id",
			COALESCE(dispatch.operation_id, 0) "token.operation_id",
			COALESCE(dispatch.active, false) "token.active",
			COALESCE(dispatch.deleted, false) "token.deleted",
			COALESCE(dispatch.token_type, '') "token.token_type",
			dispatch.scopes "token.scopes", 
			dispatch.prompt "prompt"
		FROM chat_message m
		JOIN chat_channel ch ON ch.id=m.channel_id AND ch.operation_id=m.operation_id
		LEFT JOIN LATERAL (
			SELECT r.id request_id, r.request_message_id, r.status request_status,
				cc.id container_id, cc.name container_name, cc.container_running,
				t.id token_id, t.operator_id, t.operation_id, t.active, t.deleted, t.token_type, t.scopes,
				p.message prompt
			FROM chat_request r
			LEFT JOIN consuming_container cc ON cc.id=r.chat_container_id AND cc.type=$3 AND NOT cc.deleted
			LEFT JOIN chat_message p ON p.id=r.request_message_id AND p.operation_id=r.operation_id AND NOT p.deleted
			LEFT JOIN apitokens t ON t.id=ch.apitokens_id AND t.operation_id=r.operation_id AND EXISTS (
				SELECT 1 FROM operatoroperation member
				WHERE member.operator_id=t.operator_id AND member.operation_id=r.operation_id
			)
			WHERE r.id=m.chat_request_id AND r.operation_id=m.operation_id AND r.channel_id=m.channel_id
			LIMIT 1
		) dispatch ON true
		WHERE m.id=$1 AND m.operation_id=$2`, messageID, operationID, rabbitmq.CONSUMING_SERVICES_TYPE_CHAT)
	return target, err
}

func ChatSearchWebhook(c *gin.Context) {
	var input ChatSearchInput
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
	query := strings.TrimSpace(input.Input.Query)
	if query == "" {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "query is required"})
		return
	}
	allowedTypes := chatSearchAllowedChannelTypes(c)
	if len(allowedTypes) == 0 {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "missing required chat read scope"})
		return
	}
	limit := input.Input.Limit
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	offset := input.Input.Offset
	if offset < 0 {
		offset = 0
	}
	var channelID interface{}
	if input.Input.ChannelID != nil {
		channelID = *input.Input.ChannelID
	}
	results := []ChatSearchResult{}
	err = database.DB.Select(&results, `SELECT
			chat_message.id,
			chat_message.channel_id,
			chat_channel.name "channel_name",
			chat_channel.slug "channel_slug",
			chat_channel.channel_type,
			chat_message.author_type,
			chat_message.sender_display_name,
			chat_message.message,
			chat_message.edited,
			chat_message.status,
			chat_message.created_at,
			ts_rank(chat_message.search_vector, plainto_tsquery('simple', $3)) "rank"
		FROM chat_message
		JOIN chat_channel ON chat_message.channel_id = chat_channel.id
		WHERE chat_message.operation_id=$1
			AND chat_message.deleted=false
			AND chat_channel.channel_type = ANY($2)
			AND chat_message.search_vector @@ plainto_tsquery('simple', $3)
			AND ($4::integer IS NULL OR chat_message.channel_id=$4)
		ORDER BY rank DESC, chat_message.id DESC
		LIMIT $5 OFFSET $6`,
		operatorOperation.CurrentOperation.ID,
		pq.Array(allowedTypes),
		query,
		channelID,
		limit,
		offset,
	)
	if err != nil {
		logging.LogError(err, "Failed to search chat")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", Results: results})
}

func CancelChatRequestWebhook(c *gin.Context) {
	var input ChatRequestActionInput
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
	ctx := c.Request.Context()
	var request databaseStructs.ChatRequest
	err = database.DB.GetContext(ctx, &request, `SELECT
			r.id, r.created_by, r.chat_container_id, ch.id "channel.id", ch.channel_type "channel.channel_type"
		FROM chat_request r
		JOIN chat_channel ch ON ch.id=r.channel_id AND ch.operation_id=r.operation_id
		WHERE r.id=$1 AND r.operation_id=$2`, input.Input.RequestID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find chat request for cancel")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat request"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(request.Channel, true)) {
		return
	}
	if !userIsAdminOrOperationLead(operatorOperation) && request.CreatedBy != operatorOperation.CurrentOperator.ID {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "only the request creator or an operation admin can cancel this request"})
		return
	}
	cancelled, err := cancelChatRequest(ctx, request.ID, operatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to cancel chat request")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: err.Error()})
		return
	}
	if cancelled {
		container, err := rabbitmq.GetChatContainer(request.ChatContainerID)
		if err != nil {
			logging.LogError(err, "Failed to find chat container for cancellation", "request_id", request.ID)
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cancelled in Mythic, but failed to find the chat container to notify"})
			return
		}
		authContext := authentication.RabbitMQAuthContextFromGin(c)
		err = rabbitmq.RabbitMQConnection.SendChatContainerCancelRequest(container.Name, rabbitmq.ChatContainerCancelRequestMessage{
			OperationID: operatorOperation.CurrentOperation.ID,
			ChannelID:   request.Channel.ID,
			RequestID:   request.ID,
			Reason:      "Cancelled by operator",
			CancelledBy: operatorOperation.CurrentOperator.ID,
		}, authContext)
		if err != nil {
			logging.LogError(err, "Failed to send chat cancellation", "request_id", request.ID, "container", container.Name)
			c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cancelled in Mythic, but failed to notify the chat container"})
			return
		}
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", RequestID: request.ID, ChannelID: request.Channel.ID})
}

func cancelChatRequest(ctx context.Context, requestID int, operatorOperation *databaseStructs.Operatoroperation) (bool, error) {
	const reason = "Operator issued cancel"
	operationID := operatorOperation.CurrentOperation.ID
	tx, err := database.DB.BeginTxx(ctx, nil)
	if err != nil {
		return false, err
	}
	defer tx.Rollback()

	result, err := tx.ExecContext(ctx, `UPDATE chat_request
		SET status='cancelled', cancelled_at=now(), error=$3
		WHERE id=$1 AND operation_id=$2 AND status IN ('pending', 'streaming')`, requestID, operationID, reason)
	if err != nil {
		return false, err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return false, err
	}

	// Special messages can still have pending metadata after their message status is complete.
	_, err = tx.ExecContext(ctx, `WITH pending_messages AS (
			SELECT message.id, pending.special_type
			FROM chat_message message
			CROSS JOIN LATERAL (
				SELECT CASE
					WHEN NOT message.deleted AND message.metadata->>'special_type'='subagent'
						AND lower(COALESCE(message.metadata->'subagent'->>'status', 'running'))
							NOT IN ('finished', 'completed', 'complete', 'failed', 'error', 'cancelled')
						THEN 'subagent'
					WHEN NOT message.deleted AND message.metadata->>'special_type'='input_requested'
						AND COALESCE(message.metadata->'input_requested'->>'status', 'pending')='pending'
						THEN 'input_requested'
				END AS special_type
			) pending
			WHERE message.chat_request_id=$1 AND message.operation_id=$2
				AND (message.status IN ('pending', 'streaming') OR pending.special_type IS NOT NULL)
			FOR UPDATE OF message
		)
		UPDATE chat_message message
		SET status='cancelled',
			metadata = CASE WHEN pending.special_type IS NULL THEN message.metadata
				ELSE message.metadata
					|| CASE
						WHEN pending.special_type='subagent'
							AND jsonb_typeof(message.metadata->'subagent')='object'
							THEN jsonb_build_object('subagent', (message.metadata->'subagent') || jsonb_build_object(
								'status', 'cancelled',
								'cancel_reason', $3::text
							))
						WHEN pending.special_type='input_requested'
							AND jsonb_typeof(message.metadata->'input_requested')='object'
							THEN jsonb_build_object('input_requested', (message.metadata->'input_requested') || jsonb_build_object(
								'status', 'cancelled',
								'resolved_by_operator_id', $4::integer,
								'resolved_by', $5::text,
								'resolved_at', $6::text,
								'response', jsonb_build_object(
								'action', 'cancel',
									'reason', $3::text,
									'input_request_message_id', message.id,
									'resolved_by_operator_id', $4::integer,
									'resolved_by', $5::text,
									'resolved_at', $6::text
								)
							))
						ELSE '{}'::jsonb
					END
					|| jsonb_build_object(
						'updated_by_operator_id', $4::integer,
						'updated_by', $5::text,
						'updated_at', $6::text
					)
			END,
			updated_at=now()
		FROM pending_messages pending
		WHERE message.id=pending.id`, requestID, operationID, reason,
		operatorOperation.CurrentOperator.ID, operatorOperation.CurrentOperator.Username, time.Now().UTC().Format(time.RFC3339))
	if err != nil {
		return false, err
	}
	if err = tx.Commit(); err != nil {
		return false, err
	}
	return rowsAffected > 0, nil
}

func RetryChatRequestWebhook(c *gin.Context) {
	var input ChatRequestActionInput
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
	request, channel, err := getChatRequestAndChannel(c.Request.Context(), input.Input.RequestID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find chat request for retry")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find chat request"})
		return
	}
	if !validateRequiredScopeForChat(c, chatScopeForChannel(channel, true)) {
		return
	}
	if channel.Archived {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "cannot retry in an archived chat channel"})
		return
	}
	if !chatCanPostToAIChannel(operatorOperation, channel) {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "this AI chat is locked to another operator"})
		return
	}
	var prompt string
	if err = database.DB.Get(&prompt, `SELECT message FROM chat_message
		WHERE id=$1 AND operation_id=$2 AND deleted=false`,
		request.RequestMessageID, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get original prompt for retry")
		c.JSON(http.StatusOK, ChatActionResponse{Status: "error", Error: "failed to find original prompt"})
		return
	}
	createAIChatMessageWithOptions(c, operatorOperation, channel, prompt, aiChatRequestOptions{RetryOfID: &request.ID})
}

func chatSearchAllowedChannelTypes(c *gin.Context) []string {
	scopes, err := authentication.GetScopesSetFromClaims(c)
	if err != nil {
		logging.LogError(err, "Failed to get claims for chat search scope check")
		return []string{}
	}
	channelTypes := []string{}
	if scopes[authorization.SCOPE_ALL] || scopes[authorization.SCOPE_CHAT_READ] {
		channelTypes = append(channelTypes, databaseStructs.ChatChannelTypeStandard)
	}
	if scopes[authorization.SCOPE_ALL] || scopes[authorization.SCOPE_CHAT_AI_READ] {
		channelTypes = append(channelTypes, databaseStructs.ChatChannelTypeAI)
	}
	return channelTypes
}

func expireGeneratedChatAPITokensForChannel(channelID int) {
	apitokenIDs := []int{}
	if err := database.DB.Select(&apitokenIDs, `SELECT id FROM apitokens
		WHERE chat_channel_id=$1 AND token_type=$2 AND (active=true OR deleted=false)`,
		channelID, mythicjwt.AUTH_METHOD_CHAT); err == nil {
		for _, apitokenID := range apitokenIDs {
			rabbitmq.InvalidateRabbitMQAuthContextsForAPIToken(apitokenID)
		}
	}
	_, err := database.DB.Exec(`UPDATE apitokens
		SET active=false, deleted=true
		WHERE chat_channel_id=$1 AND token_type=$2 AND (active=true OR deleted=false)`,
		channelID, mythicjwt.AUTH_METHOD_CHAT)
	if err != nil {
		logging.LogError(err, "Failed to expire generated chat API tokens", "channel_id", channelID)
	}
}
