package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

const chatStreamFlushInterval = 750 * time.Millisecond

const (
	ChatMessageSpecialTypeInputRequested          = "input_requested"
	ChatMessageSpecialTypeEventingUserInteraction = "eventing_user_interaction"
	ChatMessageSpecialTypeToolUse                 = "tool_use"
	ChatMessageSpecialTypeSubagent                = "subagent"
)

type ChatContainerResponseMessage struct {
	OperationID     int                           `json:"operation_id" mapstructure:"operation_id"`
	RequestID       int                           `json:"request_id" mapstructure:"request_id"`
	ResponseKey     string                        `json:"response_key" mapstructure:"response_key"`
	Content         string                        `json:"content" mapstructure:"content"`
	IsDelta         bool                          `json:"is_delta" mapstructure:"is_delta"`
	Complete        bool                          `json:"complete" mapstructure:"complete"`
	CompleteRequest bool                          `json:"complete_request" mapstructure:"complete_request"`
	Status          string                        `json:"status" mapstructure:"status"`
	Error           string                        `json:"error" mapstructure:"error"`
	Metadata        ChatContainerResponseMetadata `json:"metadata" mapstructure:"metadata"`
}

// ChatContainerResponseMetadata documents the JSON stored in chat_message.metadata
// when a chat container sends a ChatContainerResponseMessage.
//
// To render a special UI instead of a plain message bubble, a chat container
// must set SpecialType to a value that Mythic and the React UI know how to
// handle, then include the matching nested snapshot. Unknown special types are
// stored but render as normal text until backend/UI handling is added.
//
// Current special metadata shapes:
//   - input_requested: chat-container authored. Include InputRequested with
//     status "pending" to display a human-in-the-loop card. The backend later
//     updates that same nested object to accepted, rejected, responded, selected,
//     or cancelled.
//   - eventing_user_interaction: Mythic eventing authored. It is documented
//     here because it uses the same special message convention, but chat
//     containers should not normally send it.
//   - tool_use: chat-container authored status row for a provider tool call.
//     Send it with a stable response_key so start/finish metadata updates the
//     same secondary chat message without converting the primary AI answer into
//     a special card.
//   - subagent: chat-container authored summary row for a delegated sub-agent
//     turn. Use top-level delegation_id/delegation_name fields on the sub-agent
//     card and every related delegated message so the UI can filter a flat
//     transcript without nesting cards.
//
// Minimal metadata for a chat-container-authored input request card:
//
//	{
//	  "special_type": "input_requested",
//	  "input_requested": {
//	    "status": "pending",
//	    "input_type": "approval",
//	    "title": "Approve tool call",
//	    "prompt": "Approve searching the documentation?",
//	    "description": "The model requested operator input before continuing.",
//	    "data": {"tool_name": "docs_search", "arguments": {"query": "operator supplied task"}}
//	  }
//	}
//
// The response Content should still contain concise fallback text. The UI uses
// metadata to replace the normal bubble with the richer special card.
type ChatContainerResponseMetadata struct {
	// SpecialType selects a Mythic/React special renderer. For chat containers,
	// use "input_requested" when requesting operator input before continuing.
	// Omit this for ordinary metadata.
	SpecialType string `json:"special_type,omitempty" mapstructure:"special_type"`

	// Source identifies the subsystem or container that created the special
	// message, such as "eventing" or a chat container name.
	Source string `json:"source,omitempty" mapstructure:"source"`

	// SourceID is a stable idempotency/correlation key for source-created
	// special messages. Eventing uses values like "eventstepinstance:123".
	SourceID string `json:"source_id,omitempty" mapstructure:"source_id"`

	// SpecialMessageVersion lets Mythic evolve a special message schema without
	// guessing which shape is stored in older messages.
	SpecialMessageVersion int `json:"special_message_version,omitempty" mapstructure:"special_message_version"`

	// Refresh describes a UI action that can ask Mythic to refresh this special
	// message. Eventing uses {"action": "chatRefreshSpecialMessage"}.
	Refresh map[string]interface{} `json:"refresh,omitempty" mapstructure:"refresh"`

	// InputRequested is required when SpecialType is "input_requested". A chat
	// container should send it with status "pending"; Mythic will update the
	// same object when the operator accepts, rejects, responds, or selects.
	InputRequested *ChatInputRequestedMetadata `json:"input_requested,omitempty" mapstructure:"input_requested"`

	// EventingUserInteraction is generated by Mythic eventing. It documents the
	// shared special-message convention but is not expected from chat containers.
	EventingUserInteraction map[string]interface{} `json:"eventing_user_interaction,omitempty" mapstructure:"eventing_user_interaction"`

	// ContainerMetadata holds the original container metadata when Mythic wraps
	// it with an Error value for failed responses.
	ContainerMetadata map[string]interface{} `json:"container_metadata,omitempty" mapstructure:"container_metadata"`

	// Error is stored alongside ContainerMetadata when the chat container reports
	// a response error.
	Error string `json:"error,omitempty" mapstructure:"error"`

	// RefreshedAt/UpdatedBy*/UpdatedAt are maintained by Mythic when special
	// messages are refreshed or resolved by an operator.
	RefreshedAt         string `json:"refreshed_at,omitempty" mapstructure:"refreshed_at"`
	UpdatedByOperatorID int    `json:"updated_by_operator_id,omitempty" mapstructure:"updated_by_operator_id"`
	UpdatedBy           string `json:"updated_by,omitempty" mapstructure:"updated_by"`
	UpdatedAt           string `json:"updated_at,omitempty" mapstructure:"updated_at"`

	// Other preserves container-specific metadata, such as model/provider IDs or
	// feature diagnostics. These keys are stored in chat_message.metadata but
	// have no Mythic-defined behavior.
	Other map[string]interface{} `json:"-" mapstructure:"-"`
}

// ChatInputRequestedMetadata is the nested payload for
// metadata.special_type == "input_requested".
type ChatInputRequestedMetadata struct {
	// Status must be "pending" when sent by a chat container. Mythic later sets
	// it to "accepted", "rejected", "responded", "selected", or "cancelled".
	Status string `json:"status,omitempty" mapstructure:"status"`

	// InputType controls the UI affordance: "approval", "text", or
	// "single_choice".
	InputType string `json:"input_type,omitempty" mapstructure:"input_type"`

	// Title, Prompt, and Description are displayed to the operator.
	Title       string `json:"title,omitempty" mapstructure:"title"`
	Prompt      string `json:"prompt,omitempty" mapstructure:"prompt"`
	Description string `json:"description,omitempty" mapstructure:"description"`

	// Choices is used for single_choice requests.
	Choices []ChatInputChoiceMetadata `json:"choices,omitempty" mapstructure:"choices"`

	// Data is opaque developer-provided context returned unchanged with the
	// input_response continuation.
	Data map[string]interface{} `json:"data,omitempty" mapstructure:"data"`

	// Response is populated by Mythic when the operator acts on the card.
	Response map[string]interface{} `json:"response,omitempty" mapstructure:"response"`

	// Resolution fields are written by Mythic when the operator acts on the
	// card.
	ResolvedByOperatorID int    `json:"resolved_by_operator_id,omitempty" mapstructure:"resolved_by_operator_id"`
	ResolvedBy           string `json:"resolved_by,omitempty" mapstructure:"resolved_by"`
	ResolvedAt           string `json:"resolved_at,omitempty" mapstructure:"resolved_at"`

	// Other preserves future input request keys without dropping them.
	Other map[string]interface{} `json:"-" mapstructure:"-"`
}

type ChatInputChoiceMetadata struct {
	ID          string                 `json:"id,omitempty" mapstructure:"id"`
	Label       string                 `json:"label,omitempty" mapstructure:"label"`
	Description string                 `json:"description,omitempty" mapstructure:"description"`
	Data        map[string]interface{} `json:"data,omitempty" mapstructure:"data"`
	Other       map[string]interface{} `json:"-" mapstructure:"-"`
}

func (m *ChatInputChoiceMetadata) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*m = ChatInputChoiceMetadata{}
		return nil
	}
	values := map[string]interface{}{}
	if err := json.Unmarshal(data, &values); err != nil {
		return err
	}
	if values == nil {
		*m = ChatInputChoiceMetadata{}
		return nil
	}
	m.ID = chatMetadataTakeString(values, "id")
	m.Label = chatMetadataTakeString(values, "label")
	m.Description = chatMetadataTakeString(values, "description")
	m.Data = chatMetadataTakeObject(values, "data")
	m.Other = values
	return nil
}

func (m *ChatInputChoiceMetadata) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.StructValue())
}

func (m *ChatInputChoiceMetadata) StructValue() map[string]interface{} {
	values := chatMetadataCopyMap(m.Other)
	values["id"] = m.ID
	values["label"] = m.Label
	values["description"] = m.Description
	values["data"] = m.Data
	return values
}

func (m *ChatContainerResponseMetadata) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*m = ChatContainerResponseMetadata{}
		return nil
	}
	values := map[string]interface{}{}
	if err := json.Unmarshal(data, &values); err != nil {
		return err
	}
	if values == nil {
		*m = ChatContainerResponseMetadata{}
		return nil
	}
	m.SpecialType = chatMetadataTakeString(values, "special_type")
	m.Source = chatMetadataTakeString(values, "source")
	m.SourceID = chatMetadataTakeString(values, "source_id")
	m.SpecialMessageVersion = chatMetadataTakeInt(values, "special_message_version")
	m.Refresh = chatMetadataTakeObject(values, "refresh")
	m.InputRequested = chatMetadataTakeInputRequested(values, ChatMessageSpecialTypeInputRequested)
	m.EventingUserInteraction = chatMetadataTakeObject(values, ChatMessageSpecialTypeEventingUserInteraction)
	m.ContainerMetadata = chatMetadataTakeObject(values, "container_metadata")
	m.Error = chatMetadataTakeString(values, "error")
	m.RefreshedAt = chatMetadataTakeString(values, "refreshed_at")
	m.UpdatedByOperatorID = chatMetadataTakeInt(values, "updated_by_operator_id")
	m.UpdatedBy = chatMetadataTakeString(values, "updated_by")
	m.UpdatedAt = chatMetadataTakeString(values, "updated_at")
	m.Other = values
	return nil
}

func (m *ChatContainerResponseMetadata) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.StructValue())
}

func (m *ChatContainerResponseMetadata) StructValue() map[string]interface{} {
	values := chatMetadataCopyMap(m.Other)
	values["special_type"] = m.SpecialType
	values["source"] = m.Source
	values["source_id"] = m.SourceID
	values["special_message_version"] = m.SpecialMessageVersion
	values["refresh"] = m.Refresh
	if m.InputRequested != nil {
		values[ChatMessageSpecialTypeInputRequested] = m.InputRequested.StructValue()
	}
	values[ChatMessageSpecialTypeEventingUserInteraction] = m.EventingUserInteraction
	values["container_metadata"] = m.ContainerMetadata
	values["error"] = m.Error
	values["refreshed_at"] = m.RefreshedAt
	values["updated_by_operator_id"] = m.UpdatedByOperatorID
	values["updated_by"] = m.UpdatedBy
	values["updated_at"] = m.UpdatedAt
	return values
}

func (m *ChatContainerResponseMetadata) IsEmpty() bool {
	return len(m.StructValue()) == 0
}

func (m *ChatContainerResponseMetadata) ExtractToolOutput() string {
	if m == nil || m.SpecialType != ChatMessageSpecialTypeToolUse {
		return ""
	}
	toolUse, ok := m.Other[ChatMessageSpecialTypeToolUse].(map[string]interface{})
	if !ok || toolUse == nil {
		return ""
	}
	rawOutput, ok := toolUse["output"]
	if !ok {
		return ""
	}
	delete(toolUse, "output")

	var output string
	switch typedOutput := rawOutput.(type) {
	case string:
		output = typedOutput
	default:
		if outputBytes, err := json.Marshal(typedOutput); err == nil {
			output = string(outputBytes)
		} else {
			output = fmt.Sprint(typedOutput)
		}
	}
	if output == "" {
		toolUse["output_available"] = false
		toolUse["output_size"] = 0
		m.Other[ChatMessageSpecialTypeToolUse] = toolUse
		return ""
	}
	toolUse["output_available"] = true
	toolUse["output_size"] = len(output)
	m.Other[ChatMessageSpecialTypeToolUse] = toolUse
	return output
}

func (m *ChatInputRequestedMetadata) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*m = ChatInputRequestedMetadata{}
		return nil
	}
	values := map[string]interface{}{}
	if err := json.Unmarshal(data, &values); err != nil {
		return err
	}
	if values == nil {
		*m = ChatInputRequestedMetadata{}
		return nil
	}
	m.Status = chatMetadataTakeString(values, "status")
	m.InputType = chatMetadataTakeString(values, "input_type")
	m.Title = chatMetadataTakeString(values, "title")
	m.Prompt = chatMetadataTakeString(values, "prompt")
	m.Description = chatMetadataTakeString(values, "description")
	m.Choices = chatMetadataTakeInputChoices(values, "choices")
	m.Data = chatMetadataTakeObject(values, "data")
	m.Response = chatMetadataTakeObject(values, "response")
	m.ResolvedByOperatorID = chatMetadataTakeInt(values, "resolved_by_operator_id")
	m.ResolvedBy = chatMetadataTakeString(values, "resolved_by")
	m.ResolvedAt = chatMetadataTakeString(values, "resolved_at")
	m.Other = values
	return nil
}

func (m *ChatInputRequestedMetadata) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.StructValue())
}

func (m *ChatInputRequestedMetadata) StructValue() map[string]interface{} {
	values := chatMetadataCopyMap(m.Other)
	values["status"] = m.Status
	values["input_type"] = m.InputType
	values["title"] = m.Title
	values["prompt"] = m.Prompt
	values["description"] = m.Description
	choices := make([]map[string]interface{}, 0, len(m.Choices))
	for _, choice := range m.Choices {
		choices = append(choices, choice.StructValue())
	}
	values["choices"] = choices
	values["data"] = m.Data
	values["response"] = m.Response
	values["resolved_by_operator_id"] = m.ResolvedByOperatorID
	values["resolved_by"] = m.ResolvedBy
	values["resolved_at"] = m.ResolvedAt
	return values
}

func chatMetadataCopyMap(input map[string]interface{}) map[string]interface{} {
	output := make(map[string]interface{}, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

func chatMetadataTakeString(values map[string]interface{}, key string) string {
	value, ok := values[key]
	if ok {
		delete(values, key)
	}
	if typed, ok := value.(string); ok {
		return typed
	}
	return ""
}

func chatMetadataTakeInt(values map[string]interface{}, key string) int {
	value, ok := values[key]
	if ok {
		delete(values, key)
	}
	switch typed := value.(type) {
	case int:
		return typed
	case float64:
		return int(typed)
	case json.Number:
		intValue, _ := typed.Int64()
		return int(intValue)
	default:
		return 0
	}
}

func chatMetadataTakeBool(values map[string]interface{}, key string) *bool {
	value, ok := values[key]
	if ok {
		delete(values, key)
	}
	if typed, ok := value.(bool); ok {
		return &typed
	}
	return nil
}

func chatMetadataBoolValue(value *bool) interface{} {
	if value == nil {
		return nil
	}
	return *value
}

func chatMetadataTakeObject(values map[string]interface{}, key string) map[string]interface{} {
	value, ok := values[key]
	if ok {
		delete(values, key)
	}
	if typed, ok := value.(map[string]interface{}); ok {
		return typed
	}
	return nil
}

func chatMetadataTakeInputRequested(values map[string]interface{}, key string) *ChatInputRequestedMetadata {
	value, ok := values[key]
	if ok {
		delete(values, key)
	}
	if !ok || value == nil {
		return nil
	}
	serializedValue, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	request := ChatInputRequestedMetadata{}
	if err = json.Unmarshal(serializedValue, &request); err != nil {
		return nil
	}
	return &request
}

func chatMetadataTakeInputChoices(values map[string]interface{}, key string) []ChatInputChoiceMetadata {
	value, ok := values[key]
	if ok {
		delete(values, key)
	}
	if !ok || value == nil {
		return nil
	}
	serializedValue, err := json.Marshal(value)
	if err != nil {
		return nil
	}
	choices := []ChatInputChoiceMetadata{}
	if err = json.Unmarshal(serializedValue, &choices); err != nil {
		return nil
	}
	return choices
}

type chatResponseRequest struct {
	ID                int    `db:"id"`
	OperationID       int    `db:"operation_id"`
	ChannelID         int    `db:"channel_id"`
	ChatContainerID   int    `db:"chat_container_id"`
	ChatContainerName string `db:"chat_container_name"`
	Status            string `db:"status"`
	ChannelArchived   bool   `db:"channel_archived"`
}

type chatStreamBuffer struct {
	OperationID int
	Pending     string
	Timer       *time.Timer
}

var (
	chatStreamBuffers     = map[int]*chatStreamBuffer{}
	chatStreamBuffersLock sync.Mutex
	chatResponseLocks     sync.Map
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      CHAT_RESPONSE_ROUTING_KEY,
		RoutingKey: CHAT_RESPONSE_ROUTING_KEY,
		Handler:    processChatContainerResponse,
		Scopes:     []string{mythicjwt.SCOPE_CHAT_AI_WRITE},
		Sequential: true,
	})
}

func processChatContainerResponse(msg amqp.Delivery) {
	incomingMessage := ChatContainerResponseMessage{}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to process chat container response message")
		return
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		logging.LogError(err, "Failed to get chat response auth headers")
		return
	}
	if err = applyChatContainerResponse(incomingMessage, authContext); err != nil {
		logging.LogError(err, "Failed to apply chat container response",
			"request_id", incomingMessage.RequestID, "response_key", incomingMessage.ResponseKey)
	}
}

func applyChatContainerResponse(incomingMessage ChatContainerResponseMessage, authContext RabbitMQAuthContext) error {
	request, err := getChatResponseRequest(incomingMessage, authContext.OperationID)
	if err != nil {
		return err
	}
	if incomingMessage.OperationID > 0 && incomingMessage.OperationID != request.OperationID {
		return fmt.Errorf("chat response operation %d does not match request operation %d",
			incomingMessage.OperationID, request.OperationID)
	}
	if authContext.OperationID > 0 && authContext.OperationID != request.OperationID {
		return fmt.Errorf("chat response auth operation %d does not match request operation %d",
			authContext.OperationID, request.OperationID)
	}
	if request.ChannelArchived {
		return nil
	}

	targetMessageID, err := getChatResponseTargetMessageID(request, incomingMessage)
	if err != nil {
		if request.ID > 0 {
			_ = failChatResponseRequest(request, "system:invalid-response", err.Error())
		}
		return err
	}
	chatResponseLock := getChatResponseLock(targetMessageID)
	chatResponseLock.Lock()
	defer chatResponseLock.Unlock()

	status := normalizeChatContainerResponseStatus(incomingMessage)
	if message := chatResponseVisibleContent(incomingMessage); message != "" {
		if incomingMessage.IsDelta {
			if err = queueChatResponseDelta(targetMessageID, request.OperationID, message); err != nil {
				return err
			}
		} else {
			if err = flushChatResponseMessageLocked(targetMessageID, request.OperationID, false); err != nil {
				return err
			}
			if err = setChatResponseMessageContent(targetMessageID, request.OperationID, message); err != nil {
				return err
			}
		}
		if status == "" {
			status = databaseStructs.ChatMessageStatusStreaming
		}
	}

	if status == databaseStructs.ChatMessageStatusComplete ||
		status == databaseStructs.ChatMessageStatusError ||
		status == databaseStructs.ChatMessageStatusCancelled {
		if err = flushChatResponseMessageLocked(targetMessageID, request.OperationID, true); err != nil {
			return err
		}
	}
	if status == "" && !incomingMessage.Metadata.IsEmpty() {
		status = request.Status
	}
	if status != "" {
		if err = setChatResponseMessageStatus(targetMessageID, request.OperationID, status, incomingMessage.Error, incomingMessage.Metadata); err != nil {
			return err
		}
		if err = persistSubagentFinalOutput(request, targetMessageID, incomingMessage.ResponseKey, status, incomingMessage.Metadata); err != nil {
			return err
		}
		if status == databaseStructs.ChatMessageStatusStreaming ||
			(incomingMessage.CompleteRequest && isTerminalChatResponseStatus(status)) {
			if err = setChatRequestStatus(request, status, incomingMessage.Error); err != nil {
				return err
			}
		}
		if isTerminalChatResponseStatus(status) {
			chatResponseLocks.Delete(targetMessageID)
		}
	}
	return nil
}

func chatResponseVisibleContent(incomingMessage ChatContainerResponseMessage) string {
	if incomingMessage.Content != "" {
		return incomingMessage.Content
	}
	return incomingMessage.Error
}

func getChatResponseRequest(incomingMessage ChatContainerResponseMessage, operationID int) (chatResponseRequest, error) {
	request := chatResponseRequest{}
	if incomingMessage.RequestID <= 0 {
		return request, errors.New("chat response requires request_id")
	}
	sqlStatement := `SELECT chat_request.id,
			chat_request.operation_id,
			chat_request.channel_id,
			chat_request.chat_container_id,
			chat_request.status,
			chat_channel.archived "channel_archived",
			COALESCE(consuming_container.name, '') "chat_container_name"
		FROM chat_request
		JOIN chat_channel ON chat_channel.id = chat_request.channel_id
			AND chat_channel.operation_id = chat_request.operation_id
		LEFT JOIN consuming_container ON consuming_container.id = chat_request.chat_container_id
		WHERE chat_request.id=$1`
	args := []interface{}{incomingMessage.RequestID}
	if operationID > 0 {
		sqlStatement += " AND chat_request.operation_id=$2"
		args = append(args, operationID)
	}
	if err := database.DB.Get(&request, sqlStatement, args...); err != nil {
		return request, err
	}
	return request, nil
}

func getChatResponseTargetMessageID(request chatResponseRequest, incomingMessage ChatContainerResponseMessage) (int, error) {
	responseKey := strings.TrimSpace(incomingMessage.ResponseKey)
	if responseKey == "" {
		return 0, errors.New("chat response requires non-empty response_key")
	}
	messageID, err := getOrCreateChatResponseKeyMessage(request, responseKey)
	return messageID, err
}

func getOrCreateChatResponseKeyMessage(request chatResponseRequest, responseKey string) (int, error) {
	var messageID int
	// response_key identifies one visible output block for this request. The
	// first delta/status creates the block; subsequent messages with the same
	// key update it so streamed text and tool cards stay grouped.
	metadata := GetMythicJSONTextFromStruct(map[string]interface{}{
		"chat_request_id":   request.ID,
		"chat_response_key": responseKey,
	})
	err := database.DB.Get(&messageID, `INSERT INTO chat_message
		(operation_id, channel_id, author_type, chat_request_id, chat_response_key,
		 chat_container_id, sender_display_name, status, metadata)
		VALUES ($1, $2, 'ai', $3, $4, $5, $6, 'pending', $7::jsonb)
		ON CONFLICT (chat_request_id, chat_response_key) WHERE chat_request_id IS NOT NULL
		DO UPDATE SET metadata = chat_message.metadata || EXCLUDED.metadata
		RETURNING id`,
		request.OperationID,
		request.ChannelID,
		request.ID,
		responseKey,
		request.ChatContainerID,
		request.ChatContainerName,
		metadata.String(),
	)
	return messageID, err
}

func normalizeChatContainerResponseStatus(incomingMessage ChatContainerResponseMessage) string {
	status := strings.ToLower(strings.TrimSpace(incomingMessage.Status))
	switch status {
	case databaseStructs.ChatMessageStatusStreaming,
		databaseStructs.ChatMessageStatusComplete,
		databaseStructs.ChatMessageStatusError,
		databaseStructs.ChatMessageStatusCancelled:
		return status
	}
	if incomingMessage.Error != "" {
		return databaseStructs.ChatMessageStatusError
	}
	if incomingMessage.Complete {
		return databaseStructs.ChatMessageStatusComplete
	}
	return ""
}

func isTerminalChatResponseStatus(status string) bool {
	return status == databaseStructs.ChatMessageStatusComplete ||
		status == databaseStructs.ChatMessageStatusError ||
		status == databaseStructs.ChatMessageStatusCancelled
}

func getChatResponseLock(responseMessageID int) *sync.Mutex {
	lock, _ := chatResponseLocks.LoadOrStore(responseMessageID, &sync.Mutex{})
	return lock.(*sync.Mutex)
}

func queueChatResponseDelta(responseMessageID int, operationID int, delta string) error {
	chatStreamBuffersLock.Lock()
	defer chatStreamBuffersLock.Unlock()
	buffer, ok := chatStreamBuffers[responseMessageID]
	if !ok {
		buffer = &chatStreamBuffer{OperationID: operationID}
		chatStreamBuffers[responseMessageID] = buffer
	}
	if buffer.OperationID > 0 && operationID > 0 && buffer.OperationID != operationID {
		return fmt.Errorf("chat response buffer operation %d does not match incoming operation %d for response message %d",
			buffer.OperationID, operationID, responseMessageID)
	}
	if buffer.OperationID == 0 {
		buffer.OperationID = operationID
	}
	buffer.Pending += delta
	if buffer.Timer == nil {
		buffer.Timer = time.AfterFunc(chatStreamFlushInterval, func() {
			if err := flushChatResponseMessage(responseMessageID, operationID, false); err != nil {
				logging.LogError(err, "Failed to flush chat response buffer", "chat_message_id", responseMessageID)
			}
		})
	}
	return nil
}

func flushChatResponseMessage(responseMessageID int, operationID int, final bool) error {
	chatResponseLock := getChatResponseLock(responseMessageID)
	chatResponseLock.Lock()
	defer chatResponseLock.Unlock()
	return flushChatResponseMessageLocked(responseMessageID, operationID, final)
}

func flushChatResponseMessageLocked(responseMessageID int, operationID int, final bool) error {
	chatStreamBuffersLock.Lock()
	buffer, ok := chatStreamBuffers[responseMessageID]
	if !ok {
		chatStreamBuffersLock.Unlock()
		return nil
	}
	if buffer.OperationID > 0 && operationID > 0 && buffer.OperationID != operationID {
		chatStreamBuffersLock.Unlock()
		return fmt.Errorf("chat response buffer operation %d does not match flush operation %d for response message %d",
			buffer.OperationID, operationID, responseMessageID)
	}
	pending := buffer.Pending
	buffer.Pending = ""
	if buffer.Timer != nil {
		buffer.Timer.Stop()
		buffer.Timer = nil
	}
	if final {
		delete(chatStreamBuffers, responseMessageID)
	}
	chatStreamBuffersLock.Unlock()

	if pending == "" {
		return nil
	}
	_, err := database.DB.Exec(`UPDATE chat_message
		SET message = message || $2,
			status = CASE WHEN status IN ('pending', 'streaming') THEN 'streaming' ELSE status END
		WHERE id=$1 AND operation_id=$3 AND deleted=false`, responseMessageID, pending, operationID)
	return err
}

func setChatResponseMessageContent(responseMessageID int, operationID int, content string) error {
	_, err := database.DB.Exec(`UPDATE chat_message
		SET message=$3,
			status = CASE WHEN status IN ('pending', 'streaming') THEN 'streaming' ELSE status END
		WHERE id=$1 AND operation_id=$2 AND deleted=false`, responseMessageID, operationID, content)
	return err
}

func setChatResponseMessageStatus(responseMessageID int, operationID int, status string, responseError string, metadata ChatContainerResponseMetadata) error {
	toolOutput := metadata.ExtractToolOutput()
	metadataJSON := GetMythicJSONTextFromStruct(metadata.StructValue())
	if responseError != "" {
		metadataJSON = GetMythicJSONTextFromStruct(map[string]interface{}{
			"container_metadata": metadata.StructValue(),
			"error":              responseError,
		})
	}
	_, err := database.DB.Exec(`UPDATE chat_message
		SET status=$3,
			metadata = metadata || $4::jsonb,
			tool_output = CASE WHEN $5 THEN $6 ELSE tool_output END
		WHERE id=$1 AND operation_id=$2 AND deleted=false`,
		responseMessageID, operationID, status, metadataJSON.String(), toolOutput != "", toolOutput)
	return err
}

func persistSubagentFinalOutput(request chatResponseRequest, summaryMessageID int, sourceResponseKey string, status string, metadata ChatContainerResponseMetadata) error {
	if metadata.SpecialType != ChatMessageSpecialTypeSubagent || !isTerminalChatResponseStatus(status) {
		return nil
	}
	delegationID, delegationName := getChatSubagentDelegationFields(metadata)
	if delegationID == "" {
		return nil
	}
	var finalOutput string
	if err := database.DB.Get(&finalOutput, `SELECT message
		FROM chat_message
		WHERE id=$1 AND operation_id=$2 AND deleted=false`, summaryMessageID, request.OperationID); err != nil {
		return err
	}
	if strings.TrimSpace(finalOutput) == "" {
		return nil
	}
	finalStatus := databaseStructs.ChatMessageStatusComplete
	if status == databaseStructs.ChatMessageStatusError || status == databaseStructs.ChatMessageStatusCancelled {
		finalStatus = status
	}
	senderDisplayName := strings.TrimSpace(delegationName)
	if senderDisplayName == "" {
		senderDisplayName = request.ChatContainerName
	}
	finalMetadata := map[string]interface{}{
		"delegation_id":              delegationID,
		"source_subagent_message_id": summaryMessageID,
		"source_chat_response_key":   sourceResponseKey,
		"subagent_final_output":      true,
	}
	if delegationName != "" {
		finalMetadata["delegation_name"] = delegationName
	}
	metadataJSON := GetMythicJSONTextFromStruct(finalMetadata)
	var messageID int
	return database.DB.Get(&messageID, `INSERT INTO chat_message
		(operation_id, channel_id, author_type, chat_request_id, chat_response_key,
		 chat_container_id, sender_display_name, message, status, metadata)
		VALUES ($1, $2, 'ai', $3, $4, $5, $6, $7, $8, $9::jsonb)
		ON CONFLICT (chat_request_id, chat_response_key) WHERE chat_request_id IS NOT NULL
		DO UPDATE SET sender_display_name=EXCLUDED.sender_display_name,
			message=EXCLUDED.message,
			status=EXCLUDED.status,
			metadata=chat_message.metadata || EXCLUDED.metadata,
			updated_at=now()
		RETURNING id`,
		request.OperationID,
		request.ChannelID,
		request.ID,
		getSubagentFinalOutputResponseKey(delegationID),
		request.ChatContainerID,
		senderDisplayName,
		finalOutput,
		finalStatus,
		metadataJSON.String(),
	)
}

func getChatSubagentDelegationFields(metadata ChatContainerResponseMetadata) (string, string) {
	return strings.TrimSpace(chatMetadataStringFromMap(metadata.Other, "delegation_id")),
		strings.TrimSpace(chatMetadataStringFromMap(metadata.Other, "delegation_name"))
}

func chatMetadataStringFromMap(values map[string]interface{}, key string) string {
	if values == nil {
		return ""
	}
	if typed, ok := values[key].(string); ok {
		return typed
	}
	return ""
}

func getSubagentFinalOutputResponseKey(delegationID string) string {
	return "subagent_final:" + strings.TrimSpace(delegationID)
}

func setChatRequestStatus(request chatResponseRequest, status string, responseError string) error {
	_, err := database.DB.Exec(`UPDATE chat_request
		SET status=$2,
			error=$3,
			completed_at=CASE WHEN $2='complete' THEN now() ELSE completed_at END,
			cancelled_at=CASE WHEN $2='cancelled' THEN now() ELSE cancelled_at END
		WHERE id=$1 AND operation_id=$4 AND status IN ('pending', 'streaming')`, request.ID, status, responseError, request.OperationID)
	return err
}

func failChatResponseRequest(request chatResponseRequest, responseKey string, errorMessage string) error {
	metadata := ChatContainerResponseMetadata{}
	messageID, err := getOrCreateChatResponseKeyMessage(request, responseKey)
	if err != nil {
		return err
	}
	_, err = database.DB.Exec(`UPDATE chat_message
		SET status='error',
			message=$3,
			metadata=metadata || $4::jsonb
		WHERE id=$1
			AND operation_id=$2
			AND deleted=false`,
		messageID,
		request.OperationID,
		errorMessage,
		GetMythicJSONTextFromStruct(map[string]interface{}{
			"container_metadata": metadata.StructValue(),
			"error":              errorMessage,
		}).String(),
	)
	if err != nil {
		return err
	}
	return setChatRequestStatus(request, databaseStructs.ChatMessageStatusError, errorMessage)
}
