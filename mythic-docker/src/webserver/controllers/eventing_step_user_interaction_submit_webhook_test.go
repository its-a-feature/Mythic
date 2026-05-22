package webcontroller

import (
	"testing"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
)

func TestValidateEventingStepUserInteractionResponderBotApprovalRoles(t *testing.T) {
	interactionRow := eventingStepUserInteractionSubmitRow{
		RunOperatorAccountType: databaseStructs.AccountTypeBot,
	}
	operatorOperation := &databaseStructs.Operatoroperation{}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
	err := validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, true, map[string]interface{}{})
	if err == nil {
		t.Fatal("expected spectator to be blocked from default bot approval")
	}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
	err = validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, true, map[string]interface{}{})
	if err != nil {
		t.Fatalf("expected operator to approve default bot approval: %v", err)
	}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_LEAD
	err = validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, true, map[string]interface{}{})
	if err != nil {
		t.Fatalf("expected lead to approve default bot approval: %v", err)
	}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
	err = validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, true, map[string]interface{}{
		"approval_policy": map[string]interface{}{
			"bot_context": map[string]interface{}{
				"approver": eventing.UserInteractionApproverLead,
			},
		},
	})
	if err == nil {
		t.Fatal("expected operator to be blocked from lead-only bot approval")
	}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_LEAD
	err = validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, true, map[string]interface{}{
		"approval_policy": map[string]interface{}{
			"bot_context": map[string]interface{}{
				"approver": eventing.UserInteractionApproverLead,
			},
		},
	})
	if err != nil {
		t.Fatalf("expected lead to approve lead-only bot approval: %v", err)
	}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
	err = validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, false, map[string]interface{}{})
	if err == nil {
		t.Fatal("expected spectator to be blocked from bot input-only interaction")
	}

	operatorOperation.ViewMode = database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR
	err = validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, false, map[string]interface{}{})
	if err != nil {
		t.Fatalf("expected operator to respond to bot input-only interaction: %v", err)
	}
}

func TestValidateEventingStepUserInteractionResponderBlocksSpectatorRunOperator(t *testing.T) {
	interactionRow := eventingStepUserInteractionSubmitRow{
		RunOperatorAccountType: databaseStructs.AccountTypeUser,
		RunOperatorID:          7,
		RunOperatorUsername:    "spectator-user",
	}
	operatorOperation := &databaseStructs.Operatoroperation{
		CurrentOperator: databaseStructs.Operator{
			ID: 7,
		},
		ViewMode: database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR,
	}

	err := validateEventingStepUserInteractionResponder(interactionRow, operatorOperation, true, map[string]interface{}{})
	if err == nil {
		t.Fatal("expected spectator run operator to be blocked from user interaction")
	}
}
