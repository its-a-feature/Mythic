package databaseStructs

import (
	"database/sql"
	"time"

	"github.com/its-a-feature/Mythic/utils/structs"
)

const (
	ChatChannelTypeStandard = "standard"
	ChatChannelTypeAI       = "ai"

	ChatMessageAuthorOperator = "operator"
	ChatMessageAuthorSystem   = "system"
	ChatMessageAuthorAI       = "ai"

	ChatMessageStatusStreaming = "streaming"
	ChatMessageStatusComplete  = "complete"
	ChatMessageStatusError     = "error"
	ChatMessageStatusCancelled = "cancelled"
)

type ChatChannel struct {
	ID              int                `db:"id" json:"id"`
	OperationID     int                `db:"operation_id" json:"operation_id"`
	Operation       Operation          `db:"operation" json:"operation,omitempty"`
	Name            string             `db:"name" json:"name"`
	Slug            string             `db:"slug" json:"slug"`
	Description     string             `db:"description" json:"description"`
	ChannelType     string             `db:"channel_type" json:"channel_type"`
	CreatedBy       int                `db:"created_by" json:"created_by"`
	Creator         Operator           `db:"creator" json:"creator,omitempty"`
	Archived        bool               `db:"archived" json:"archived"`
	ArchivedBy      structs.NullInt64  `db:"archived_by" json:"archived_by"`
	ArchivedAt      sql.NullTime       `db:"archived_at" json:"archived_at"`
	Locked          bool               `db:"locked" json:"locked"`
	LockedBy        structs.NullInt64  `db:"locked_by" json:"locked_by"`
	LockedAt        sql.NullTime       `db:"locked_at" json:"locked_at"`
	LastMessageID   structs.NullInt64  `db:"last_message_id" json:"last_message_id"`
	ChatContainerID structs.NullInt64  `db:"chat_container_id" json:"chat_container_id"`
	ChatContainer   ConsumingContainer `db:"chat_container" json:"chat_container,omitempty"`
	ChatModel       string             `db:"chat_model" json:"chat_model"`
	AIMetadata      MythicJSONText     `db:"ai_metadata" json:"ai_metadata"`
	APITokensID     structs.NullInt64  `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	APIToken        Apitokens          `db:"apitoken" json:"apitoken,omitempty"`
	CreatedAt       time.Time          `db:"created_at" json:"created_at"`
	UpdatedAt       time.Time          `db:"updated_at" json:"updated_at"`
}

type ChatMessage struct {
	ID                int                `db:"id" json:"id"`
	OperationID       int                `db:"operation_id" json:"operation_id"`
	Operation         Operation          `db:"operation" json:"operation,omitempty"`
	ChannelID         int                `db:"channel_id" json:"channel_id"`
	Channel           ChatChannel        `db:"channel" json:"channel,omitempty"`
	OperatorID        structs.NullInt64  `db:"operator_id" json:"operator_id"`
	Operator          Operator           `db:"operator" json:"operator,omitempty"`
	APITokensID       structs.NullInt64  `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	APIToken          Apitokens          `db:"apitoken" json:"apitoken,omitempty"`
	AuthorType        string             `db:"author_type" json:"author_type"`
	ChatContainerID   structs.NullInt64  `db:"chat_container_id" json:"chat_container_id"`
	ChatContainer     ConsumingContainer `db:"chat_container" json:"chat_container,omitempty"`
	SenderDisplayName string             `db:"sender_display_name" json:"sender_display_name"`
	Message           string             `db:"message" json:"message"`
	Edited            bool               `db:"edited" json:"edited"`
	EditedAt          sql.NullTime       `db:"edited_at" json:"edited_at"`
	Deleted           bool               `db:"deleted" json:"deleted"`
	DeletedBy         structs.NullInt64  `db:"deleted_by" json:"deleted_by"`
	DeletedAt         sql.NullTime       `db:"deleted_at" json:"deleted_at"`
	Status            string             `db:"status" json:"status"`
	Metadata          MythicJSONText     `db:"metadata" json:"metadata"`
	CreatedAt         time.Time          `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time          `db:"updated_at" json:"updated_at"`
}

type ChatRequest struct {
	ID                int                `db:"id" json:"id"`
	OperationID       int                `db:"operation_id" json:"operation_id"`
	Operation         Operation          `db:"operation" json:"operation,omitempty"`
	ChannelID         int                `db:"channel_id" json:"channel_id"`
	Channel           ChatChannel        `db:"channel" json:"channel,omitempty"`
	RequestMessageID  int                `db:"request_message_id" json:"request_message_id"`
	RequestMessage    ChatMessage        `db:"request_message" json:"request_message,omitempty"`
	ResponseMessageID int                `db:"response_message_id" json:"response_message_id"`
	ResponseMessage   ChatMessage        `db:"response_message" json:"response_message,omitempty"`
	ChatContainerID   int                `db:"chat_container_id" json:"chat_container_id"`
	ChatContainer     ConsumingContainer `db:"chat_container" json:"chat_container,omitempty"`
	Model             string             `db:"model" json:"model"`
	Status            string             `db:"status" json:"status"`
	Error             string             `db:"error" json:"error"`
	ContextSnapshot   MythicJSONText     `db:"context_snapshot" json:"context_snapshot"`
	RetryOfID         structs.NullInt64  `db:"retry_of_id" json:"retry_of_id"`
	CreatedBy         int                `db:"created_by" json:"created_by"`
	Creator           Operator           `db:"creator" json:"creator,omitempty"`
	CreatedAt         time.Time          `db:"created_at" json:"created_at"`
	UpdatedAt         time.Time          `db:"updated_at" json:"updated_at"`
	CompletedAt       sql.NullTime       `db:"completed_at" json:"completed_at"`
	CancelledAt       sql.NullTime       `db:"cancelled_at" json:"cancelled_at"`
}

type ChatReadState struct {
	OperationID       int               `db:"operation_id" json:"operation_id"`
	Operation         Operation         `db:"operation" json:"operation,omitempty"`
	ChannelID         int               `db:"channel_id" json:"channel_id"`
	Channel           ChatChannel       `db:"channel" json:"channel,omitempty"`
	OperatorID        int               `db:"operator_id" json:"operator_id"`
	Operator          Operator          `db:"operator" json:"operator,omitempty"`
	LastReadMessageID structs.NullInt64 `db:"last_read_message_id" json:"last_read_message_id"`
	LastReadMessage   ChatMessage       `db:"last_read_message" json:"last_read_message,omitempty"`
	UpdatedAt         time.Time         `db:"updated_at" json:"updated_at"`
}
