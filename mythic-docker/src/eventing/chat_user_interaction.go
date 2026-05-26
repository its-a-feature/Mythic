package eventing

import (
	"database/sql"
	"fmt"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

const (
	ChatSpecialTypeEventingUserInteraction = "eventing_user_interaction"
	ChatSpecialSourceEventing              = "eventing"
)

type userInteractionChatSnapshotRow struct {
	EventStepInstanceID       int                            `db:"eventstepinstance_id"`
	EventGroupInstanceID      int                            `db:"eventgroupinstance_id"`
	OperationID               int                            `db:"operation_id"`
	Status                    string                         `db:"status"`
	UserInteraction           databaseStructs.MythicJSONText `db:"user_interaction"`
	UserInteractionResponse   databaseStructs.MythicJSONText `db:"user_interaction_response"`
	UserInteractionResolvedBy sql.NullInt64                  `db:"user_interaction_resolved_by"`
	UserInteractionResolvedAt sql.NullTime                   `db:"user_interaction_resolved_at"`
	UpdatedAt                 time.Time                      `db:"updated_at"`
	EventStepName             string                         `db:"eventstep_name"`
	EventStepAction           string                         `db:"eventstep_action"`
	EventGroupName            string                         `db:"eventgroup_name"`
	RunOperatorID             int                            `db:"run_operator_id"`
	RunOperatorUsername       string                         `db:"run_operator_username"`
	RunOperatorAccountType    string                         `db:"run_operator_account_type"`
	ResolvedByUsername        sql.NullString                 `db:"resolved_by_username"`
}

func ChatEventStepInstanceSourceID(eventStepInstanceID int) string {
	return fmt.Sprintf("eventstepinstance:%d", eventStepInstanceID)
}

func BuildUserInteractionChatMessage(eventStepInstanceID int, operationID int) (string, string, map[string]interface{}, error) {
	row := userInteractionChatSnapshotRow{}
	err := database.DB.Get(&row, `SELECT
		eventstepinstance.id "eventstepinstance_id",
		eventstepinstance.eventgroupinstance_id,
		eventstepinstance.operation_id,
		eventstepinstance.status,
		eventstepinstance.user_interaction,
		eventstepinstance.user_interaction_response,
		eventstepinstance.user_interaction_resolved_by,
		eventstepinstance.user_interaction_resolved_at,
		eventstepinstance.updated_at,
		eventstep.name "eventstep_name",
		eventstep.action "eventstep_action",
		eventgroup.name "eventgroup_name",
		eventgroupinstance.operator_id "run_operator_id",
		run_operator.username "run_operator_username",
		run_operator.account_type "run_operator_account_type",
		resolved_operator.username "resolved_by_username"
		FROM eventstepinstance
		JOIN eventstep ON eventstepinstance.eventstep_id = eventstep.id
		JOIN eventgroupinstance ON eventstepinstance.eventgroupinstance_id = eventgroupinstance.id
		JOIN eventgroup ON eventgroupinstance.eventgroup_id = eventgroup.id
		JOIN operator run_operator ON eventgroupinstance.operator_id = run_operator.id
		LEFT JOIN operator resolved_operator ON eventstepinstance.user_interaction_resolved_by = resolved_operator.id
		WHERE eventstepinstance.id=$1 AND eventstepinstance.operation_id=$2`,
		eventStepInstanceID, operationID)
	if err != nil {
		return "", "", nil, err
	}
	config := row.UserInteraction.StructValue()
	approvalRequired := UserInteractionApprovalRequired(config)
	inputRequired := UserInteractionInputRequired(config)
	inputs := UserInteractionInputs(config)
	inputNames := make([]string, 0, len(inputs))
	requiredInputCount := 0
	for _, input := range inputs {
		if name := UserInteractionFieldName(input); name != "" {
			inputNames = append(inputNames, name)
		}
		if UserInteractionFieldRequired(input) {
			requiredInputCount += 1
		}
	}
	resolved := row.UserInteractionResolvedBy.Valid
	waiting := !resolved && (row.Status == EventGroupInstanceStatusAwaitingApproval || row.Status == EventGroupInstanceStatusInputNeeded)
	snapshot := map[string]interface{}{
		"eventgroupinstance_id":       row.EventGroupInstanceID,
		"eventstepinstance_id":        row.EventStepInstanceID,
		"workflow_name":               row.EventGroupName,
		"step_name":                   row.EventStepName,
		"step_action":                 row.EventStepAction,
		"status":                      row.Status,
		"waiting":                     waiting,
		"resolved":                    resolved,
		"approval_required":           approvalRequired,
		"input_required":              inputRequired,
		"approval_prompt":             stringFromMap(config, "approval_prompt"),
		"input_prompt":                stringFromMap(config, "input_prompt"),
		"input_count":                 len(inputs),
		"required_input_count":        requiredInputCount,
		"input_names":                 inputNames,
		"bot_approval_approver":       UserInteractionBotApprovalApprover(config),
		"run_operator_id":             row.RunOperatorID,
		"run_operator_username":       row.RunOperatorUsername,
		"run_operator_account_type":   row.RunOperatorAccountType,
		"user_interaction_response":   row.UserInteractionResponse.StructValue(),
		"user_interaction_updated_at": row.UpdatedAt.UTC().Format(time.RFC3339),
	}
	if row.ResolvedByUsername.Valid {
		snapshot["resolved_by_username"] = row.ResolvedByUsername.String
	}
	if row.UserInteractionResolvedAt.Valid {
		snapshot["resolved_at"] = row.UserInteractionResolvedAt.Time.UTC().Format(time.RFC3339)
	}
	metadata := map[string]interface{}{
		"special_type":              ChatSpecialTypeEventingUserInteraction,
		"source":                    ChatSpecialSourceEventing,
		"source_id":                 ChatEventStepInstanceSourceID(row.EventStepInstanceID),
		"eventgroupinstance_id":     row.EventGroupInstanceID,
		"eventstepinstance_id":      row.EventStepInstanceID,
		"eventing_user_interaction": snapshot,
		"refreshed_at":              time.Now().UTC().Format(time.RFC3339),
		"refresh":                   map[string]interface{}{"action": "chatRefreshSpecialMessage"},
		"special_message_version":   1,
	}
	message := fmt.Sprintf("Eventing user interaction: %s / %s", row.EventGroupName, row.EventStepName)
	senderDisplayName := fmt.Sprintf("Eventing - %s", row.EventGroupName)
	return message, senderDisplayName, metadata, nil
}

func UpsertUserInteractionChatMessage(eventStepInstanceID int, operationID int) error {
	message, senderDisplayName, metadata, err := BuildUserInteractionChatMessage(eventStepInstanceID, operationID)
	if err != nil {
		return err
	}
	metadataText := GetMythicJSONTextFromStruct(metadata)
	sourceID := ChatEventStepInstanceSourceID(eventStepInstanceID)
	_, err = database.DB.Exec(`INSERT INTO chat_channel
		(operation_id, name, slug, description, channel_type, created_by)
		SELECT id, $2, $2, 'Default operation chat channel', $3, admin_id
		FROM operation
		WHERE id=$1 AND deleted=false
		ON CONFLICT DO NOTHING`,
		operationID,
		"general",
		databaseStructs.ChatChannelTypeStandard)
	if err != nil {
		return err
	}
	result, err := database.DB.Exec(`UPDATE chat_message
		SET sender_display_name=$2, message=$3, metadata=$4::jsonb, status=$5, updated_at=now()
		WHERE id=(
			SELECT id FROM chat_message
			WHERE operation_id=$1
				AND metadata->>'special_type'=$6
				AND metadata->>'source_id'=$7
				AND deleted=false
			ORDER BY id DESC
			LIMIT 1
		)`,
		operationID,
		senderDisplayName,
		message,
		metadataText.String(),
		databaseStructs.ChatMessageStatusComplete,
		ChatSpecialTypeEventingUserInteraction,
		sourceID)
	if err != nil {
		return err
	}
	rowsAffected, err := result.RowsAffected()
	if err != nil {
		return err
	}
	if rowsAffected > 0 {
		return nil
	}
	_, err = database.DB.Exec(`INSERT INTO chat_message
		(operation_id, channel_id, author_type, sender_display_name, message, status, metadata)
		SELECT $1, chat_channel.id, $4, $5, $6, $7, $8::jsonb
		FROM chat_channel
		WHERE chat_channel.operation_id=$1
			AND chat_channel.channel_type=$2
			AND lower(chat_channel.slug)=$3`,
		operationID,
		databaseStructs.ChatChannelTypeStandard,
		"general",
		databaseStructs.ChatMessageAuthorSystem,
		senderDisplayName,
		message,
		databaseStructs.ChatMessageStatusComplete,
		metadataText.String())
	return err
}

func RefreshExistingUserInteractionChatMessage(eventStepInstanceID int, operationID int) error {
	message, senderDisplayName, metadata, err := BuildUserInteractionChatMessage(eventStepInstanceID, operationID)
	if err != nil {
		return err
	}
	metadataText := GetMythicJSONTextFromStruct(metadata)
	_, err = database.DB.Exec(`UPDATE chat_message
		SET sender_display_name=$2, message=$3, metadata=$4::jsonb, status=$5, updated_at=now()
		WHERE operation_id=$1
			AND metadata->>'special_type'=$6
			AND metadata->>'source_id'=$7
			AND deleted=false`,
		operationID,
		senderDisplayName,
		message,
		metadataText.String(),
		databaseStructs.ChatMessageStatusComplete,
		ChatSpecialTypeEventingUserInteraction,
		ChatEventStepInstanceSourceID(eventStepInstanceID))
	return err
}

func stringFromMap(values map[string]interface{}, key string) string {
	if value, ok := values[key].(string); ok {
		return value
	}
	return ""
}
