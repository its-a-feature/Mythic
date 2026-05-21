package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCOperationEventLogCreateMessage struct {
	// the data to store
	Message      string                `json:"message"`
	MessageLevel database.MESSAGE_TYPE `json:"level"` //info or warning
	Warning      bool                  `json:"warning"`
}
type MythicRPCOperationEventLogCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_EVENTLOG_CREATE,
		RoutingKey: MYTHIC_RPC_EVENTLOG_CREATE,
		Handler:    processMythicRPCOperationEventLogCreate,
		Scopes:     []string{mythicjwt.SCOPE_EVENTLOG_WRITE},
	})
}

// Endpoint: MYTHIC_RPC_OPERATIONEVENTLOG_CREATE
func MythicRPCOperationEventLogCreate(input MythicRPCOperationEventLogCreateMessage, authContext RabbitMQAuthContext) MythicRPCOperationEventLogCreateMessageResponse {
	response := MythicRPCOperationEventLogCreateMessageResponse{
		Success: false,
	}
	if input.MessageLevel == "warning" {
		input.MessageLevel = database.MESSAGE_LEVEL_INFO
		input.Warning = true
	}
	SendAllOperationsMessageWithAuth(input.Message, authContext.OperationID, "", input.MessageLevel, input.Warning, authContext)
	response.Success = true
	return response
}
func processMythicRPCOperationEventLogCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCOperationEventLogCreateMessage{}
	responseMsg := MythicRPCOperationEventLogCreateMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCOperationEventLogCreate(incomingMessage, authContext)
}
