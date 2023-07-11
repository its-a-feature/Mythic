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
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_AGENTSTORAGE_SEARCH,
		RoutingKey: MYTHIC_RPC_AGENTSTORAGE_SEARCH,
		Handler:    processMythicRPCAgentstorageSearch,
	})
}

// Endpoint: MYTHIC_RPC_AGENTSTORAGE_SEARCH
func MythicRPCAgentstorageSearch(input MythicRPCAgentstorageSearchMessage) MythicRPCAgentstorageSearchMessageResponse {
	response := MythicRPCAgentstorageSearchMessageResponse{
		Success: false,
	}
	agentStorageMessages := []databaseStructs.Agentstorage{}
	searchUniqueID := fmt.Sprintf("%%%s%%", input.SearchUniqueID)
	if err := database.DB.Select(&agentStorageMessages, `SELECT
	*
	FROM agentstorage
	WHERE unique_id ILIKE $1`, searchUniqueID); err != nil {
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
		return MythicRPCAgentstorageSearch(incomingMessage)
	}
	return responseMsg
}
