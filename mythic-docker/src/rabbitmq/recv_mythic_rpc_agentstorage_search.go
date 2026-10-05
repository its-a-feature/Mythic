package rabbitmq

import (
	"encoding/json"
	"fmt"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCAgentstorageSearchMessage struct {
	OperationID    int    `json:"operation_id"`
	SearchUniqueID string `json:"unique_id" db:"unique_id"` // required
}
type MythicRPCAgentstorageSearchMessageResponse struct {
	Success              bool                                `json:"success"`
	Error                string                              `json:"error"`
	AgentStorageMessages []MythicRPCAgentstorageSearchResult `json:"agentstorage_messages"`
}

type MythicRPCAgentstorageSearchResult struct {
	UniqueID string `json:"unique_id"`
	Data     []byte `json:"data"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:       MYTHIC_EXCHANGE,
		Queue:          MYTHIC_RPC_AGENTSTORAGE_SEARCH,
		RoutingKey:     MYTHIC_RPC_AGENTSTORAGE_SEARCH,
		Handler:        processMythicRPCAgentstorageSearch,
		Authentication: RabbitMQAuthenticationContainerOperation,
		Scopes:         []string{},
	})
}

// Endpoint: MYTHIC_RPC_AGENTSTORAGE_SEARCH
func MythicRPCAgentstorageSearch(input MythicRPCAgentstorageSearchMessage, authContext RabbitMQAuthContext) MythicRPCAgentstorageSearchMessageResponse {
	response := MythicRPCAgentstorageSearchMessageResponse{
		Success: false,
	}
	agentStorageMessages := []databaseStructs.Agentstorage{}
	searchUniqueID := fmt.Sprintf("%%%s%%", input.SearchUniqueID)
	if err := database.DB.Select(&agentStorageMessages, `SELECT
	*
	FROM agentstorage
	WHERE operation_id = $1
	  AND container_principal = $2
	  AND unique_id ILIKE $3`, authContext.OperationID, authContext.ContainerPrincipal, searchUniqueID); err != nil {
		logging.LogError(err, "Failed to search agentstorage data")
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		agentStorageResponses := make([]MythicRPCAgentstorageSearchResult, len(agentStorageMessages))
		for i, msg := range agentStorageMessages {
			agentStorageResponses[i] = MythicRPCAgentstorageSearchResult{
				UniqueID: msg.UniqueID,
				Data:     msg.Data,
			}
		}
		response.AgentStorageMessages = agentStorageResponses
		return response
	}
}
func processMythicRPCAgentstorageSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCAgentstorageSearchMessage{}
	responseMsg := MythicRPCAgentstorageSearchMessageResponse{
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
		return MythicRPCAgentstorageSearch(incomingMessage, authContext)
	}
	return responseMsg
}
