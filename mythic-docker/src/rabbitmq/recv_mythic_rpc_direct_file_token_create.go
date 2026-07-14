package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

const directFileScopedTokenTTL = 30 * time.Second

type MythicRPCDirectFileTokenCreateMessage struct {
	FileUUID string `json:"agent_file_id"`
	Action   string `json:"action"` // upload, download, both
}

type MythicRPCDirectFileTokenCreateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	Token   string `json:"token"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_DIRECT_FILE_TOKEN_CREATE,
		RoutingKey: MYTHIC_RPC_DIRECT_FILE_TOKEN_CREATE,
		Handler:    processMythicRPCDirectFileTokenCreate,
	})
}

func MythicRPCDirectFileTokenCreate(input MythicRPCDirectFileTokenCreateMessage, authContext RabbitMQAuthContext) MythicRPCDirectFileTokenCreateMessageResponse {
	response := MythicRPCDirectFileTokenCreateMessageResponse{Success: false}
	if input.FileUUID == "" {
		response.Error = "file_uuid is required"
		return response
	}
	file := databaseStructs.Filemeta{
		AgentFileID: input.FileUUID,
	}
	err := database.DB.Get(&file, `SELECT 
		id
		FROM filemeta 
		WHERE agent_file_id=$1 AND operation_id=$2`,
		input.FileUUID, authContext.OperationID)
	if err != nil {
		payload := databaseStructs.Payload{}
		err = database.DB.Get(&payload, `SELECT
			filemeta.path "filemeta.path",
			filemeta.filename "filemeta.filename",
			filemeta.id "filemeta.id",
			filemeta.operation_id "filemeta.operation_id"
			FROM payload
			JOIN filemeta ON payload.file_id = filemeta.id
			WHERE payload.uuid=$1 and payload.operation_id=$2`, input.FileUUID, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to find file for direct file access", "file_uuid", input.FileUUID, "operation_id", authContext.OperationID)
			response.Error = err.Error()
			return response
		}
	}
	user := databaseStructs.Operator{
		ID: authContext.OperatorID,
		CurrentOperationID: sql.NullInt64{
			Valid: true,
			Int64: int64(authContext.OperationID),
		},
	}
	scope := mythicjwt.SCOPE_FILE_READ
	if input.Action == "upload" || input.Action == "both" {
		scope = mythicjwt.SCOPE_FILE_WRITE
	}
	token, _, err := mythicjwt.GenerateScopedJWT(user, []string{scope}, input.FileUUID, directFileScopedTokenTTL, authContext.EventStepInstanceID, authContext.APITokensID)
	if err != nil {
		logging.LogError(err, "Failed to generate JWT for direct file access")
		response.Error = err.Error()
		return response
	}
	response.Success = true
	response.Token = token
	return response
}

func processMythicRPCDirectFileTokenCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCDirectFileTokenCreateMessage{}
	responseMsg := MythicRPCDirectFileTokenCreateMessageResponse{Success: false}
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
	return MythicRPCDirectFileTokenCreate(incomingMessage, authContext)
}
