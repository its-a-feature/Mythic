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

const chatStreamFlushInterval = 500 * time.Millisecond

type ChatContainerResponseMessage struct {
	OperationID       int                    `json:"operation_id" mapstructure:"operation_id"`
	RequestID         int                    `json:"request_id" mapstructure:"request_id"`
	ResponseMessageID int                    `json:"response_message_id" mapstructure:"response_message_id"`
	Content           string                 `json:"content" mapstructure:"content"`
	IsDelta           bool                   `json:"is_delta" mapstructure:"is_delta"`
	Complete          bool                   `json:"complete" mapstructure:"complete"`
	Status            string                 `json:"status" mapstructure:"status"`
	Error             string                 `json:"error" mapstructure:"error"`
	Metadata          map[string]interface{} `json:"metadata" mapstructure:"metadata"`
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
	if status == "" && len(incomingMessage.Metadata) > 0 {
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

func setChatResponseStatus(request chatResponseRequest, status string, responseError string, metadata map[string]interface{}) error {
	if len(metadata) == 0 {
		metadata = map[string]interface{}{}
	}
	metadataJSON := GetMythicJSONTextFromStruct(metadata)
	if responseError != "" {
		metadataJSON = GetMythicJSONTextFromStruct(map[string]interface{}{
			"container_metadata": metadata,
			"error":              responseError,
		})
	}
	_, err := database.DB.Exec(`UPDATE chat_message
		SET status=$3,
			metadata = metadata || $4::jsonb
		WHERE id=$1 AND operation_id=$2 AND deleted=false`, request.ResponseMessageID, request.OperationID, status, metadataJSON.String())
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
