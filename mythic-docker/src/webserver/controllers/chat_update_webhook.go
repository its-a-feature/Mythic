package webcontroller

import (
	"database/sql"
	"fmt"
	"net/http"
	"strings"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
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
	ChannelID   int         `json:"channel_id" binding:"required"`
	Name        *string     `json:"name"`
	Description *string     `json:"description"`
	Archived    *bool       `json:"archived"`
	Locked      *bool       `json:"locked"`
	ChatModel   *string     `json:"chat_model"`
	AIMetadata  interface{} `json:"ai_metadata"`
	APITokenID  *int        `json:"apitokens_id"`
	Muted       *bool       `json:"muted"`
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
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	channel, err := getChatChannel(input.Input.ChannelID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat channel")
		chatRespondError(c, "failed to find chat channel")
		return
	}
	if input.Input.Muted != nil {
		if !input.Input.IsMuteOnly() {
			chatRespondError(c, "muted can only be updated by itself")
			return
		}
		updateChatMuted(c, operatorOperation, channel, *input.Input.Muted)
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if !chatIsModerator(operatorOperation) && channel.CreatedBy != operatorOperation.CurrentOperator.ID {
		chatRespondError(c, "only the channel creator or an operation admin can update this channel")
		return
	}

	name := channel.Name
	slug := channel.Slug
	if input.Input.Name != nil {
		name = strings.TrimSpace(*input.Input.Name)
		if name == "" {
			chatRespondError(c, "channel name is required")
			return
		}
		if chatIsGeneralChannel(channel) {
			if name != channel.Name {
				chatRespondError(c, "the general channel name cannot be changed")
				return
			}
		} else {
			slug, err = uniqueChatSlug(operatorOperation.CurrentOperation.ID, slugifyChatChannelName(name), channel.ID)
			if err != nil {
				logging.LogError(err, "Failed to generate unique chat slug")
				chatRespondError(c, err.Error())
				return
			}
		}
	}
	description := channel.Description
	if input.Input.Description != nil {
		description = *input.Input.Description
	}
	archived := channel.Archived
	var archivedBy interface{}
	var archivedAt interface{}
	if channel.ArchivedBy.Valid {
		archivedBy = channel.ArchivedBy.Int64
	}
	if channel.ArchivedAt.Valid {
		archivedAt = channel.ArchivedAt.Time
	}
	if input.Input.Archived != nil {
		archived = *input.Input.Archived
		if chatIsGeneralChannel(channel) && archived {
			chatRespondError(c, "the general channel cannot be archived")
			return
		}
		if archived {
			archivedBy = operatorOperation.CurrentOperator.ID
			archivedAt = time.Now().UTC()
		} else {
			archivedBy = nil
			archivedAt = nil
		}
	}
	locked := channel.Locked
	var lockedBy interface{}
	var lockedAt interface{}
	if channel.LockedBy.Valid {
		lockedBy = channel.LockedBy.Int64
	}
	if channel.LockedAt.Valid {
		lockedAt = channel.LockedAt.Time
	}
	if input.Input.Locked != nil {
		if channel.ChannelType != databaseStructs.ChatChannelTypeAI {
			chatRespondError(c, "only AI chat channels can be locked")
			return
		}
		locked = *input.Input.Locked
		if locked {
			lockedBy = operatorOperation.CurrentOperator.ID
			lockedAt = time.Now().UTC()
		} else {
			if !chatIsModerator(operatorOperation) &&
				(!channel.LockedBy.Valid || int(channel.LockedBy.Int64) != operatorOperation.CurrentOperator.ID) {
				chatRespondError(c, "only the lock owner or an operation admin can unlock this AI chat")
				return
			}
			lockedBy = nil
			lockedAt = nil
		}
	}
	chatModel := channel.ChatModel
	if input.Input.ChatModel != nil {
		chatModel = *input.Input.ChatModel
	}
	metadata := channel.AIMetadata
	if input.Input.AIMetadata != nil {
		metadata = chatJSONText(input.Input.AIMetadata)
	}
	var apiTokenID interface{}
	if channel.APITokensID.Valid {
		apiTokenID = channel.APITokensID.Int64
	}
	if input.Input.APITokenID != nil {
		if channel.ChannelType != databaseStructs.ChatChannelTypeAI {
			chatRespondError(c, "apitokens_id can only be set for AI chat channels")
			return
		}
		if *input.Input.APITokenID <= 0 {
			chatRespondError(c, "AI chat channels require an apitokens_id")
			return
		}
		if _, err = validateAIChatChannelAPIToken(*input.Input.APITokenID, operatorOperation.CurrentOperation.ID); err != nil {
			chatRespondError(c, err.Error())
			return
		}
		if !channel.APITokensID.Valid || int(channel.APITokensID.Int64) != *input.Input.APITokenID {
			expireGeneratedChatAPITokensForChannel(channel.ID)
		}
		apiTokenID = *input.Input.APITokenID
	}
	if channel.ChannelType == databaseStructs.ChatChannelTypeAI && apiTokenID == nil {
		chatRespondError(c, "AI chat channels require an apitokens_id")
		return
	}
	_, err = database.DB.Exec(`UPDATE chat_channel
		SET name=$3, slug=$4, description=$5, archived=$6, archived_by=$7, archived_at=$8,
			locked=$9, locked_by=$10, locked_at=$11, chat_model=$12, ai_metadata=$13::jsonb,
			apitokens_id=$14
		WHERE id=$1 AND operation_id=$2`,
		channel.ID,
		operatorOperation.CurrentOperation.ID,
		name,
		slug,
		description,
		archived,
		archivedBy,
		archivedAt,
		locked,
		lockedBy,
		lockedAt,
		chatModel,
		metadata.String(),
		apiTokenID,
	)
	if err != nil {
		logging.LogError(err, "Failed to update chat channel")
		chatRespondError(c, err.Error())
		return
	}
	if archived {
		expireGeneratedChatAPITokensForChannel(channel.ID)
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: channel.ID, ChannelID: channel.ID})
}

func (u UpdateChatChannel) IsMuteOnly() bool {
	return u.Muted != nil &&
		u.Name == nil &&
		u.Description == nil &&
		u.Archived == nil &&
		u.Locked == nil &&
		u.ChatModel == nil &&
		u.AIMetadata == nil &&
		u.APITokenID == nil
}

func updateChatMuted(c *gin.Context, operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, muted bool) {
	if !chatRequireScope(c, chatScopeForChannel(channel, false)) {
		return
	}
	if muted {
		var targetReadID sql.NullInt64
		err := database.DB.Get(&targetReadID, `WITH current_state AS (
				SELECT last_read_message_id
				FROM chat_read_state
				WHERE operator_id=$3 AND channel_id=$2
			),
			first_unread_system AS (
				SELECT min(id) AS id
				FROM chat_message
				WHERE operation_id=$1
					AND channel_id=$2
					AND author_type=$4
					AND id > COALESCE((SELECT last_read_message_id FROM current_state), 0)
			)
			SELECT max(id)
			FROM chat_message
			WHERE operation_id=$1
				AND channel_id=$2
				AND (
					(SELECT id FROM first_unread_system) IS NULL
					OR id < (SELECT id FROM first_unread_system)
				)`,
			operatorOperation.CurrentOperation.ID,
			channel.ID,
			operatorOperation.CurrentOperator.ID,
			databaseStructs.ChatMessageAuthorSystem,
		)
		if err != nil {
			logging.LogError(err, "Failed to calculate muted chat read target")
			chatRespondError(c, err.Error())
			return
		}
		var lastReadID interface{}
		if targetReadID.Valid {
			lastReadID = targetReadID.Int64
		}
		_, err = database.DB.Exec(`INSERT INTO chat_read_state
			(operation_id, channel_id, operator_id, last_read_message_id, muted)
			VALUES ($1, $2, $3, $4, true)
			ON CONFLICT (operator_id, channel_id) DO UPDATE
			SET muted=true,
				last_read_message_id=CASE
					WHEN excluded.last_read_message_id IS NULL THEN chat_read_state.last_read_message_id
					WHEN chat_read_state.last_read_message_id IS NULL THEN excluded.last_read_message_id
					WHEN chat_read_state.last_read_message_id < excluded.last_read_message_id THEN excluded.last_read_message_id
					ELSE chat_read_state.last_read_message_id
				END`,
			operatorOperation.CurrentOperation.ID,
			channel.ID,
			operatorOperation.CurrentOperator.ID,
			lastReadID,
		)
		if err != nil {
			logging.LogError(err, "Failed to mute chat channel")
			chatRespondError(c, err.Error())
			return
		}
	} else {
		_, err := database.DB.Exec(`INSERT INTO chat_read_state
			(operation_id, channel_id, operator_id, muted)
			VALUES ($1, $2, $3, false)
			ON CONFLICT (operator_id, channel_id) DO UPDATE
			SET muted=false`,
			operatorOperation.CurrentOperation.ID,
			channel.ID,
			operatorOperation.CurrentOperator.ID,
		)
		if err != nil {
			logging.LogError(err, "Failed to unmute chat channel")
			chatRespondError(c, err.Error())
			return
		}
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ChannelID: channel.ID})
}

func EditChatMessageWebhook(c *gin.Context) {
	var input EditChatMessageInput
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
	chatMessage, channel, err := getChatMessageAndChannel(input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat message for edit")
		chatRespondError(c, "failed to find chat message")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if chatMessage.Deleted {
		chatRespondError(c, "cannot edit a deleted chat message")
		return
	}
	if chatMessage.AuthorType != databaseStructs.ChatMessageAuthorOperator ||
		!chatMessage.OperatorID.Valid ||
		int(chatMessage.OperatorID.Int64) != operatorOperation.CurrentOperator.ID {
		chatRespondError(c, "only the message author can edit this message")
		return
	}
	_, err = database.DB.Exec(`UPDATE chat_message
		SET message=$3, edited=true, edited_at=now()
		WHERE id=$1 AND operation_id=$2`, chatMessage.ID, operatorOperation.CurrentOperation.ID, message)
	if err != nil {
		logging.LogError(err, "Failed to edit chat message")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID})
}

func DeleteChatMessageWebhook(c *gin.Context) {
	var input DeleteChatMessageInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	chatMessage, channel, err := getChatMessageAndChannel(input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat message for delete")
		chatRespondError(c, "failed to find chat message")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if !chatIsModerator(operatorOperation) &&
		(!chatMessage.OperatorID.Valid || int(chatMessage.OperatorID.Int64) != operatorOperation.CurrentOperator.ID) {
		chatRespondError(c, "only the message author or an operation admin can delete this message")
		return
	}
	_, err = database.DB.Exec(`UPDATE chat_message
		SET message='Message Deleted',
			deleted=true,
			deleted_by=$3,
			deleted_at=now(),
			status='complete'
		WHERE id=$1 AND operation_id=$2`, chatMessage.ID, operatorOperation.CurrentOperation.ID, operatorOperation.CurrentOperator.ID)
	if err != nil {
		logging.LogError(err, "Failed to delete chat message")
		chatRespondError(c, err.Error())
		return
	}
	_, _ = database.DB.Exec(`WITH cancelled_requests AS (
			UPDATE chat_request
			SET status='cancelled', cancelled_at=now(), error='Chat message was deleted'
			WHERE operation_id=$1
				AND status IN ('pending', 'streaming')
				AND (
					request_message_id=$2
					OR id=(SELECT chat_request_id FROM chat_message WHERE id=$2 AND operation_id=$1)
				)
			RETURNING id
		)
		UPDATE chat_message
		SET status='cancelled'
		WHERE operation_id=$1
			AND chat_request_id IN (SELECT id FROM cancelled_requests)
			AND status IN ('pending', 'streaming')`,
		operatorOperation.CurrentOperation.ID, chatMessage.ID)
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID})
}

func MarkChatReadWebhook(c *gin.Context) {
	var input MarkChatReadInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	channel, err := getChatChannel(input.Input.ChannelID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat channel for read marker")
		chatRespondError(c, "failed to find chat channel")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, false)) {
		return
	}
	var lastReadID interface{}
	if input.Input.LastReadMessageID != nil {
		lastReadID = *input.Input.LastReadMessageID
	} else {
		var maxID sql.NullInt64
		if err = database.DB.Get(&maxID, `SELECT max(id) FROM chat_message
			WHERE operation_id=$1 AND channel_id=$2`, operatorOperation.CurrentOperation.ID, channel.ID); err != nil {
			logging.LogError(err, "Failed to get max chat message id")
			chatRespondError(c, err.Error())
			return
		}
		if maxID.Valid {
			lastReadID = maxID.Int64
		}
	}
	if lastReadID == nil {
		c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ChannelID: channel.ID})
		return
	}
	_, err = database.DB.Exec(`INSERT INTO chat_read_state
		(operation_id, channel_id, operator_id, last_read_message_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (operator_id, channel_id) DO UPDATE
		SET last_read_message_id=excluded.last_read_message_id
		WHERE chat_read_state.last_read_message_id IS NULL
			OR chat_read_state.last_read_message_id < excluded.last_read_message_id`,
		operatorOperation.CurrentOperation.ID, channel.ID, operatorOperation.CurrentOperator.ID, lastReadID)
	if err != nil {
		logging.LogError(err, "Failed to mark chat channel read")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ChannelID: channel.ID})
}

func RefreshChatSpecialMessageWebhook(c *gin.Context) {
	var input RefreshChatSpecialMessageInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	chatMessage, channel, err := getChatMessageAndChannel(input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to get chat message for refresh")
		chatRespondError(c, "failed to find chat message")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, false)) {
		return
	}
	if chatMessage.Deleted {
		chatRespondError(c, "cannot refresh a deleted chat message")
		return
	}
	metadata := chatMessage.Metadata.StructValue()
	if metadata["special_type"] != eventing.ChatSpecialTypeEventingUserInteraction {
		chatRespondError(c, "chat message is not refreshable")
		return
	}
	eventStepInstanceID, ok := chatMetadataInt(metadata, "eventstepinstance_id")
	if !ok || eventStepInstanceID <= 0 {
		chatRespondError(c, "chat message is missing its eventstep instance reference")
		return
	}
	message, senderDisplayName, refreshedMetadata, err := eventing.BuildUserInteractionChatMessage(eventStepInstanceID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to refresh eventing user interaction chat message")
		chatRespondError(c, err.Error())
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
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID})
}

func SubmitChatInputResponseWebhook(c *gin.Context) {
	var input SubmitChatInputResponseInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	action := strings.ToLower(strings.TrimSpace(input.Input.Action))
	if action != "accept" && action != "reject" && action != "respond" && action != "select" {
		chatRespondError(c, "action must be accept, reject, respond, or select")
		return
	}
	response := strings.TrimSpace(input.Input.Response)
	choiceID := strings.TrimSpace(input.Input.ChoiceID)
	if action == "respond" && response == "" {
		chatRespondError(c, "response is required")
		return
	}
	if action == "select" && choiceID == "" {
		chatRespondError(c, "choice_id is required")
		return
	}
	chatMessage, channel, err := getChatMessageAndChannel(input.Input.MessageID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find input request message")
		chatRespondError(c, "failed to find chat message")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if channel.ChannelType != databaseStructs.ChatChannelTypeAI {
		chatRespondError(c, "input responses are only valid in AI chat channels")
		return
	}
	if channel.Archived {
		chatRespondError(c, "cannot respond in an archived chat channel")
		return
	}
	if !chatCanPostToAIChannel(operatorOperation, channel) {
		chatRespondError(c, "this AI chat is locked to another operator")
		return
	}
	if chatMessage.Deleted {
		chatRespondError(c, "cannot respond to a deleted chat message")
		return
	}
	if chatMessage.AuthorType != databaseStructs.ChatMessageAuthorAI {
		chatRespondError(c, "input requests must come from AI messages")
		return
	}
	if !chatMessage.ChatRequestID.Valid || chatMessage.ChatRequestID.Int64 <= 0 {
		chatRespondError(c, "input request is missing its chat request reference")
		return
	}
	metadata := chatMessage.Metadata.StructValue()
	if metadata["special_type"] != chatSpecialTypeInputRequested {
		chatRespondError(c, "chat message is not an input request")
		return
	}
	inputRequest, ok := metadata[chatSpecialTypeInputRequested].(map[string]interface{})
	if !ok {
		chatRespondError(c, "input request metadata is missing")
		return
	}
	status, _ := inputRequest["status"].(string)
	if status != chatInputRequestedStatusPending {
		chatRespondError(c, "input request is no longer pending")
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
			chatRespondError(c, "choice_id does not match any pending input choice")
			return
		}
	}
	inputResponseMetadata := map[string]interface{}{
		"action":                   action,
		"input_request_message_id": chatMessage.ID,
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
	metadata[chatSpecialTypeInputRequested] = updatedInputRequest
	metadata["updated_by_operator_id"] = operatorOperation.CurrentOperator.ID
	metadata["updated_by"] = operatorOperation.CurrentOperator.Username
	metadata["updated_at"] = resolvedAt
	metadataText := rabbitmq.GetMythicJSONTextFromStruct(metadata)
	result, err := database.DB.Exec(`UPDATE chat_message
		SET metadata=$3::jsonb, updated_at=now()
		WHERE id=$1
			AND operation_id=$2
			AND deleted=false
			AND metadata->>'special_type'=$4
			AND metadata->'input_requested'->>'status'=$5`,
		chatMessage.ID,
		operatorOperation.CurrentOperation.ID,
		metadataText.String(),
		chatSpecialTypeInputRequested,
		chatInputRequestedStatusPending,
	)
	if err != nil {
		logging.LogError(err, "Failed to update input request message")
		chatRespondError(c, err.Error())
		return
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logging.LogError(err, "Failed to check input request rows affected")
		rowsAffected = 0
	}
	if rowsAffected == 0 {
		chatRespondError(c, "input request is no longer pending")
		return
	}

	request, _, err := getChatRequestAndChannel(int(chatMessage.ChatRequestID.Int64), operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find chat request for input response")
		chatRespondError(c, "failed to find chat request")
		return
	}
	if chatRequestStatusIsTerminal(request.Status) {
		chatRespondError(c, "chat request is already complete")
		return
	}
	container, err := getChatContainer(request.ChatContainerID)
	if err != nil {
		logging.LogError(err, "Failed to find AI chat container for input response")
		chatRespondError(c, "failed to find AI chat container")
		return
	}
	if !container.ContainerRunning {
		chatRespondError(c, fmt.Sprintf("chat container %s is not running", container.Name))
		return
	}
	chatAuthContext, err := chatChannelAuthContext(channel)
	if err != nil {
		chatRespondError(c, err.Error())
		return
	}
	var originalPrompt string
	if err = database.DB.Get(&originalPrompt, `SELECT message FROM chat_message
		WHERE id=$1 AND operation_id=$2 AND deleted=false`,
		request.RequestMessageID, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get original prompt for input response")
		chatRespondError(c, "failed to find original prompt")
		return
	}
	inputResponse := &rabbitmq.ChatContainerInputResponse{
		Action:                action,
		Response:              response,
		Choice:                selectedChoice,
		InputRequestMessageID: chatMessage.ID,
		InputRequest:          updatedInputRequest,
		ResolvedByOperatorID:  operatorOperation.CurrentOperator.ID,
		ResolvedBy:            operatorOperation.CurrentOperator.Username,
		ResolvedAt:            resolvedAt,
	}
	go dispatchAIChatRequest(
		operatorOperation.CurrentOperation.ID,
		operatorOperation.CurrentOperator.ID,
		channel,
		container,
		request.ID,
		request.RequestMessageID,
		originalPrompt,
		nil,
		nil,
		nil,
		nil,
		inputResponse,
		chatAuthContext,
	)
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: chatMessage.ID, MessageID: chatMessage.ID, ChannelID: channel.ID, RequestID: request.ID})
}

func ChatSearchWebhook(c *gin.Context) {
	var input ChatSearchInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	query := strings.TrimSpace(input.Input.Query)
	if query == "" {
		chatRespondError(c, "query is required")
		return
	}
	allowedTypes := chatSearchAllowedChannelTypes(c)
	if len(allowedTypes) == 0 {
		chatRespondError(c, "missing required chat read scope")
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
	err := database.DB.Select(&results, `SELECT
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
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", Results: results})
}

func CancelChatRequestWebhook(c *gin.Context) {
	var input ChatRequestActionInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	request, channel, err := getChatRequestAndChannel(input.Input.RequestID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find chat request for cancel")
		chatRespondError(c, "failed to find chat request")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if !chatIsModerator(operatorOperation) && request.CreatedBy != operatorOperation.CurrentOperator.ID {
		chatRespondError(c, "only the request creator or an operation admin can cancel this request")
		return
	}
	result, err := database.DB.Exec(`UPDATE chat_request
		SET status='cancelled', cancelled_at=now(), error='Operator issued cancel'
		WHERE id=$1 AND operation_id=$2 AND status IN ('pending', 'streaming')`,
		request.ID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to cancel chat request")
		chatRespondError(c, err.Error())
		return
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logging.LogError(err, "Failed to check cancelled chat request rows affected")
		rowsAffected = 0
	}
	_, _ = database.DB.Exec(`UPDATE chat_message
		SET status='cancelled'
		WHERE chat_request_id=$1 AND operation_id=$2 AND status IN ('pending', 'streaming')`,
		request.ID, operatorOperation.CurrentOperation.ID)
	if rowsAffected > 0 {
		container := databaseStructs.ConsumingContainer{}
		if err = database.DB.Get(&container, `SELECT *
			FROM consuming_container
			WHERE id=$1`, request.ChatContainerID); err != nil {
			logging.LogError(err, "Failed to find chat container for cancellation", "request_id", request.ID)
			chatRespondError(c, "cancelled in Mythic, but failed to find the chat container to notify")
			return
		}
		authContext := authentication.RabbitMQAuthContextFromGin(c)
		if err = rabbitmq.RabbitMQConnection.SendChatContainerCancelRequest(container.Name, rabbitmq.ChatContainerCancelRequestMessage{
			OperationID: operatorOperation.CurrentOperation.ID,
			ChannelID:   channel.ID,
			RequestID:   request.ID,
			Reason:      "Cancelled by operator",
			CancelledBy: operatorOperation.CurrentOperator.ID,
		}, authContext); err != nil {
			logging.LogError(err, "Failed to send chat cancellation", "request_id", request.ID, "container", container.Name)
			chatRespondError(c, "cancelled in Mythic, but failed to notify the chat container")
			return
		}
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", RequestID: request.ID, ChannelID: channel.ID})
}

func RetryChatRequestWebhook(c *gin.Context) {
	var input ChatRequestActionInput
	if !bindChatInput(c, &input) {
		return
	}
	operatorOperation, ok := chatOperatorOperation(c)
	if !ok {
		return
	}
	request, channel, err := getChatRequestAndChannel(input.Input.RequestID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to find chat request for retry")
		chatRespondError(c, "failed to find chat request")
		return
	}
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if channel.Archived {
		chatRespondError(c, "cannot retry in an archived chat channel")
		return
	}
	if !chatCanPostToAIChannel(operatorOperation, channel) {
		chatRespondError(c, "this AI chat is locked to another operator")
		return
	}
	var prompt string
	if err = database.DB.Get(&prompt, `SELECT message FROM chat_message
		WHERE id=$1 AND operation_id=$2 AND deleted=false`,
		request.RequestMessageID, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get original prompt for retry")
		chatRespondError(c, "failed to find original prompt")
		return
	}
	createAIChatMessage(c, operatorOperation, channel, prompt, &request.ID)
}

func chatSearchAllowedChannelTypes(c *gin.Context) []string {
	claims, err := authentication.GetClaims(c)
	if err != nil {
		logging.LogError(err, "Failed to get claims for chat search scope check")
		return []string{}
	}
	channelTypes := []string{}
	if mythicjwt.AllowsScope(claims.Scopes, mythicjwt.SCOPE_CHAT_READ) {
		channelTypes = append(channelTypes, databaseStructs.ChatChannelTypeStandard)
	}
	if mythicjwt.AllowsScope(claims.Scopes, mythicjwt.SCOPE_CHAT_AI_READ) {
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

func getChatChannel(channelID int, operationID int) (databaseStructs.ChatChannel, error) {
	channel := databaseStructs.ChatChannel{}
	err := database.DB.Get(&channel, `SELECT *
		FROM chat_channel
		WHERE id=$1 AND operation_id=$2`, channelID, operationID)
	return channel, err
}
