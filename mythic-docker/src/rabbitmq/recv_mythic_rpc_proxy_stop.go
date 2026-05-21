package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCProxyStopMessage struct {
	TaskID   int    `json:"task_id"`
	Port     int    `json:"port"`
	PortType string `json:"port_type"`
	Username string `json:"username"`
	Password string `json:"password"`
}
type MythicRPCProxyStopMessageResponse struct {
	Success   bool   `json:"success"`
	Error     string `json:"error"`
	LocalPort int    `json:"local_port"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PROXY_STOP,
		RoutingKey: MYTHIC_RPC_PROXY_STOP,
		Handler:    processMythicRPCProxyStop,
		Scopes:     []string{mythicjwt.SCOPE_TASK_WRITE},
	})
}

// Endpoint: MYTHIC_RPC_PROXY
//
// Creates a FileMeta object for a specific task in Mythic's database and writes contents to disk with a random UUID filename.
func MythicRPCProxyStop(input MythicRPCProxyStopMessage, authContext RabbitMQAuthContext) MythicRPCProxyStopMessageResponse {
	response := MythicRPCProxyStopMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{ID: input.TaskID}
	err := database.DB.Get(&task, `SELECT 
    	id, operation_id, callback_id 
		FROM task 
		WHERE id=$1 AND operation_id=$2`, task.ID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to get task from database to start socks")
		response.Error = err.Error()
		return response
	}
	switch input.PortType {
	case CALLBACK_PORT_TYPE_RPORTFWD:
		fallthrough
	case CALLBACK_PORT_TYPE_SOCKS:
		fallthrough
	case CALLBACK_PORT_TYPE_INTERACTIVE:
		if input.Port == 0 {
			// lookup the port that might need to be closed for this PortType and CallbackID
			input.Port = proxyPorts.GetPortForTypeAndCallback(task.ID, task.CallbackID, input.PortType)
			if input.Port == 0 {
				response.Error = fmt.Sprintf("Failed to find port for type, %s, and task, %d", input.PortType, task.ID)
				return response
			}
		}
	}
	response.LocalPort = input.Port
	err = proxyPorts.Remove(task.CallbackID,
		input.PortType,
		input.Port,
		task.OperationID,
		"",
		0,
		input.Username,
		input.Password)
	if err != nil {
		logging.LogError(err, "Failed to stop callback port")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	return response
}
func processMythicRPCProxyStop(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCProxyStopMessage{}
	responseMsg := MythicRPCProxyStopMessageResponse{
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
	return MythicRPCProxyStop(incomingMessage, authContext)
}
