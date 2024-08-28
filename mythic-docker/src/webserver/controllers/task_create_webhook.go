package webcontroller

import (
	"fmt"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	"net/http"

	"github.com/gin-gonic/gin"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

type CreateTaskInput struct {
	Input CreateTask `json:"input" binding:"required"`
}

type CreateTask struct {
	CallbackDisplayID   *int     `json:"callback_id,omitempty"`
	CallbackDisplayIDs  *[]int   `json:"callback_ids,omitempty"`
	Command             string   `json:"command" binding:"required"`
	Params              string   `json:"params"`
	Files               []string `json:"files"`
	Token               *int     `json:"token_id,omitempty"`
	TaskingLocation     *string  `json:"tasking_location,omitempty"`
	OriginalParams      *string  `json:"original_params,omitempty"`
	ParameterGroupName  *string  `json:"parameter_group_name,omitempty"`
	ParentTaskId        *int     `json:"parent_task_id,omitempty"`
	IsInteractiveTask   bool     `json:"is_interactive_task"`
	InteractiveTaskType *int     `json:"interactive_task_type,omitempty"`
	PayloadType         *string  `json:"payload_type,omitempty"`
	IsAlias             *bool    `json:"is_alias,omitempty"`
}

func CreateTaskWebhook(c *gin.Context) {
	// get variables from the POST request
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	var input CreateTaskInput // we'll fix this after the new stuff comes out to not have the double input
	err = c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, rabbitmq.CreateTaskResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get information about the user and operation that's being tasked
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, rabbitmq.CreateTaskResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	var callbacks []int
	if input.Input.CallbackDisplayIDs != nil {
		callbacks = *input.Input.CallbackDisplayIDs
	} else if input.Input.CallbackDisplayID != nil {
		callbacks = []int{*input.Input.CallbackDisplayID}
	} else {
		logging.LogError(nil, "Must supply callback_display_id or callback_display_ids when creating a task")
		c.JSON(http.StatusOK, UpdateCallbackResponse{
			Status: "error",
			Error:  "Must supply callback_display_id or callback_display_ids when creating a task",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	if len(callbacks) > 1 {
		rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Starting to task %d callbacks with \"%s\"", len(callbacks), input.Input.Command),
			operatorOperation.CurrentOperation.ID, "mass_tasking", database.MESSAGE_LEVEL_INFO)
	}
	createTaskInput := rabbitmq.CreateTaskInput{
		CallbackDisplayID:   callbacks[0],
		CurrentOperationID:  operatorOperation.CurrentOperation.ID,
		OperatorID:          operatorOperation.CurrentOperator.ID,
		IsOperatorAdmin:     operatorOperation.CurrentOperator.Admin,
		CommandName:         input.Input.Command,
		Params:              input.Input.Params,
		TaskingLocation:     input.Input.TaskingLocation,
		OriginalParams:      input.Input.OriginalParams,
		ParameterGroupName:  input.Input.ParameterGroupName,
		FileIDs:             input.Input.Files,
		Token:               input.Input.Token,
		ParentTaskID:        input.Input.ParentTaskId,
		IsInteractiveTask:   input.Input.IsInteractiveTask,
		InteractiveTaskType: input.Input.InteractiveTaskType,
		EventStepInstanceID: claims.EventStepInstanceID,
		PayloadType:         input.Input.PayloadType,
	}
	if operatorOperation.BaseDisabledCommandsID.Valid {
		baseDisabledCommandsId := int(operatorOperation.BaseDisabledCommandsID.Int64)
		createTaskInput.DisabledCommandID = &baseDisabledCommandsId
	}
	logging.LogDebug("got creating tasking from web", "createTasking", createTaskInput)
	c.JSON(http.StatusOK, rabbitmq.CreateTask(createTaskInput))
	if len(callbacks) > 1 {
		go issueMassTasking(input, callbacks[1:], operatorOperation, claims.EventStepInstanceID)
	}
	return

}
func issueMassTasking(input CreateTaskInput, callbacks []int, operatorOperation *databaseStructs.Operatoroperation,
	eventStepInstanceID int) {
	for indx, callbackDisplayID := range callbacks {
		logging.LogInfo("Creating mass tasking", "task num", indx+2, "total tasks", len(callbacks))
		createTaskInput := rabbitmq.CreateTaskInput{
			CallbackDisplayID:   callbackDisplayID,
			CurrentOperationID:  operatorOperation.CurrentOperation.ID,
			OperatorID:          operatorOperation.CurrentOperator.ID,
			IsOperatorAdmin:     operatorOperation.CurrentOperator.Admin,
			CommandName:         input.Input.Command,
			Params:              input.Input.Params,
			TaskingLocation:     input.Input.TaskingLocation,
			OriginalParams:      input.Input.OriginalParams,
			ParameterGroupName:  input.Input.ParameterGroupName,
			FileIDs:             input.Input.Files,
			Token:               input.Input.Token,
			ParentTaskID:        input.Input.ParentTaskId,
			IsInteractiveTask:   input.Input.IsInteractiveTask,
			InteractiveTaskType: input.Input.InteractiveTaskType,
			EventStepInstanceID: eventStepInstanceID,
			PayloadType:         input.Input.PayloadType,
		}
		if operatorOperation.BaseDisabledCommandsID.Valid {
			baseDisabledCommandsId := int(operatorOperation.BaseDisabledCommandsID.Int64)
			createTaskInput.DisabledCommandID = &baseDisabledCommandsId
		}
		logging.LogDebug("got creating tasking from web", "createTasking", createTaskInput)
		rabbitmq.CreateTask(createTaskInput)
	}
	rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Finished tasking %d callbacks with \"%s\"", len(callbacks)+1, input.Input.Command),
		operatorOperation.CurrentOperation.ID, "mass_tasking", database.MESSAGE_LEVEL_INFO)
}
