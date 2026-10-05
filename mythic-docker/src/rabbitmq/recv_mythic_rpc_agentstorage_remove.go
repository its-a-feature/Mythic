package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCAgentstorageRemoveMessage struct {
	OperationID int    `json:"operation_id"`
	UniqueID    string `json:"unique_id"`
}
type MythicRPCAgentstorageRemoveMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:       MYTHIC_EXCHANGE,
		Queue:          MYTHIC_RPC_AGENTSTORAGE_REMOVE,
		RoutingKey:     MYTHIC_RPC_AGENTSTORAGE_REMOVE,
		Handler:        processMythicRPCAgentstorageRemove,
		Authentication: RabbitMQAuthenticationContainerOperation,
		Scopes:         []string{},
	})
}

// Endpoint: MYTHIC_RPC_AGENTSTORAGE_REMOVE
func MythicRPCAgentstorageRemove(input MythicRPCAgentstorageRemoveMessage, authContext RabbitMQAuthContext) MythicRPCAgentstorageRemoveMessageResponse {
	response := MythicRPCAgentstorageRemoveMessageResponse{
		Success: false,
	}
	agentStorage := databaseStructs.Agentstorage{
		UniqueID:           input.UniqueID,
		OperationID:        authContext.OperationID,
		ContainerPrincipal: authContext.ContainerPrincipal,
	}
	if result, err := database.DB.NamedExec(`DELETE FROM agentstorage
			WHERE unique_id=:unique_id
			  AND operation_id=:operation_id
			  AND container_principal=:container_principal`,
		agentStorage); err != nil {
		logging.LogError(err, "Failed to save agentstorage data to database")
		response.Error = err.Error()
		return response
	} else if removed, rowsErr := result.RowsAffected(); rowsErr != nil {
		response.Error = rowsErr.Error()
		return response
	} else if removed == 0 {
		response.Error = "agentstorage entry not found for authenticated tenant"
		return response
	} else {
		logging.LogDebug("Removed agentstorage entries", "unique_id", input.UniqueID)
		response.Success = true
		return response
	}
}
func processMythicRPCAgentstorageRemove(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCAgentstorageRemoveMessage{}
	responseMsg := MythicRPCAgentstorageRemoveMessageResponse{
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
		return MythicRPCAgentstorageRemove(incomingMessage, authContext)
	}
	return responseMsg
}
