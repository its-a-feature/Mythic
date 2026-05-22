package webcontroller

import (
	"database/sql"
	"encoding/json"
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
	"github.com/lib/pq"
)

const (
	chatContextMessageLimit = 40
	chatGeneralChannelName  = "general"
)

var chatSlugInvalidCharacters = regexp.MustCompile(`[^a-z0-9]+`)

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
}

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
	if !chatRequireScope(c, chatScopeForChannelType(channelType, true)) {
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
	if channelType == databaseStructs.ChatChannelTypeAI {
		if input.Input.ChatContainerID == nil || *input.Input.ChatContainerID <= 0 {
			chatRespondError(c, "AI chat channels require a chat_container_id")
			return
		}
		if _, err = getChatContainer(*input.Input.ChatContainerID); err != nil {
			logging.LogError(err, "Failed to find chat container")
			chatRespondError(c, "failed to find a chat container with that id")
			return
		}
		chatContainerID = *input.Input.ChatContainerID
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
		 chat_container_id, chat_model, ai_metadata)
		VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12::jsonb)
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
	)
	if err != nil {
		logging.LogError(err, "Failed to create chat channel")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: channelID, ChannelID: channelID})
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
	if !chatRequireScope(c, chatScopeForChannel(channel, true)) {
		return
	}
	if !chatCanManageChannel(operatorOperation, channel) {
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
	_, err = database.DB.Exec(`UPDATE chat_channel
		SET name=$3, slug=$4, description=$5, archived=$6, archived_by=$7, archived_at=$8,
			locked=$9, locked_by=$10, locked_at=$11, chat_model=$12, ai_metadata=$13::jsonb
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
	)
	if err != nil {
		logging.LogError(err, "Failed to update chat channel")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ID: channel.ID, ChannelID: channel.ID})
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
		if !chatCanCreateSystemMessage(operatorOperation) {
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
	_, _ = database.DB.Exec(`UPDATE chat_request
		SET status='cancelled', cancelled_at=now(), error='Chat message was deleted'
		WHERE operation_id=$1 AND (request_message_id=$2 OR response_message_id=$2) AND status IN ('pending', 'streaming')`,
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
	_, err = database.DB.Exec(`INSERT INTO chat_read_state
		(operation_id, channel_id, operator_id, last_read_message_id)
		VALUES ($1, $2, $3, $4)
		ON CONFLICT (operator_id, channel_id) DO UPDATE
		SET last_read_message_id=excluded.last_read_message_id`,
		operatorOperation.CurrentOperation.ID, channel.ID, operatorOperation.CurrentOperator.ID, lastReadID)
	if err != nil {
		logging.LogError(err, "Failed to mark chat channel read")
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", ChannelID: channel.ID})
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
	_, err = database.DB.Exec(`UPDATE chat_request
		SET status='cancelled', cancelled_at=now(), error='Cancelled by operator'
		WHERE id=$1 AND operation_id=$2 AND status IN ('pending', 'streaming')`,
		request.ID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "Failed to cancel chat request")
		chatRespondError(c, err.Error())
		return
	}
	_, _ = database.DB.Exec(`UPDATE chat_message
		SET status='cancelled'
		WHERE id=$1 AND operation_id=$2 AND status IN ('pending', 'streaming')`,
		request.ResponseMessageID, operatorOperation.CurrentOperation.ID)
	c.JSON(http.StatusOK, ChatActionResponse{Status: "success", RequestID: request.ID, ResponseMessageID: request.ResponseMessageID, ChannelID: channel.ID})
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

func createAIChatMessage(c *gin.Context, operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel, message string, retryOfID *int) {
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
	authContext := authentication.RabbitMQAuthContextFromGin(c)
	requestMessageID, err := insertOperatorChatMessage(operatorOperation, channel, message, authContext)
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
	if retryOfID != nil {
		retryOf = *retryOfID
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
	contextMessages, err := getChatContextMessages(operatorOperation.CurrentOperation.ID, channel.ID, requestMessageID)
	if err != nil {
		logging.LogError(err, "Failed to fetch AI chat context")
		markChatRequestFailed(requestID, responseMessageID, operatorOperation.CurrentOperation.ID, err.Error())
		chatRespondError(c, err.Error())
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
		"context_message_limit": chatContextMessageLimit,
		"config":                chatConfig,
	})
	_, _ = database.DB.Exec(`UPDATE chat_request
		SET context_snapshot=$3::jsonb
		WHERE id=$1 AND operation_id=$2`, requestID, operatorOperation.CurrentOperation.ID, contextSnapshot.String())

	err = rabbitmq.RabbitMQConnection.SendChatContainerRequest(container.Name, rabbitmq.ChatContainerRequestMessage{
		OperationID:       operatorOperation.CurrentOperation.ID,
		ChannelID:         channel.ID,
		ChannelName:       channel.Name,
		ChannelSlug:       channel.Slug,
		RequestID:         requestID,
		RequestMessageID:  requestMessageID,
		ResponseMessageID: responseMessageID,
		Model:             channel.ChatModel,
		Prompt:            message,
		Config:            chatConfig,
		Context:           contextMessages,
		Secrets:           rabbitmq.GetSecrets(operatorOperation.CurrentOperator.ID, 0),
	}, authContext)
	if err != nil {
		markChatRequestFailed(requestID, responseMessageID, operatorOperation.CurrentOperation.ID, err.Error())
		chatRespondError(c, err.Error())
		return
	}
	c.JSON(http.StatusOK, ChatActionResponse{
		Status:            "success",
		ID:                requestMessageID,
		MessageID:         requestMessageID,
		ChannelID:         channel.ID,
		RequestID:         requestID,
		ResponseMessageID: responseMessageID,
	})
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

func chatScopeForChannelType(channelType string, write bool) string {
	if channelType == databaseStructs.ChatChannelTypeAI {
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

func chatScopeForChannel(channel databaseStructs.ChatChannel, write bool) string {
	return chatScopeForChannelType(channel.ChannelType, write)
}

func chatIsModerator(operatorOperation *databaseStructs.Operatoroperation) bool {
	return operatorOperation.CurrentOperator.Admin ||
		operatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD
}

func chatCanCreateSystemMessage(operatorOperation *databaseStructs.Operatoroperation) bool {
	return chatIsModerator(operatorOperation)
}

func chatIsGeneralChannel(channel databaseStructs.ChatChannel) bool {
	return channel.ChannelType == databaseStructs.ChatChannelTypeStandard &&
		strings.EqualFold(channel.Slug, chatGeneralChannelName)
}

func chatCanManageChannel(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel) bool {
	return chatIsModerator(operatorOperation) || channel.CreatedBy == operatorOperation.CurrentOperator.ID
}

func chatCanPostToAIChannel(operatorOperation *databaseStructs.Operatoroperation, channel databaseStructs.ChatChannel) bool {
	if channel.ChannelType != databaseStructs.ChatChannelTypeAI {
		return true
	}
	if !channel.Locked {
		return true
	}
	return chatIsModerator(operatorOperation) ||
		(channel.LockedBy.Valid && int(channel.LockedBy.Int64) == operatorOperation.CurrentOperator.ID)
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
		if err == sql.ErrNoRows {
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

func getChatChannelConfig(channel databaseStructs.ChatChannel) map[string]interface{} {
	metadata := channel.AIMetadata.StructValue()
	for _, key := range []string{"config", "configuration"} {
		if config, ok := metadata[key].(map[string]interface{}); ok {
			return config
		}
	}
	return map[string]interface{}{}
}

func getChatContainer(containerID int) (databaseStructs.ConsumingContainer, error) {
	container := databaseStructs.ConsumingContainer{}
	err := database.DB.Get(&container, `SELECT *
		FROM consuming_container
		WHERE id=$1 AND type=$2 AND deleted=false`, containerID, string(rabbitmq.CONSUMING_SERVICES_TYPE_CHAT))
	return container, err
}

func getChatChannel(channelID int, operationID int) (databaseStructs.ChatChannel, error) {
	channel := databaseStructs.ChatChannel{}
	err := database.DB.Get(&channel, `SELECT *
		FROM chat_channel
		WHERE id=$1 AND operation_id=$2`, channelID, operationID)
	return channel, err
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
	var apiTokenID interface{}
	if authContext.APITokensID > 0 {
		apiTokenID = authContext.APITokensID
	}
	var messageID int
	err := database.DB.Get(&messageID, `INSERT INTO chat_message
		(operation_id, channel_id, operator_id, apitokens_id, author_type, sender_display_name, message, status)
		VALUES ($1, $2, $3, $4, 'operator', $5, $6, 'complete')
		RETURNING id`,
		operatorOperation.CurrentOperation.ID,
		channel.ID,
		operatorOperation.CurrentOperator.ID,
		apiTokenID,
		operatorOperation.CurrentOperator.Username,
		message,
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
