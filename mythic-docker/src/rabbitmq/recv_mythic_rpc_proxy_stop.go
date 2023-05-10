package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCProxyStopMessage struct {
	TaskID   int    `json:"task_id"`
	Port     int    `json:"port"`
	PortType string `json:"port_type"`
}
type MythicRPCProxyStopMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PROXY_STOP,
		RoutingKey: MYTHIC_RPC_PROXY_STOP,
		Handler:    processMythicRPCProxyStop,
	})
}

// Endpoint: MYTHIC_RPC_PROXY
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCProxyStop(input MythicRPCProxyStopMessage) MythicRPCProxyStopMessageResponse {
	response := MythicRPCProxyStopMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{ID: input.TaskID}
	if err := database.DB.Get(&task, `SELECT id, operation_id, callback_id FROM task WHERE id=$1`, task.ID); err != nil {
		logging.LogError(err, "Failed to get task from database to start socks")
		response.Error = err.Error()
		return response
	} else {
		if err := proxyPorts.Remove(task.CallbackID, input.PortType, input.Port, task.OperationID); err != nil {
			logging.LogError(err, "Failed to stop callback port")
			response.Error = err.Error()
			return response
		} else {
			response.Success = true
			return response
		}
	}

}
func processMythicRPCProxyStop(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCProxyStopMessage{}
	responseMsg := MythicRPCProxyStopMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCProxyStop(incomingMessage)
	}
	return responseMsg
}
