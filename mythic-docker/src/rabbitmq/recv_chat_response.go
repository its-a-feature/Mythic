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
	ChatMessageSpecialTypeMCPToolConfirmation     = "mcp_tool_confirmation"
	ChatMessageSpecialTypeEventingUserInteraction = "eventing_user_interaction"
)

type ChatContainerResponseMessage struct {
	OperationID       int                           `json:"operation_id" mapstructure:"operation_id"`
	RequestID         int                           `json:"request_id" mapstructure:"request_id"`
	ResponseMessageID int                           `json:"response_message_id" mapstructure:"response_message_id"`
	Content           string                        `json:"content" mapstructure:"content"`
	IsDelta           bool                          `json:"is_delta" mapstructure:"is_delta"`
	Complete          bool                          `json:"complete" mapstructure:"complete"`
	Status            string                        `json:"status" mapstructure:"status"`
	Error             string                        `json:"error" mapstructure:"error"`
	Metadata          ChatContainerResponseMetadata `json:"metadata" mapstructure:"metadata"`
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
//   - mcp_tool_confirmation: chat-container authored. Include
//     MCPToolConfirmation with status "pending" to display the confirmation
//     card. The backend later updates that same nested object to confirmed,
//     rejected, or responded.
//   - eventing_user_interaction: Mythic eventing authored. It is documented
//     here because it uses the same special message convention, but chat
//     containers should not normally send it.
//
// Minimal metadata for a chat-container-authored MCP confirmation card:
//
//	{
//	  "special_type": "mcp_tool_confirmation",
//	  "mcp_tool_confirmation": {
//	    "status": "pending",
//	    "server_name": "docs",
//	    "tool_name": "docs_search",
//	    "arguments": {"query": "operator supplied task"},
//	    "description": "Search the documentation MCP server.",
//	    "parameters": {"type": "object", "properties": {"query": {"type": "string"}}},
//	    "read_only": false
//	  }
//	}
//
// The response Content should still contain concise fallback text. The UI uses
// metadata to replace the normal bubble with the richer special card.
type ChatContainerResponseMetadata struct {
	// SpecialType selects a Mythic/React special renderer. For chat containers,
	// use "mcp_tool_confirmation" when requesting operator approval for an MCP
	// tool call. Omit this for ordinary metadata.
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

	// MCPConfirmationRequired is a convenience flag used by chat containers to
	// label that the response was intentionally converted into an MCP approval
	// card. The UI/backend key off SpecialType and MCPToolConfirmation.
	MCPConfirmationRequired *bool `json:"mcp_confirmation_required,omitempty" mapstructure:"mcp_confirmation_required"`

	// MCPToolConfirmation is required when SpecialType is
	// "mcp_tool_confirmation". A chat container should send it with status
	// "pending"; Mythic will update the same object when the operator confirms,
	// rejects, or responds.
	MCPToolConfirmation *ChatMCPToolConfirmationMetadata `json:"mcp_tool_confirmation,omitempty" mapstructure:"mcp_tool_confirmation"`

	// EventingUserInteraction is generated by Mythic eventing. It documents the
	// shared special-message convention but is not expected from chat containers.
	EventingUserInteraction map[string]interface{} `json:"eventing_user_interaction,omitempty" mapstructure:"eventing_user_interaction"`

	// ConfirmedMCPToolCall is diagnostic metadata added to the response created
	// after Mythic dispatches an already-approved MCP tool call.
	ConfirmedMCPToolCall map[string]interface{} `json:"confirmed_mcp_tool_call,omitempty" mapstructure:"confirmed_mcp_tool_call"`

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

// ChatMCPToolConfirmationMetadata is the nested payload for
// metadata.special_type == "mcp_tool_confirmation".
type ChatMCPToolConfirmationMetadata struct {
	// Status must be "pending" when sent by a chat container. Mythic later sets
	// it to "confirmed", "rejected", or "responded".
	Status string `json:"status,omitempty" mapstructure:"status"`

	// ServerName is the configured MCP server name.
	ServerName string `json:"server_name,omitempty" mapstructure:"server_name"`

	// ToolName is the exposed tool name Mythic/LiteLLM used for this chat.
	ToolName string `json:"tool_name,omitempty" mapstructure:"tool_name"`

	// ServerToolName is the original MCP server tool name when it differs from
	// ToolName.
	ServerToolName string `json:"server_tool_name,omitempty" mapstructure:"server_tool_name"`

	// Arguments is the exact argument object the model requested. Mythic sends
	// this same object back in confirmed_tool_call after operator approval.
	Arguments map[string]interface{} `json:"arguments,omitempty" mapstructure:"arguments"`

	// Description, Parameters, and Annotations are displayed to the operator as
	// context. Parameters should be the tool's JSON schema. Annotations are
	// advisory only and are not trusted for execution safety.
	Description string                 `json:"description,omitempty" mapstructure:"description"`
	Parameters  map[string]interface{} `json:"parameters,omitempty" mapstructure:"parameters"`
	Annotations map[string]interface{} `json:"annotations,omitempty" mapstructure:"annotations"`

	// ReadOnly indicates whether Mythic config allowed the tool to auto-run.
	// Confirmation cards should normally have this set to false.
	ReadOnly *bool `json:"read_only,omitempty" mapstructure:"read_only"`

	// Response is operator feedback for the "Respond" action. Resolution fields
	// are written by Mythic when the operator acts on the card.
	Response             string `json:"response,omitempty" mapstructure:"response"`
	ResolvedByOperatorID int    `json:"resolved_by_operator_id,omitempty" mapstructure:"resolved_by_operator_id"`
	ResolvedBy           string `json:"resolved_by,omitempty" mapstructure:"resolved_by"`
	ResolvedAt           string `json:"resolved_at,omitempty" mapstructure:"resolved_at"`

	// Other preserves future MCP confirmation keys without dropping them.
	Other map[string]interface{} `json:"-" mapstructure:"-"`
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
	m.MCPConfirmationRequired = chatMetadataTakeBool(values, "mcp_confirmation_required")
	m.MCPToolConfirmation = chatMetadataTakeMCPToolConfirmation(values, ChatMessageSpecialTypeMCPToolConfirmation)
	m.EventingUserInteraction = chatMetadataTakeObject(values, ChatMessageSpecialTypeEventingUserInteraction)
	m.ConfirmedMCPToolCall = chatMetadataTakeObject(values, "confirmed_mcp_tool_call")
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
	values["mcp_confirmation_required"] = m.MCPConfirmationRequired
	if m.MCPToolConfirmation != nil {
		values[ChatMessageSpecialTypeMCPToolConfirmation] = m.MCPToolConfirmation.StructValue()
	}
	values[ChatMessageSpecialTypeEventingUserInteraction] = m.EventingUserInteraction
	values["confirmed_mcp_tool_call"] = m.ConfirmedMCPToolCall
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

func (m *ChatMCPToolConfirmationMetadata) UnmarshalJSON(data []byte) error {
	if len(data) == 0 || string(data) == "null" {
		*m = ChatMCPToolConfirmationMetadata{}
		return nil
	}
	values := map[string]interface{}{}
	if err := json.Unmarshal(data, &values); err != nil {
		return err
	}
	if values == nil {
		*m = ChatMCPToolConfirmationMetadata{}
		return nil
	}
	m.Status = chatMetadataTakeString(values, "status")
	m.ServerName = chatMetadataTakeString(values, "server_name")
	m.ToolName = chatMetadataTakeString(values, "tool_name")
	m.ServerToolName = chatMetadataTakeString(values, "server_tool_name")
	m.Arguments = chatMetadataTakeObject(values, "arguments")
	m.Description = chatMetadataTakeString(values, "description")
	m.Parameters = chatMetadataTakeObject(values, "parameters")
	m.Annotations = chatMetadataTakeObject(values, "annotations")
	m.ReadOnly = chatMetadataTakeBool(values, "read_only")
	m.Response = chatMetadataTakeString(values, "response")
	m.ResolvedByOperatorID = chatMetadataTakeInt(values, "resolved_by_operator_id")
	m.ResolvedBy = chatMetadataTakeString(values, "resolved_by")
	m.ResolvedAt = chatMetadataTakeString(values, "resolved_at")
	m.Other = values
	return nil
}

func (m *ChatMCPToolConfirmationMetadata) MarshalJSON() ([]byte, error) {
	return json.Marshal(m.StructValue())
}

func (m *ChatMCPToolConfirmationMetadata) StructValue() map[string]interface{} {
	values := chatMetadataCopyMap(m.Other)
	values["status"] = m.Status
	values["server_name"] = m.ServerName
	values["tool_name"] = m.ToolName
	values["server_tool_name"] = m.ServerToolName
	values["arguments"] = m.Arguments
	values["description"] = m.Description
	values["parameters"] = m.Parameters
	values["annotations"] = m.Annotations
	values["read_only"] = m.ReadOnly
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

func chatMetadataTakeMCPToolConfirmation(values map[string]interface{}, key string) *ChatMCPToolConfirmationMetadata {
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
	confirmation := ChatMCPToolConfirmationMetadata{}
	if err = json.Unmarshal(serializedValue, &confirmation); err != nil {
		return nil
	}
	return &confirmation
}

type chatResponseRequest struct {
	ID                int    `db:"id"`
	OperationID       int    `db:"operation_id"`
	ResponseMessageID int    `db:"response_message_id"`
	Status            string `db:"status"`
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
			"request_id", incomingMessage.RequestID, "response_message_id", incomingMessage.ResponseMessageID)
	}
}

func applyChatContainerResponse(incomingMessage ChatContainerResponseMessage, authContext RabbitMQAuthContext) error {
	request, err := getChatResponseRequest(incomingMessage, authContext.OperationID)
	if err != nil {
		return err
	}
	if request.Status == databaseStructs.ChatMessageStatusCancelled {
		return nil
	}
	if incomingMessage.OperationID > 0 && incomingMessage.OperationID != request.OperationID {
		return fmt.Errorf("chat response operation %d does not match request operation %d",
			incomingMessage.OperationID, request.OperationID)
	}
	if authContext.OperationID > 0 && authContext.OperationID != request.OperationID {
		return fmt.Errorf("chat response auth operation %d does not match request operation %d",
			authContext.OperationID, request.OperationID)
	}
	if incomingMessage.ResponseMessageID > 0 && incomingMessage.ResponseMessageID != request.ResponseMessageID {
		return fmt.Errorf("chat response message %d does not match request response message %d",
			incomingMessage.ResponseMessageID, request.ResponseMessageID)
	}

	chatResponseLock := getChatResponseLock(request.ResponseMessageID)
	chatResponseLock.Lock()
	defer chatResponseLock.Unlock()

	if request, err = getChatResponseRequest(ChatContainerResponseMessage{RequestID: request.ID}, request.OperationID); err != nil {
		return err
	}
	if isTerminalChatResponseStatus(request.Status) {
		return nil
	}

	status := normalizeChatContainerResponseStatus(incomingMessage)
	if incomingMessage.Content != "" {
		if incomingMessage.IsDelta {
			if err = queueChatResponseDelta(request.ResponseMessageID, request.OperationID, incomingMessage.Content); err != nil {
				return err
			}
		} else {
			if err = flushChatResponseMessageLocked(request.ResponseMessageID, request.OperationID, false); err != nil {
				return err
			}
			if err = setChatResponseMessageContent(request.ResponseMessageID, request.OperationID, incomingMessage.Content); err != nil {
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
		if err = flushChatResponseMessageLocked(request.ResponseMessageID, request.OperationID, true); err != nil {
			return err
		}
	}
	if status == "" && !incomingMessage.Metadata.IsEmpty() {
		status = request.Status
	}
	if status != "" {
		if err = setChatResponseStatus(request, status, incomingMessage.Error, incomingMessage.Metadata); err != nil {
			return err
		}
		if isTerminalChatResponseStatus(status) {
			chatResponseLocks.Delete(request.ResponseMessageID)
		}
	}
	return nil
}

func getChatResponseRequest(incomingMessage ChatContainerResponseMessage, operationID int) (chatResponseRequest, error) {
	request := chatResponseRequest{}
	if incomingMessage.RequestID <= 0 && incomingMessage.ResponseMessageID <= 0 {
		return request, errors.New("chat response requires request_id or response_message_id")
	}
	whereClause := "id=$1"
	arg := incomingMessage.RequestID
	if incomingMessage.RequestID <= 0 {
		whereClause = "response_message_id=$1"
		arg = incomingMessage.ResponseMessageID
	}
	sqlStatement := fmt.Sprintf(`SELECT id, operation_id, response_message_id, status
		FROM chat_request
		WHERE %s`, whereClause)
	args := []interface{}{arg}
	if operationID > 0 {
		sqlStatement += " AND operation_id=$2"
		args = append(args, operationID)
	}
	if err := database.DB.Get(&request, sqlStatement, args...); err != nil {
		return request, err
	}
	return request, nil
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
				logging.LogError(err, "Failed to flush chat response buffer", "response_message_id", responseMessageID)
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

func setChatResponseStatus(request chatResponseRequest, status string, responseError string, metadata ChatContainerResponseMetadata) error {
	metadataJSON := GetMythicJSONTextFromStruct(metadata.StructValue())
	if responseError != "" {
		metadataJSON = GetMythicJSONTextFromStruct(map[string]interface{}{
			"container_metadata": metadata.StructValue(),
			"error":              responseError,
		})
	}
	_, err := database.DB.Exec(`UPDATE chat_message
		SET status=$3,
			metadata = metadata || $4::jsonb
		WHERE id=$1 AND operation_id=$2 AND deleted=false AND status <> 'cancelled'`, request.ResponseMessageID, request.OperationID, status, metadataJSON.String())
	if err != nil {
		return err
	}
	_, err = database.DB.Exec(`UPDATE chat_request
		SET status=$2,
			error=$3,
			completed_at=CASE WHEN $2='complete' THEN now() ELSE completed_at END,
			cancelled_at=CASE WHEN $2='cancelled' THEN now() ELSE cancelled_at END
		WHERE id=$1 AND operation_id=$4 AND status <> 'cancelled'`, request.ID, status, responseError, request.OperationID)
	return err
}
