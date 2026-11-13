package rabbitmq

import (
	"encoding/json"
	"fmt"
	"time"

	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCredentialSearchMessage struct {
	SearchCredentials MythicRPCCredentialSearchCredentialData `json:"credentials"`
}
type MythicRPCCredentialSearchMessageResponse struct {
	Success     bool            `json:"success"`
	Error       string          `json:"error"`
	Credentials json.RawMessage `json:"credentials"`
}
type MythicRPCCredentialSearchCredentialData struct {
	ID         *int        `json:"id,omitempty"`
	Type       *string     `json:"type,omitempty"`
	Subtype    *string     `json:"subtype,omitempty"`
	Account    *string     `json:"account,omitempty"`
	Realm      *string     `json:"realm,omitempty"`
	Credential *string     `json:"credential,omitempty"`
	Comment    *string     `json:"comment,omitempty"`
	Metadata   interface{} `json:"metadata,omitempty"`
	Identity   interface{} `json:"credential_identity,omitempty"`
	Display    *string     `json:"custom_display,omitempty"`
	Deleted    *bool       `json:"deleted,omitempty"`
	Timestamp  *time.Time  `json:"timestamp,omitempty"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_CREDENTIAL_SEARCH,
		RoutingKey: MYTHIC_RPC_CREDENTIAL_SEARCH,
		Handler:    processMythicRPCCredentialSearch,
		Scopes:     []string{authorization.SCOPE_CREDENTIAL_READ},
	})
}

// Endpoint: MYTHIC_RPC_CREDENTIAL_SEARCH
func MythicRPCCredentialSearch(input MythicRPCCredentialSearchMessage, authContext RabbitMQAuthContext) MythicRPCCredentialSearchMessageResponse {
	response := MythicRPCCredentialSearchMessageResponse{
		Success: false,
	}
	// Use the same field policy as Hasura. The request's concrete source grants
	// are reused for predicate validation and projection, without normalization.
	table := authorization.Current.Tables["credential"]
	scopes := authContext.ScopeSet()
	if input.SearchCredentials.Credential != nil {
		for _, rule := range table.Policy.FieldReads {
			for _, field := range rule.Fields {
				if (field.Column == "credential" || field.ComputedField == "credential_text") && !scopes[authorization.SCOPE_ALL] && !scopes[rule.Permission] {
					response.Error = "missing required scope: " + rule.Permission
					return response
				}
			}
		}
	}
	params := []interface{}{}
	credentials := []databaseStructs.Credential{}
	params = append(params, authContext.OperationID)
	searchString := fmt.Sprintf(`SELECT c.* FROM credential c WHERE c.operation_id=$%d `, len(params))
	if input.SearchCredentials.Type != nil {
		params = append(params, "%"+*input.SearchCredentials.Type+"%")
		searchString += fmt.Sprintf("AND c.\"type\" ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Subtype != nil {
		params = append(params, "%"+*input.SearchCredentials.Subtype+"%")
		searchString += fmt.Sprintf("AND c.subtype ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Credential != nil {
		params = append(params, "%"+*input.SearchCredentials.Credential+"%")
		searchString += fmt.Sprintf("AND credential_credentials(c) ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Account != nil {
		params = append(params, "%"+*input.SearchCredentials.Account+"%")
		searchString += fmt.Sprintf("AND c.account ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Realm != nil {
		params = append(params, "%"+*input.SearchCredentials.Realm+"%")
		searchString += fmt.Sprintf("AND c.realm ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Comment != nil {
		params = append(params, "%"+*input.SearchCredentials.Comment+"%")
		searchString += fmt.Sprintf("AND c.comment ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Display != nil {
		params = append(params, "%"+*input.SearchCredentials.Display+"%")
		searchString += fmt.Sprintf("AND c.custom_display ILIKE $%d ", len(params))
	}
	if input.SearchCredentials.Metadata != nil {
		switch metadataFilter := input.SearchCredentials.Metadata.(type) {
		case string:
			params = append(params, "%"+metadataFilter+"%")
			searchString += fmt.Sprintf("AND c.metadata::text ILIKE $%d ", len(params))
		default:
			metadataBytes, err := json.Marshal(metadataFilter)
			if err != nil {
				response.Error = err.Error()
				return response
			}
			params = append(params, string(metadataBytes))
			searchString += fmt.Sprintf("AND c.metadata @> $%d::jsonb ", len(params))
		}
	}
	if input.SearchCredentials.Identity != nil {
		switch identityFilter := input.SearchCredentials.Identity.(type) {
		case string:
			params = append(params, "%"+identityFilter+"%")
			searchString += fmt.Sprintf("AND c.credential_identity::text ILIKE $%d ", len(params))
		default:
			identityBytes, err := json.Marshal(identityFilter)
			if err != nil {
				response.Error = err.Error()
				return response
			}
			params = append(params, string(identityBytes))
			searchString += fmt.Sprintf("AND c.credential_identity @> $%d::jsonb ", len(params))
		}
	}
	searchString += " ORDER BY c.id DESC"
	err := database.DB.Select(&credentials, searchString, params...)
	if err != nil {
		logging.LogError(err, "Failed to search for credentials")
		response.Error = err.Error()
		return response
	}
	// Build the existing wire shape directly instead of JSON-encoding database
	// models and immediately decoding them into response structs.
	returnedCredentials := make([]MythicRPCCredentialSearchCredentialData, len(credentials))
	for i := range credentials {
		credential := &credentials[i]
		returnedCredentials[i] = MythicRPCCredentialSearchCredentialData{
			ID: &credential.ID, Type: &credential.Type, Subtype: &credential.Subtype,
			Account: &credential.Account, Realm: &credential.Realm, Credential: &credential.Credential,
			Comment: &credential.Comment, Metadata: credential.Metadata, Identity: credential.Identity,
			Display: &credential.CustomDisplay, Deleted: &credential.Deleted, Timestamp: &credential.Timestamp,
		}
	}
	projected, err := authorization.ProjectFields(table, scopes, returnedCredentials)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	response.Success = true
	response.Credentials = projected
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
