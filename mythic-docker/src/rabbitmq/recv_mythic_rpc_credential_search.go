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

type MythicRPCCredentialSearchMessage struct {
	SearchCredentials MythicRPCCredentialSearchCredentialData `json:"credentials"`
}
type MythicRPCCredentialSearchMessageResponse struct {
	Success     bool                                      `json:"success"`
	Error       string                                    `json:"error"`
	Credentials []MythicRPCCredentialSearchCredentialData `json:"credentials"`
}
type MythicRPCCredentialSearchCredentialData struct {
	Type       *string `json:"type" `      // optional
	Account    *string `json:"account" `   // optional
	Realm      *string `json:"realm" `     // optional
	Credential *string `json:"credential"` // optional
	Comment    *string `json:"comment"`    // optional
	Metadata   *string `json:"metadata"`   // optional
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CREDENTIAL_SEARCH,
		RoutingKey: MYTHIC_RPC_CREDENTIAL_SEARCH,
		Handler:    processMythicRPCCredentialSearch,
		Scopes:     []string{mythicjwt.SCOPE_CREDENTIAL_READ},
	})
}

// Endpoint: MYTHIC_RPC_CREDENTIAL_SEARCH
func MythicRPCCredentialSearch(input MythicRPCCredentialSearchMessage, authContext RabbitMQAuthContext) MythicRPCCredentialSearchMessageResponse {
	response := MythicRPCCredentialSearchMessageResponse{
		Success: false,
	}
	params := []interface{}{}
	credentials := []databaseStructs.Credential{}
	params = append(params, authContext.OperationID)
	searchString := fmt.Sprintf(`SELECT * FROM credential WHERE operation_id=$%d `, len(params))
	if input.SearchCredentials.Type != nil {
		params = append(params, "%"+*input.SearchCredentials.Type+"%")
		searchString += fmt.Sprintf("AND \"type\" ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Credential != nil {
		params = append(params, "%"+*input.SearchCredentials.Credential+"%")
		searchString += fmt.Sprintf("AND credential LIKE $%d ", len(params))
	}
	if input.SearchCredentials.Account != nil {
		params = append(params, "%"+*input.SearchCredentials.Account+"%")
		searchString += fmt.Sprintf("AND account ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Realm != nil {
		params = append(params, "%"+*input.SearchCredentials.Realm+"%")
		searchString += fmt.Sprintf("AND realm ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Comment != nil {
		params = append(params, "%"+*input.SearchCredentials.Comment+"%")
		searchString += fmt.Sprintf("AND comment ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Metadata != nil {
		params = append(params, "%"+*input.SearchCredentials.Metadata+"%")
		searchString += fmt.Sprintf("AND metadata ILIKE $%d ", len(params))
	}
	searchString += " ORDER BY id DESC"
	err := database.DB.Select(&credentials, searchString, params...)
	if err != nil {
		logging.LogError(err, "Failed to search for credentials")
		response.Error = err.Error()
		return response
	}
	returnedCredentials := []MythicRPCCredentialSearchCredentialData{}
	marshalledBytes, err := json.Marshal(credentials)
	if err != nil {
		logging.LogError(err, "Failed to marshal credential result")
		response.Error = err.Error()
		return response
	}
	err = json.Unmarshal(marshalledBytes, &returnedCredentials)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal credential results")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	response.Credentials = returnedCredentials
	return response
}
func processMythicRPCCredentialSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCredentialSearchMessage{}
	responseMsg := MythicRPCCredentialSearchMessageResponse{
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
	return MythicRPCCredentialSearch(incomingMessage, authContext)
}
