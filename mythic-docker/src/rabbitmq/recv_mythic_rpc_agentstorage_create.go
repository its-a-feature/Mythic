package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCAgentstorageCreateMessage struct {
	OperationID int    `json:"operation_id"`
	UniqueID    string `json:"unique_id"`
	DataToStore []byte `json:"data"`
}
type MythicRPCAgentstorageCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:       MYTHIC_EXCHANGE,
		Queue:          MYTHIC_RPC_AGENTSTORAGE_CREATE,
		RoutingKey:     MYTHIC_RPC_AGENTSTORAGE_CREATE,
		Handler:        processMythicRPCAgentstorageCreate,
		Authentication: RabbitMQAuthenticationContainerOperation,
		Scopes:         []string{},
	})
}

// Endpoint: MYTHIC_RPC_AGENTSTORAGE_CREATE
func MythicRPCAgentstorageCreate(input MythicRPCAgentstorageCreateMessage, authContext RabbitMQAuthContext) MythicRPCAgentstorageCreateMessageResponse {
	response := MythicRPCAgentstorageCreateMessageResponse{
		Success: false,
	}
	agentStorage := databaseStructs.Agentstorage{
		UniqueID:           input.UniqueID,
		OperationID:        authContext.OperationID,
		ContainerPrincipal: authContext.ContainerPrincipal,
	}
	agentStorage.Data = input.DataToStore
	if _, err := database.DB.NamedExec(`INSERT INTO agentstorage
			(unique_id,data,operation_id,container_principal)
			VALUES (:unique_id, :data, :operation_id, :container_principal)`,
		agentStorage); err != nil {
		logging.LogError(err, "Failed to save agentstorage data to database")
		response.Error = err.Error()
		return response
	} else {
		logging.LogDebug("creating new agent storage", "agentstorage", agentStorage)
		response.Success = true
		return response
	}
}
func processMythicRPCAgentstorageCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCAgentstorageCreateMessage{}
	responseMsg := MythicRPCAgentstorageCreateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		authContext, err := getVerifiedRabbitMQRequestContext(msg)
		if err != nil {
			responseMsg.Error = err.Error()
			return responseMsg
		}
		if incomingMessage.OperationID != authContext.OperationID {
			responseMsg.Error = "operation_id does not match the authenticated operation context"
			return responseMsg
		}
		return MythicRPCAgentstorageCreate(incomingMessage, authContext)
	}
	return responseMsg
}
