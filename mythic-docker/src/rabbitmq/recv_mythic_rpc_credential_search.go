package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCCredentialSearchMessage struct {
	TaskID            int                                     `json:"task_id"` //required
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
	})
}

// Endpoint: MYTHIC_RPC_CREDENTIAL_SEARCH
func MythicRPCCredentialSearch(input MythicRPCCredentialSearchMessage) MythicRPCCredentialSearchMessageResponse {
	response := MythicRPCCredentialSearchMessageResponse{
		Success: false,
	}
	paramDict := make(map[string]interface{})
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT 
	task.id,
	callback.operation_id "callback.operation_id",
	callback.host "callback.host"
	FROM task
	JOIN callback ON task.callback_id = callback.id
	WHERE task.id=$1`, input.TaskID); err != nil {
		response.Error = err.Error()
		return response
	} else {
		credentials := []databaseStructs.Credential{}
		paramDict["operation_id"] = task.Callback.OperationID
		searchString := `SELECT * FROM credential WHERE operation_id=:operation_id  `
		if input.SearchCredentials.Type != nil {
			paramDict["type"] = *input.SearchCredentials.Type
			searchString += "AND \"type\" ILIKE %:type% "
		}
		if input.SearchCredentials.Credential != nil {
			paramDict["credential"] = *input.SearchCredentials.Credential
			searchString += "AND credential ILIKE %:credential% "
		}
		if input.SearchCredentials.Account != nil {
			paramDict["account"] = *input.SearchCredentials.Account
			searchString += "AND account LIKE %:account% "
		}
		if input.SearchCredentials.Realm != nil {
			paramDict["realm"] = *input.SearchCredentials.Realm
			searchString += "AND realm LIKE %:realm% "
		}
		if input.SearchCredentials.Comment != nil {
			paramDict["comment"] = *input.SearchCredentials.Comment
			searchString += "AND comment LIKE %:comment% "
		}
		if input.SearchCredentials.Metadata != nil {
			paramDict["metadata"] = *input.SearchCredentials.Metadata
			searchString += "AND metadata LIKE %:metadata% "
		}

		if err := database.DB.Select(&credentials, searchString, paramDict); err != nil {
			response.Error = err.Error()
			return response
		} else {
			returnedProcesses := []MythicRPCCredentialSearchCredentialData{}
			if marshalledBytes, err := json.Marshal(credentials); err != nil {
				response.Error = err.Error()
				return response
			} else if err := json.Unmarshal(marshalledBytes, &returnedProcesses); err != nil {
				response.Error = err.Error()
				return response
			} else {
				response.Success = true
				response.Credentials = returnedProcesses
				return response
			}

		}
	}
}
func processMythicRPCCredentialSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCCredentialSearchMessage{}
	responseMsg := MythicRPCCredentialSearchMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCCredentialSearch(incomingMessage)
	}
	return responseMsg
}
