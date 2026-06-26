package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskCreateSubtaskMessage struct {
	TaskID                  int     `json:"task_id"`
	SubtaskCallbackFunction *string `json:"subtask_callback_function,omitempty"`
	CommandName             string  `json:"command_name"`
	PayloadTypeName         *string `json:"payload_type_name,omitempty"`
	Params                  string  `json:"params"`
	ParameterGroupName      *string `json:"parameter_group_name,omitempty"`
	Token                   *int    `json:"token,omitempty"`
	ResolveTaskReferences   *bool   `json:"resolve_task_references,omitempty"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTaskCreateSubtaskMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	TaskID  int    `json:"task_id"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TASK_CREATE_SUBTASK,    // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TASK_CREATE_SUBTASK,    // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTaskCreateSubtask, // points to function that takes in amqp.Delivery and returns interface{}
		Scopes:     []string{mythicjwt.SCOPE_TASK_WRITE},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskCreateSubtask(input MythicRPCTaskCreateSubtaskMessage, authContext RabbitMQAuthContext) MythicRPCTaskCreateSubtaskMessageResponse {
	response := MythicRPCTaskCreateSubtaskMessageResponse{
		Success: false,
	}
	taskingLocation := "mythic_rpc"
	createTaskInput := CreateTaskInput{
		ParentTaskID:            &input.TaskID,
		CommandName:             input.CommandName,
		PayloadType:             input.PayloadTypeName,
		Params:                  input.Params,
		Token:                   input.Token,
		ParameterGroupName:      input.ParameterGroupName,
		SubtaskCallbackFunction: input.SubtaskCallbackFunction,
		TaskingLocation:         &taskingLocation,
		ResolveTaskReferences:   input.ResolveTaskReferences,
		AuthContext:             authContext,
	}
	task := databaseStructs.Task{}
	operatorOperation := databaseStructs.Operatoroperation{}
	err := database.DB.Get(&task, `SELECT 
	callback.id "callback.id",
	callback.display_id "callback.display_id",
	callback.operation_id "callback.operation_id",
	operator.id "operator.id",
	operator.admin "operator.admin",
	task.apitokens_id,
	task.eventstepinstance_id
	FROM task
	JOIN callback ON task.callback_id = callback.id 
	JOIN operator ON task.operator_id = operator.id
	WHERE task.id=$1 AND task.operation_id=$2`, input.TaskID, authContext.OperationID)
	if err != nil {
		response.Error = err.Error()
		logging.LogError(err, "Failed to fetch task/callback information when creating subtask")
		return response
	}
	err = database.DB.Get(&operatorOperation, `SELECT
	base_disabled_commands_id
	FROM operatoroperation
	WHERE operator_id = $1 AND operation_id = $2
	`, authContext.OperatorID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to get operation information when creating subtask")
		response.Error = err.Error()
		return response
	}
	createTaskInput.IsOperatorAdmin = task.Operator.Admin
	createTaskInput.CallbackDisplayID = task.Callback.DisplayID
	createTaskInput.CurrentOperationID = authContext.OperationID
	if operatorOperation.BaseDisabledCommandsID.Valid {
		baseDisabledCommandsID := int(operatorOperation.BaseDisabledCommandsID.Int64)
		createTaskInput.DisabledCommandID = &baseDisabledCommandsID
	}
	createTaskInput.OperatorID = authContext.OperatorID
	createTaskInput.APITokensID = authContext.APITokensID
	createTaskInput.EventStepInstanceID = authContext.EventStepInstanceID
	// create a subtask of this task
	creationResponse := CreateTask(createTaskInput)
	if creationResponse.Status == "success" {
		response.Success = true
		response.TaskID = creationResponse.TaskID
	} else {
		response.Error = creationResponse.Error
	}
	return response
}
func processMythicRPCTaskCreateSubtask(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskCreateSubtaskMessage{}
	responseMsg := MythicRPCTaskCreateSubtaskMessageResponse{
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
	return MythicRPCTaskCreateSubtask(incomingMessage, authContext)
}
