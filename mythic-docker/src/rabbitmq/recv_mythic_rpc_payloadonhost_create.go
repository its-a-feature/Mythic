package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
	"strings"
)

type MythicRPCPayloadOnHostCreateMessage struct {
	TaskID        int                              `json:"task_id"` //required
	PayloadOnHost MythicRPCPayloadOnHostCreateData `json:"payload_on_host"`
}
type MythicRPCPayloadOnHostCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
type MythicRPCPayloadOnHostCreateData struct {
	Host        string  `json:"host"`
	PayloadId   *int    `json:"payload_id"`
	PayloadUUID *string `json:"payload_uuid"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PAYLOADONHOST_CREATE,
		RoutingKey: MYTHIC_RPC_PAYLOADONHOST_CREATE,
		Handler:    processMythicRPCPayloadOnHostCreate,
	})
}

// Endpoint: MYTHIC_RPC_PAYLOADONHOST_CREATE
func MythicRPCPayloadOnHostCreate(input MythicRPCPayloadOnHostCreateMessage) MythicRPCPayloadOnHostCreateMessageResponse {
	response := MythicRPCPayloadOnHostCreateMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT
	callback.operation_id "callback.operation_id",
	callback.host "callback.host"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id = $1`, input.TaskID); err != nil {
		logging.LogError(err, "Failed to fetch task")
		response.Error = err.Error()
		return response
	} else {
		if input.PayloadOnHost.Host == "" {
			input.PayloadOnHost.Host = task.Callback.Host
		} else {
			input.PayloadOnHost.Host = strings.ToUpper(input.PayloadOnHost.Host)
		}
		payloadId := 0
		if input.PayloadOnHost.PayloadId != nil {
			payloadId = *input.PayloadOnHost.PayloadId
		} else if input.PayloadOnHost.PayloadUUID != nil {
			payload := databaseStructs.Payload{}
			if err := database.DB.Get(&payload, `SELECT id FROM payload WHERE uuid=$1 AND operation_id=$2`,
				*input.PayloadOnHost.PayloadUUID, task.OperationID); err != nil {
				logging.LogError(err, "Failed to find specified payload UUID")
				response.Error = err.Error()
				return response
			} else {
				payloadId = payload.ID
			}
		}
		if payloadId == 0 {
			response.Error = fmt.Sprintf("Failed to find the specified payload")
			return response
		} else if _, err := database.DB.Exec(`INSERT INTO payloadonhost 
			(host, payload_id, operation_id, task_id) VALUES 
			($1, $2, $3, $4)`,
			input.PayloadOnHost.Host, payloadId, task.OperationID, task.ID); err != nil {
			logging.LogError(err, "Failed to create new payload on host value")
			response.Error = err.Error()
			return response
		} else {
			response.Success = true
			return response
		}
	}
}
func processMythicRPCPayloadOnHostCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCPayloadOnHostCreateMessage{}
	responseMsg := MythicRPCPayloadOnHostCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCPayloadOnHostCreate(incomingMessage)
	}
	return responseMsg
}
