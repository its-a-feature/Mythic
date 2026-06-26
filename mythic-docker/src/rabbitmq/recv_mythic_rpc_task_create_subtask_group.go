package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskCreateSubtaskGroupMessage struct {
	TaskID                int                                    `json:"task_id"`    // required
	GroupName             string                                 `json:"group_name"` // required
	GroupCallbackFunction *string                                `json:"group_callback_function,omitempty"`
	Tasks                 []MythicRPCTaskCreateSubtaskGroupTasks `json:"tasks"` // required

}

type MythicRPCTaskCreateSubtaskGroupTasks struct {
	SubtaskCallbackFunction *string `json:"subtask_callback_function,omitempty"`
	PayloadTypeName         *string `json:"payload_type_name,omitempty"`
	CommandName             string  `json:"command_name"` // required
	Params                  string  `json:"params"`       // required
	ParameterGroupName      *string `json:"parameter_group_name,omitempty"`
	Token                   *int    `json:"token,omitempty"`
	ResolveTaskReferences   *bool   `json:"resolve_task_references,omitempty"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTaskCreateSubtaskGroupMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
	TaskIDs []int  `json:"task_ids"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TASK_CREATE_SUBTASK_GROUP,   // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TASK_CREATE_SUBTASK_GROUP,   // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTaskCreateSubtaskGroup, // points to function that takes in amqp.Delivery and returns interface{}
		Scopes:     []string{mythicjwt.SCOPE_TASK_WRITE},
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskCreateSubtaskGroup(input MythicRPCTaskCreateSubtaskGroupMessage, authContext RabbitMQAuthContext) MythicRPCTaskCreateSubtaskGroupMessageResponse {
	response := MythicRPCTaskCreateSubtaskGroupMessageResponse{
		Success: false,
	}
	createdSubTasks := []int{}
	parentTask := databaseStructs.Task{}
	taskingLocation := "mythic_rpc"
	operatorOperation := databaseStructs.Operatoroperation{}
	err := database.DB.Get(&parentTask, `SELECT 
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
	for _, task := range input.Tasks {
		createTaskInput := CreateTaskInput{
			ParentTaskID:            &input.TaskID,
			CommandName:             task.CommandName,
			PayloadType:             task.PayloadTypeName,
			Params:                  task.Params,
			Token:                   task.Token,
			ParameterGroupName:      task.ParameterGroupName,
			SubtaskCallbackFunction: task.SubtaskCallbackFunction,
			GroupName:               &input.GroupName,
			GroupCallbackFunction:   input.GroupCallbackFunction,
			IsOperatorAdmin:         parentTask.Operator.Admin,
			CallbackDisplayID:       parentTask.Callback.DisplayID,
			CurrentOperationID:      authContext.OperationID,
			OperatorID:              authContext.OperatorID,
			TaskingLocation:         &taskingLocation,
			ResolveTaskReferences:   task.ResolveTaskReferences,
			AuthContext:             authContext,
		}
		createTaskInput.APITokensID = authContext.APITokensID
		createTaskInput.EventStepInstanceID = authContext.EventStepInstanceID
		if operatorOperation.BaseDisabledCommandsID.Valid {
			baseDisabledCommandsID := int(operatorOperation.BaseDisabledCommandsID.Int64)
			createTaskInput.DisabledCommandID = &baseDisabledCommandsID
		}
		// create a subtask of this task
		creationResponse := CreateTask(createTaskInput)
		if creationResponse.Status == "success" {
			createdSubTasks = append(createdSubTasks, creationResponse.TaskID)
		} else {
			response.Error = creationResponse.Error
			return response
		}
	}
	response.Success = true
	response.TaskIDs = createdSubTasks
	return response
}
func processMythicRPCTaskCreateSubtaskGroup(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskCreateSubtaskGroupMessage{}
	responseMsg := MythicRPCTaskCreateSubtaskGroupMessageResponse{
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
	return MythicRPCTaskCreateSubtaskGroup(incomingMessage, authContext)
}
