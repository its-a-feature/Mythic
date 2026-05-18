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

func MythicRPCDirectFileTokenCreate(input MythicRPCDirectFileTokenCreateMessage) MythicRPCDirectFileTokenCreateMessageResponse {
	response := MythicRPCDirectFileTokenCreateMessageResponse{Success: false}
	if input.FileUUID == "" {
		response.Error = "file_uuid is required"
		return response
	}
	file := databaseStructs.Filemeta{}
	err := database.DB.Get(&file, `SELECT 
    	operator_id, operation_id, eventstepinstance_id, apitokens_id
		FROM filemeta 
		WHERE agent_file_id=$1`,
		input.FileUUID)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	user := databaseStructs.Operator{
		ID: file.OperatorID,
		CurrentOperationID: sql.NullInt64{
			Valid: true,
			Int64: int64(file.OperationID),
		},
	}
	eventstepInstanceID := 0
	if file.EventStepInstanceID.Valid {
		eventstepInstanceID = int(file.EventStepInstanceID.Int64)
	}
	scope := mythicjwt.SCOPE_FILE_READ
	if input.Action == "upload" {
		scope = mythicjwt.SCOPE_FILE_WRITE
	}
	apitokenID := 0
	if file.APITokensID.Valid {
		apitokenID = int(file.APITokensID.Int64)
	}
	token, _, err := mythicjwt.GenerateScopedJWT(user, []string{scope}, input.FileUUID, directFileScopedTokenTTL, eventstepInstanceID, apitokenID)
	if err != nil {
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
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCDirectFileTokenCreate(incomingMessage)
	}
	return responseMsg
}
