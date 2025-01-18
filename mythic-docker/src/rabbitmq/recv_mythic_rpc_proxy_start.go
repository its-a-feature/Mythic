package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCProxyStartMessage struct {
	TaskID     int    `json:"task_id"`
	LocalPort  int    `json:"local_port"`
	RemotePort int    `json:"remote_port"`
	RemoteIP   string `json:"remote_ip"`
	PortType   string `json:"port_type"`
	Username   string `json:"Username"`
	Password   string `json:"Password"`
}
type MythicRPCProxyStartMessageResponse struct {
	Success   bool   `json:"success"`
	LocalPort int    `json:"local_port"`
	Error     string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PROXY_START,
		RoutingKey: MYTHIC_RPC_PROXY_START,
		Handler:    processMythicRPCProxyStart,
	})
}

// Endpoint: MYTHIC_RPC_PROXY
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCProxyStart(input MythicRPCProxyStartMessage) MythicRPCProxyStartMessageResponse {
	response := MythicRPCProxyStartMessageResponse{
		Success: false,
	}
	if input.PortType == CALLBACK_PORT_TYPE_RPORTFWD && (input.RemoteIP == "" || input.RemotePort == 0) {
		response.Error = "Missing remote ip or port"
		return response
	}
	task := databaseStructs.Task{ID: input.TaskID}
	err := database.DB.Get(&task, `SELECT id, operation_id, callback_id FROM task WHERE id=$1`, task.ID)
	if err != nil {
		logging.LogError(err, "Failed to get task from database to start socks")
		response.Error = err.Error()
		return response
	}
	switch input.PortType {
	case CALLBACK_PORT_TYPE_RPORTFWD:
	case CALLBACK_PORT_TYPE_SOCKS:
		fallthrough
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		if input.LocalPort == 0 {
			input.LocalPort = int(proxyPorts.GetNextAvailableLocalPort())
			if input.LocalPort == 0 {
				response.Error = "No more ports available through docker, please modify your .env's configuration and restart Mythic"
				return response
			}
		}
	}
	response.LocalPort = input.LocalPort
	err = proxyPorts.Add(task.CallbackID,
		input.PortType,
		input.LocalPort,
		input.RemotePort,
		input.RemoteIP,
		task.ID,
		task.OperationID,
		0,
		0,
		0,
		input.Username,
		input.Password)
	if err != nil {
		logging.LogError(err, "Failed to add new callback port")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}
func processMythicRPCProxyStart(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCProxyStartMessage{}
	responseMsg := MythicRPCProxyStartMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCProxyStart(incomingMessage)
	}
	return responseMsg
}
