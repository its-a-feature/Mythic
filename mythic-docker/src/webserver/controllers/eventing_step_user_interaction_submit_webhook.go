package webcontroller

import (
	"errors"
	"fmt"
	"net/http"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"

	"github.com/its-a-feature/Mythic/database"
)

type EventingStepUserInteractionSubmitInput struct {
	Input EventingStepUserInteractionSubmitMessage `json:"input" binding:"required"`
}

type EventingStepUserInteractionSubmitMessage struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id" binding:"required"`
	Approved            *bool                  `json:"approved"`
	Inputs              map[string]interface{} `json:"inputs"`
	Comment             string                 `json:"comment"`
}

type EventingStepUserInteractionSubmitMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

type eventingStepUserInteractionSubmitRow struct {
	ID                     int                            `db:"id"`
	Status                 string                         `db:"status"`
	OperationID            int                            `db:"operation_id"`
	EventGroupInstanceID   int                            `db:"eventgroupinstance_id"`
	UserInteraction        databaseStructs.MythicJSONText `db:"user_interaction"`
	RunOperatorID          int                            `db:"run_operator_id"`
	RunOperatorUsername    string                         `db:"run_operator_username"`
	RunOperatorAccountType string                         `db:"run_operator_account_type"`
}

func EventingStepUserInteractionSubmitWebhook(c *gin.Context) {
	var input EventingStepUserInteractionSubmitInput
	response := EventingStepUserInteractionSubmitMessageResponse{}
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		logging.LogError(nil, "Failed to get user information")
		c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{
			Status: "error",
			Error:  "Failed to get user information",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	interactionRow := eventingStepUserInteractionSubmitRow{}
	err = database.DB.Get(&interactionRow, `SELECT
		eventstepinstance.id,
		eventstepinstance.status,
		eventstepinstance.operation_id,
		eventstepinstance.eventgroupinstance_id,
		eventstepinstance.user_interaction,
		eventgroupinstance.operator_id "run_operator_id",
		operator.username "run_operator_username",
		operator.account_type "run_operator_account_type"
		FROM eventstepinstance
		JOIN eventgroupinstance ON eventstepinstance.eventgroupinstance_id = eventgroupinstance.id
		JOIN operator ON eventgroupinstance.operator_id = operator.id
		WHERE eventstepinstance.id=$1 AND eventstepinstance.operation_id=$2`,
		input.Input.EventStepInstanceID, operatorOperation.CurrentOperation.ID)
	if err != nil {
		logging.LogError(err, "failed to get event step instance for user interaction")
		c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = validateEventingStepUserInteractionSubmit(input.Input, interactionRow, operatorOperation)
	if err != nil {
		c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	submittedInputs := normalizeSubmittedUserInteractionInputs(input.Input.Inputs, interactionRow.UserInteraction.StructValue())
	approved := true
	if eventing.UserInteractionApprovalRequired(interactionRow.UserInteraction.StructValue()) && input.Input.Approved != nil {
		approved = *input.Input.Approved
	}
	responseData := map[string]interface{}{
		"approved":        approved,
		"inputs":          submittedInputs,
		"comment":         input.Input.Comment,
		"submitted_by":    operatorOperation.CurrentOperator.Username,
		"submitted_by_id": operatorOperation.CurrentOperator.ID,
		"submitted_at":    time.Now().UTC(),
	}
	if !approved {
		err = resolveEventingStepUserInteraction(interactionRow, responseData, operatorOperation, false)
		if err != nil {
			c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		rabbitmq.EventingChannel <- rabbitmq.EventNotification{
			Trigger:             eventing.TriggerStepUserInteractionSubmit,
			OperationID:         operatorOperation.CurrentOperation.ID,
			OperatorID:          operatorOperation.CurrentOperator.ID,
			EventStepInstanceID: input.Input.EventStepInstanceID,
			ActionSuccess:       false,
			ActionStderr:        fmt.Sprintf("User interaction denied by %s", operatorOperation.CurrentOperator.Username),
			Outputs:             map[string]interface{}{},
		}
		c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{Status: "success"})
		return
	}
	err = resolveEventingStepUserInteraction(interactionRow, responseData, operatorOperation, true)
	if err != nil {
		c.JSON(http.StatusOK, EventingStepUserInteractionSubmitMessageResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	rabbitmq.EventingChannel <- rabbitmq.EventNotification{
		Trigger:             eventing.TriggerStepUserInteractionSubmit,
		OperationID:         operatorOperation.CurrentOperation.ID,
		OperatorID:          operatorOperation.CurrentOperator.ID,
		EventStepInstanceID: input.Input.EventStepInstanceID,
		ActionSuccess:       true,
		Outputs:             map[string]interface{}{},
	}
	response.Status = "success"
	c.JSON(http.StatusOK, response)
}

func validateEventingStepUserInteractionSubmit(input EventingStepUserInteractionSubmitMessage, interactionRow eventingStepUserInteractionSubmitRow, operatorOperation *databaseStructs.Operatoroperation) error {
	if interactionRow.Status != eventing.EventGroupInstanceStatusAwaitingApproval &&
		interactionRow.Status != eventing.EventGroupInstanceStatusInputNeeded {
		return errors.New("step is not waiting for user interaction")
	}
	config := interactionRow.UserInteraction.StructValue()
	approvalRequired := eventing.UserInteractionApprovalRequired(config)
	if err := validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, approvalRequired, config); err != nil {
		return err
	}
	if approvalRequired && input.Approved == nil {
		return errors.New("approval decision is required")
	}
	if !approvalRequired && input.Approved != nil && !*input.Approved {
		return errors.New("approval is not configured for this step")
	}
	if input.Approved != nil && !*input.Approved {
		return nil
	}
	if eventing.UserInteractionInputRequired(config) {
		submittedInputs := normalizeSubmittedUserInteractionInputs(input.Inputs, config)
		for _, field := range eventing.UserInteractionInputs(config) {
			if !eventing.UserInteractionFieldRequired(field) {
				continue
			}
			fieldName := eventing.UserInteractionFieldName(field)
			if fieldName == "" {
				continue
			}
			value, ok := submittedInputs[fieldName]
			if !ok || isEmptyUserInteractionValue(value) {
				return fmt.Errorf("missing required input %s", fieldName)
			}
		}
	}
	return nil
}

func validateEventingStepUserInteractionResponder(interactionRow eventingStepUserInteractionSubmitRow, operatorOperation *databaseStructs.Operatoroperation, approvalRequired bool, config map[string]interface{}) error {
	if operatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR {
		return errors.New("spectators cannot respond to user interaction steps")
	}
	if interactionRow.RunOperatorAccountType != databaseStructs.AccountTypeBot {
		if interactionRow.RunOperatorID != operatorOperation.CurrentOperator.ID {
			return fmt.Errorf("only %s can provide input for this step", interactionRow.RunOperatorUsername)
		}
		return nil
	}
	if !approvalRequired {
		return nil
	}
	switch eventing.UserInteractionBotApprovalApprover(config) {
	case eventing.UserInteractionApproverLead:
		if operatorOperation.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
			return errors.New("only the operation lead can approve this step")
		}
	}
	return nil
}

func isEmptyUserInteractionValue(value interface{}) bool {
	if value == nil {
		return true
	}
	if valueString, ok := value.(string); ok {
		return valueString == ""
	}
	return false
}

func normalizeSubmittedUserInteractionInputs(submittedInputs map[string]interface{}, config map[string]interface{}) map[string]interface{} {
	normalizedInputs := map[string]interface{}{}
	for key, value := range submittedInputs {
		normalizedInputs[key] = value
	}
	for _, field := range eventing.UserInteractionInputs(config) {
		fieldName := eventing.UserInteractionFieldName(field)
		if fieldName == "" {
			continue
		}
		if _, ok := normalizedInputs[fieldName]; ok {
			continue
		}
		if defaultValue, ok := field["default_value"]; ok {
			normalizedInputs[fieldName] = defaultValue
		}
	}
	return normalizedInputs
}

func resolveEventingStepUserInteraction(interactionRow eventingStepUserInteractionSubmitRow, responseData map[string]interface{}, operatorOperation *databaseStructs.Operatoroperation, resumeStep bool) error {
	nextStatus := interactionRow.Status
	if resumeStep {
		nextStatus = eventing.EventGroupInstanceStatusQueued
	}
	result, err := database.DB.Exec(`UPDATE eventstepinstance SET
		user_interaction_response=$1,
		user_interaction_resolved_by=$2,
		user_interaction_resolved_at=$3,
		status=$4
		WHERE id=$5 AND status IN ($6, $7) AND user_interaction_resolved_by IS NULL`,
		eventing.GetMythicJSONTextFromStruct(responseData),
		operatorOperation.CurrentOperator.ID,
		time.Now().UTC(),
		nextStatus,
		interactionRow.ID,
		eventing.EventGroupInstanceStatusAwaitingApproval,
		eventing.EventGroupInstanceStatusInputNeeded)
	if err != nil {
		logging.LogError(err, "failed to resolve event step user interaction")
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		logging.LogError(err, "failed to check event step user interaction update")
		return err
	}
	if rowsAffected == 0 {
		return errors.New("step interaction was already resolved")
	}
	if resumeStep {
		_, err = database.DB.Exec(`UPDATE eventgroupinstance SET status=$1 WHERE id=$2 AND end_timestamp IS NULL`,
			eventing.EventGroupInstanceStatusRunning, interactionRow.EventGroupInstanceID)
		if err != nil {
			logging.LogError(err, "failed to resume event group instance after user interaction")
			return err
		}
	}
	return nil
}
