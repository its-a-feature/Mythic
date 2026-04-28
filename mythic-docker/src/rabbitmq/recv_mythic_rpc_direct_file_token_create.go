package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

const directFileScopedTokenTTL = 30 * time.Second

type MythicRPCDirectFileTokenCreateMessage struct {
	AgentTaskID         *string `json:"agent_task_id"`
	AgentCallbackID     *string `json:"agent_callback_id"`
	PayloadUUID         *string `json:"payload_uuid"`
	FileUUID            string  `json:"agent_file_id"`
	APITokenID          *int    `json:"apitoken_id"`
	EventstepInstanceID *int    `json:"eventstep_instance_id"`
	Action              string  `json:"action"` // upload, download, both
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

func resolveScopedTokenOperatorAndOperation(input MythicRPCDirectFileTokenCreateMessage) (int, int, error) {
	if input.AgentTaskID != nil {
		task := databaseStructs.Task{}
		if err := database.DB.Get(&task, `SELECT operator_id, operation_id FROM task WHERE agent_task_id=$1`,
			*input.AgentTaskID); err != nil {
			return 0, 0, err
		}
		return task.OperatorID, task.OperationID, nil
	}
	if input.PayloadUUID != nil {
		payload := databaseStructs.Payload{}
		if err := database.DB.Get(&payload, `SELECT operator_id, operation_id FROM payload WHERE uuid=$1`,
			*input.PayloadUUID); err != nil {
			return 0, 0, err
		}
		return payload.OperatorID, payload.OperationID, nil
	}
	if input.AgentCallbackID != nil {
		callback := databaseStructs.Callback{}
		if err := database.DB.Get(&callback, `SELECT operation_id FROM callback WHERE agent_callback_id=$1`,
			*input.AgentCallbackID); err != nil {
			return 0, 0, err
		}
		operatorOperationData := []databaseStructs.Operatoroperation{}
		if err := database.DB.Select(&operatorOperationData, `SELECT 
    		operator.account_type "operator.account_type",
    		operator.id "operator.id",
    		operator.deleted "operator.deleted",
    		operator.active "operator.active"
			FROM operatoroperation
			JOIN operator ON operatoroperation.operator_id = operator.id
			WHERE operatoroperation.operation_id=$1`, callback.OperationID); err != nil {
			return 0, 0, err
		}
		for i := range operatorOperationData {
			if operatorOperationData[i].CurrentOperator.AccountType == databaseStructs.AccountTypeBot &&
				!operatorOperationData[i].CurrentOperator.Deleted &&
				operatorOperationData[i].CurrentOperator.Active {
				return operatorOperationData[i].CurrentOperator.ID, callback.OperationID, nil
			}
		}
		return 0, 0, fmt.Errorf("need an active non-deleted bot account assigned to operation %d", callback.OperationID)
	}
	return 0, 0, fmt.Errorf("no operator/task/callback/payload information provided")
}

func MythicRPCDirectFileTokenCreate(input MythicRPCDirectFileTokenCreateMessage) MythicRPCDirectFileTokenCreateMessageResponse {
	response := MythicRPCDirectFileTokenCreateMessageResponse{Success: false}
	if input.FileUUID == "" {
		response.Error = "file_uuid is required"
		return response
	}
	operatorID, operationID, err := resolveScopedTokenOperatorAndOperation(input)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	user := databaseStructs.Operator{
		ID: operatorID,
		CurrentOperationID: sql.NullInt64{
			Valid: true,
			Int64: int64(operationID),
		},
	}
	eventstepInstanceID := 0
	if input.EventstepInstanceID != nil {
		eventstepInstanceID = *input.EventstepInstanceID
	}
	apitokenID := 0
	if input.APITokenID != nil {
		apitokenID = *input.APITokenID
	}
	scope := mythicjwt.SCOPE_FILE_READ
	if input.Action == "upload" {
		scope = mythicjwt.SCOPE_FILE_WRITE
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
