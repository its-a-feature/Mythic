package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskCreateMessage struct {
	AgentCallbackID       *string `json:"agent_callback_id"`
	CallbackID            *int    `json:"callback_id"`
	CommandName           string  `json:"command_name"`
	PayloadTypeName       *string `json:"payload_type_name"`
	Params                string  `json:"params"`
	ParameterGroupName    *string `json:"parameter_group_name,omitempty"`
	Token                 *int    `json:"token,omitempty"`
	ResolveTaskReferences *bool   `json:"resolve_task_references,omitempty"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTaskCreateMessageResponse struct {
	Success       bool   `json:"success"`
	Error         string `json:"error"`
	TaskID        int    `json:"task_id"`
	TaskDisplayID int    `json:"task_display_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TASK_CREATE,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TASK_CREATE,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTaskCreate, // points to function that takes in amqp.Delivery and returns interface{}
		Scopes:     []string{mythicjwt.SCOPE_TASK_WRITE},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskCreate(input MythicRPCTaskCreateMessage, authContext RabbitMQAuthContext) MythicRPCTaskCreateMessageResponse {
	response := MythicRPCTaskCreateMessageResponse{
		Success: false,
	}
	taskingLocation := "mythic_rpc"
	createTaskInput := CreateTaskInput{
		CommandName:           input.CommandName,
		Params:                input.Params,
		Token:                 input.Token,
		ParameterGroupName:    input.ParameterGroupName,
		TaskingLocation:       &taskingLocation,
		PayloadType:           input.PayloadTypeName,
		ResolveTaskReferences: input.ResolveTaskReferences,
		AuthContext:           authContext,
	}
	createTaskInput.EventStepInstanceID = authContext.EventStepInstanceID
	createTaskInput.APITokensID = authContext.APITokensID
	callback := databaseStructs.Callback{}
	err := database.DB.Get(&callback, `SELECT 
		callback.id, callback.agent_callback_id,
		callback.display_id,
		callback.operation_id
		FROM callback
		WHERE (callback.agent_callback_id=$1 OR callback.id=$2) AND callback.operation_id=$3`,
		input.AgentCallbackID, input.CallbackID, authContext.OperationID)
	if err != nil {
		response.Error = err.Error()
		logging.LogError(err, "Failed to fetch task/callback information when creating subtask")
		return response
	}
	createTaskInput.CallbackDisplayID = callback.DisplayID
	createTaskInput.CurrentOperationID = authContext.OperationID
	createTaskInput.OperatorID = authContext.OperatorID
	createTaskInput.IsOperatorAdmin = false
	err = automatedTaskCreateAugmentInput(&createTaskInput)
	if err != nil {
		response.Error = err.Error()
		return response
	}
	creationResponse := CreateTask(createTaskInput)
	if creationResponse.Status == "success" {
		response.Success = true
		response.TaskID = creationResponse.TaskID
		response.TaskDisplayID = creationResponse.TaskDisplayID
	} else {
		response.Error = creationResponse.Error
	}
	return response
}
func automatedTaskCreateAugmentInput(input *CreateTaskInput) error {
	operatorOperation := databaseStructs.Operatoroperation{}
	err := database.DB.Get(&operatorOperation, `SELECT
	base_disabled_commands_id
	FROM operatoroperation
	WHERE operator_id = $1 AND operation_id = $2
	`, input.OperatorID, input.CurrentOperationID)
	if err != nil {
		logging.LogError(err, "Failed to get operation information when creating subtask")
		return err
	}
	if operatorOperation.BaseDisabledCommandsID.Valid {
		baseDisabledCommandsID := int(operatorOperation.BaseDisabledCommandsID.Int64)
		input.DisabledCommandID = &baseDisabledCommandsID
	}
	return nil
}
func processMythicRPCTaskCreate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskCreateMessage{}
	responseMsg := MythicRPCTaskCreateMessageResponse{
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
	return MythicRPCTaskCreate(incomingMessage, authContext)
}
