package webcontroller

import (
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
	CallbackDisplayID  int      `json:"callback_id" binding:"required"`
	Command            string   `json:"command" binding:"required"`
	Params             string   `json:"params"`
	Files              []string `json:"files"`
	Token              *int     `json:"token_id,omitempty"`
	TaskingLocation    *string  `json:"tasking_location,omitempty"`
	OriginalParams     *string  `json:"original_params,omitempty"`
	ParameterGroupName *string  `json:"parameter_group_name,omitempty"`
}

func CreateTaskWebhook(c *gin.Context) {
	// get variables from the POST request
	var input CreateTaskInput // we'll fix this after the new stuff comes out to not have the double input
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, rabbitmq.CreateTaskResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get information about the user and operation that's being tasked
	if ginOperatorOperation, ok := c.Get("operatorOperation"); !ok {
		c.JSON(http.StatusOK, rabbitmq.CreateTaskResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	} else {

		operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
		createTaskInput := rabbitmq.CreateTaskInput{
			CallbackDisplayID:  input.Input.CallbackDisplayID,
			CurrentOperationID: operatorOperation.CurrentOperation.ID,
			OperatorID:         operatorOperation.CurrentOperator.ID,
			IsOperatorAdmin:    operatorOperation.CurrentOperator.Admin,
			CommandName:        input.Input.Command,
			Params:             input.Input.Params,
			TaskingLocation:    input.Input.TaskingLocation,
			OriginalParams:     input.Input.OriginalParams,
			ParameterGroupName: input.Input.ParameterGroupName,
			FileIDs:            input.Input.Files,
			Token:              input.Input.Token,
		}
		if operatorOperation.BaseDisabledCommandsID.Valid {
			baseDisabledCommandsId := int(operatorOperation.BaseDisabledCommandsID.Int64)
			createTaskInput.DisabledCommandID = &baseDisabledCommandsId
		}
		logging.LogDebug("got creating tasking from web", "createTasking", createTaskInput)
		c.JSON(http.StatusOK, rabbitmq.CreateTask(createTaskInput))
		return
	}
}
