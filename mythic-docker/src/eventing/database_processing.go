package eventing

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"slices"
	"time"
)

var (
	EventGroupInstanceStatusRunning   = "running"
	EventGroupInstanceStatusCancelled = "cancelled"
	EventGroupInstanceStatusSuccess   = "success"
	EventGroupInstanceStatusError     = "error"
	EventGroupInstanceStatusQueued    = "queued"
	EventGroupInstanceStatusSkipped   = "skipped"
)

func SaveEventGroup(eventGroup *databaseStructs.EventGroup, currentOperatorOperation *databaseStructs.Operatoroperation) error {
	eventGroup.OperatorID = currentOperatorOperation.CurrentOperator.ID
	eventGroup.OperationID = currentOperatorOperation.CurrentOperation.ID
	eventGroup.TotalSteps = len(eventGroup.Steps)
	highestOrder := 0
	for i, _ := range eventGroup.Steps {
		if eventGroup.Steps[i].Order > highestOrder {
			highestOrder = eventGroup.Steps[i].Order
		}
	}
	eventGroup.TotalOrderSteps = highestOrder
	statement, err := database.DB.PrepareNamed(`INSERT INTO eventgroup 
			(operator_id, operation_id, filemeta_id, "name", description, trigger, trigger_data, active, deleted, environment, keywords, total_steps, total_order_steps, run_as)
			VALUES (:operator_id, :operation_id, :filemeta_id, :name, :description, :trigger, :trigger_data, :active, :deleted, :environment, :keywords, :total_steps, :total_order_steps, :run_as)
			RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create statement for saving eventgroup")
		return err
	}
	err = statement.Get(&eventGroup.ID, eventGroup)
	if err != nil {
		logging.LogError(err, "Failed to save eventgroup to database")
		return err
	}
	switch eventGroup.RunAs {
	case RunAsEventGroupCreator:
		err = CreateEventGroupApprovalEntry(currentOperatorOperation.CurrentOperator.ID,
			currentOperatorOperation.CurrentOperation.ID, eventGroup.ID, true)
		if err != nil {
			logging.LogError(err, "Failed to save eventgroupapproval to database")
			return err
		}
		_, err = database.DB.Exec(`UPDATE eventgroup SET approved_to_run = true WHERE id = $1`, eventGroup.ID)
		if err != nil {
			logging.LogError(err, "Failed to set eventgroup as approved to run")
			return err
		}
	case RunAsEventGroupTrigger:
		operationMembers := []databaseStructs.Operatoroperation{}
		err = database.DB.Select(&operationMembers, `SELECT
			operator_id
			FROM operatoroperation WHERE operation_id=$1`, currentOperatorOperation.CurrentOperation.ID)
		if err != nil {
			logging.LogError(err, "Failed to get current operators")
			return err
		}
		for _, operationMember := range operationMembers {
			err = CreateEventGroupApprovalEntry(operationMember.OperatorID,
				currentOperatorOperation.CurrentOperation.ID, eventGroup.ID, false)
			if err != nil {
				logging.LogError(err, "Failed to save eventgroupapproval to database")
				return err
			}
		}
	case RunAsOperationBot:
		fallthrough
	case RunAsOperationAdmin:
		err = CreateEventGroupApprovalEntry(currentOperatorOperation.CurrentOperation.AdminID,
			currentOperatorOperation.CurrentOperation.ID, eventGroup.ID,
			currentOperatorOperation.CurrentOperation.AdminID == currentOperatorOperation.CurrentOperator.ID)
		if err != nil {
			logging.LogError(err, "Failed to save eventgroupapproval to database")
			return err
		}
		if currentOperatorOperation.CurrentOperation.AdminID == currentOperatorOperation.CurrentOperator.ID {
			_, err = database.DB.Exec(`UPDATE eventgroup SET approved_to_run = true WHERE id = $1`, eventGroup.ID)
			if err != nil {
				logging.LogError(err, "Failed to set eventgroup as approved to run")
				return err
			}
		}
	default:
		// if it wasn't any of those use cases, then a specific operator was called out as execution
		targetOperator := databaseStructs.Operator{}
		err = database.DB.Get(&targetOperator, `SELECT id, account_type FROM operator WHERE "username"=$1`, eventGroup.RunAs)
		if err != nil {
			logging.LogError(err, "Failed to get target operator")
			return errors.New("failed to find target operator")
		}
		if targetOperator.AccountType == databaseStructs.AccountTypeBot {
			err = CreateEventGroupApprovalEntry(currentOperatorOperation.CurrentOperation.AdminID,
				currentOperatorOperation.CurrentOperation.ID, eventGroup.ID, false)
			if err != nil {
				logging.LogError(err, "Failed to save eventgroupapproval to database")
				return err
			}
		} else {
			err = CreateEventGroupApprovalEntry(targetOperator.ID,
				currentOperatorOperation.CurrentOperation.ID, eventGroup.ID, false)
			if err != nil {
				logging.LogError(err, "Failed to save eventgroupapproval to database")
				return err
			}
		}
	}
	for i, _ := range eventGroup.Steps {
		eventGroup.Steps[i].OperationID = currentOperatorOperation.CurrentOperation.ID
		eventGroup.Steps[i].EventGroup = eventGroup.ID
		eventGroup.Steps[i].OperatorID = currentOperatorOperation.CurrentOperator.ID
		statement, err = database.DB.PrepareNamed(`INSERT INTO eventstep 
			(operator_id, operation_id, "name", description, eventgroup_id, environment, depends_on, action, action_data, inputs, outputs, "order", continue_on_error)
			VALUES (:operator_id, :operation_id,:name, :description, :eventgroup_id, :environment, :depends_on, :action, :action_data, :inputs, :outputs, :order, :continue_on_error )
			RETURNING id`)
		if err != nil {
			logging.LogError(err, "Failed to create statement for saving eventstep")
			return err
		}
		err = statement.Get(&eventGroup.Steps[i].ID, eventGroup.Steps[i])
		if err != nil {
			logging.LogError(err, "Failed to save event step to database")
			return err
		}
	}
	ProcessEventGroupConsumingContainersByEventGroup(eventGroup.ID)
	return nil
}
func CreateEventGroupApprovalEntry(operatorId int, operationId int, eventgroupId int, approved bool) error {
	_, err := database.DB.Exec(`INSERT INTO eventgroupapproval
		(operator_id, operation_id, eventgroup_id, approved) VALUES ($1, $2, $3, $4)`,
		operatorId, operationId, eventgroupId, approved)
	if err != nil {
		logging.LogError(err, "Failed to save eventgroupapproval to database")
	}
	return err
}
func getTriggerData(triggerMetadata map[string]interface{}) map[string]interface{} {
	triggerData := make(map[string]interface{})
	for key, value := range triggerMetadata {
		switch key {
		case "payload_id":
			payload := databaseStructs.Payload{}
			err := database.DB.Get(&payload, `SELECT * FROM payload WHERE id=$1`, value)
			if err != nil {
				logging.LogError(err, "Failed to get payload")
				return triggerData
			}
			triggerBytes, err := json.Marshal(payload)
			if err != nil {
				logging.LogError(err, "failed to marshal payload into bytes for saving trigger metadata")
				return triggerData
			}
			err = json.Unmarshal(triggerBytes, &triggerData)
			if err != nil {
				logging.LogError(err, "failed to decode payload into struct")
			}
		case "callback_id":
			payload := databaseStructs.Callback{}
			err := database.DB.Get(&payload, `SELECT * FROM callback WHERE id=$1`, value)
			if err != nil {
				logging.LogError(err, "Failed to get callback")
				return triggerData
			}
			triggerBytes, err := json.Marshal(payload)
			if err != nil {
				logging.LogError(err, "failed to marshal callback into bytes for saving trigger metadata")
				return triggerData
			}
			err = json.Unmarshal(triggerBytes, &triggerData)
			if err != nil {
				logging.LogError(err, "failed to decode callback into struct")
			}
		case "task_id":
			payload := databaseStructs.Task{}
			err := database.DB.Get(&payload, `SELECT * FROM task WHERE id=$1`, value)
			if err != nil {
				logging.LogError(err, "Failed to get task")
				return triggerData
			}
			triggerBytes, err := json.Marshal(payload)
			if err != nil {
				logging.LogError(err, "failed to marshal task into bytes for saving trigger metadata")
				return triggerData
			}
			err = json.Unmarshal(triggerBytes, &triggerData)
			if err != nil {
				logging.LogError(err, "failed to decode task into struct")
			}
		case "filemeta_id":
			payload := databaseStructs.Filemeta{}
			err := database.DB.Get(&payload, `SELECT * FROM filemeta WHERE id=$1`, value)
			if err != nil {
				logging.LogError(err, "Failed to get filemeta")
				return triggerData
			}
			triggerBytes, err := json.Marshal(payload)
			if err != nil {
				logging.LogError(err, "failed to marshal filemeta into bytes for saving trigger metadata")
				return triggerData
			}
			err = json.Unmarshal(triggerBytes, &triggerData)
			if err != nil {
				logging.LogError(err, "failed to decode filemeta into struct")
			}
		case "eventstepinstance_id":
			payload := databaseStructs.EventStepInstance{}
			err := database.DB.Get(&payload, `SELECT * FROM eventstepinstance WHERE id=$1`, value)
			if err != nil {
				logging.LogError(err, "Failed to get eventstepinstance")
				return triggerData
			}
			triggerBytes, err := json.Marshal(payload)
			if err != nil {
				logging.LogError(err, "failed to marshal eventstepinstance into bytes for saving trigger metadata")
				return triggerData
			}
			err = json.Unmarshal(triggerBytes, &triggerData)
			if err != nil {
				logging.LogError(err, "failed to decode eventstepinstance into struct")
			}
		case "keyword_env_data":
			for envKey, envVal := range triggerMetadata["keyword_env_data"].(map[string]interface{}) {
				triggerData[envKey] = envVal
			}
		case "tag_id":
			tag := databaseStructs.Tag{}
			err := database.DB.Get(&tag, `SELECT 
				tag.id, tag.url, tag.data, tag.source, tag.taskartifact_id, tag.mythictree_id, tag.credential_id,
				tag.response_id, tag.filemeta_id, tag.task_id, tag.keylog_id, tag.operation_id,
				tagtype.id "tagtype.id",
				tagtype.name "tagtype.name",
				tagtype.color "tagtype.color",
				tagtype.description "tagtype.description",
				tagtype.operation_id "tagtype.operation_id"
				FROM tag 
				JOIN tagtype on tag.tagtype_id = tagtype.id
				WHERE tag.id=$1`, value)
			if err != nil {
				logging.LogError(err, "Failed to get trigger data for tag")
				return triggerData
			}
			triggerData["id"] = tag.ID
			triggerData["url"] = tag.URL
			triggerData["data"] = tag.Data
			triggerData["source"] = tag.Source
			triggerData["operation_id"] = tag.Operation
			triggerData["taskartifact_id"] = tag.TaskArtifact.Int64
			triggerData["mythictree_id"] = tag.MythicTree.Int64
			triggerData["credential_id"] = tag.Credential.Int64
			triggerData["response_id"] = tag.Response.Int64
			triggerData["filemeta_id"] = tag.FileMeta.Int64
			triggerData["task_id"] = tag.Task.Int64
			triggerData["keylog_id"] = tag.Keylog.Int64
			triggerData["tagtype"] = map[string]interface{}{
				"id":           tag.TagType.ID,
				"name":         tag.TagType.Name,
				"color":        tag.TagType.Color,
				"description":  tag.TagType.Description,
				"operation_id": tag.TagType.Operation,
			}
		default:
			triggerData[key] = value
		}
	}
	return triggerData
}
func CreateEventGroupInstance(eventGroupId int, trigger string, triggeringOperatorId int, triggerMetadata map[string]interface{}) (int, error) {
	eventGroup := databaseStructs.EventGroup{ID: eventGroupId}
	err := database.DB.Get(&eventGroup, `SELECT * FROM eventgroup WHERE id = $1`, eventGroupId)
	if err != nil {
		logging.LogError(err, "Failed to get event group information")
		return 0, err
	}
	if eventGroup.Deleted {
		return 0, errors.New(fmt.Sprintf("event group \"%s\" is deleted and will not be triggered", eventGroup.Name))
	}
	if !eventGroup.Active {
		return 0, errors.New(fmt.Sprintf("event group \"%s\" is deactivated and will not be triggered", eventGroup.Name))
	}
	if trigger != TriggerKeyword {
		if eventGroup.Trigger != trigger {
			return 0, errors.New(fmt.Sprintf("event group \"%s\" doesn't have \"%s\" as a trigger", eventGroup.Name, trigger))
		}
	} else {
		keyword := triggerMetadata["keyword"].(string)
		if !slices.Contains(eventGroup.Keywords.StructStringValue(), keyword) {
			return 0, errors.New(fmt.Sprintf("event group \"%s\" doesn't have keyword \"%s\" as a trigger", eventGroup.Name, keyword))
		}
	}

	eventGroupInstance := databaseStructs.EventGroupInstance{
		EventGroupID:    eventGroupId,
		OperatorID:      triggeringOperatorId,
		Status:          EventGroupInstanceStatusRunning,
		Trigger:         trigger,
		Environment:     eventGroup.Environment,
		TotalOrderSteps: eventGroup.TotalOrderSteps,
		OperationID:     eventGroup.OperationID,
		TriggerMetadata: GetMythicJSONTextFromStruct(triggerMetadata),
	}
	eventGroupEnvironment := eventGroup.Environment.StructValue()
	triggeringData := getTriggerData(triggerMetadata)
	for key, value := range triggeringData {
		eventGroupEnvironment[key] = value
	}
	eventGroupInstance.Environment = GetMythicJSONTextFromStruct(eventGroupEnvironment)
	approvals := []databaseStructs.EventGroupApproval{}
	err = database.DB.Select(&approvals, `SELECT * FROM eventgroupapproval WHERE eventgroup_id=$1`, eventGroup.ID)
	if err != nil {
		logging.LogError(err, "Failed to get event group approvals")
		return 0, errors.New(fmt.Sprintf("Failed to get event group approvals for\"%s\"", eventGroup.Name))
	}
	operationOperators := []databaseStructs.Operatoroperation{}
	err = database.DB.Select(&operationOperators, `SELECT 
    	operatoroperation.*,
    	operator.account_type "operator.account_type",
    	operator.id "operator.id",
    	operator.active "operator.active",
    	operator.deleted "operator.deleted",
    	operator.username "operator.username"
		FROM operatoroperation 
		JOIN operator ON operatoroperation.operator_id = operator.id
		WHERE operatoroperation.operation_id=$1`, eventGroup.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to get operation operators")
		return 0, err
	}
	// some triggers won't have a valid operator associated with them (mythic start, cron, etc)
	// in these cases, treat the operator as the bot account
	if triggeringOperatorId == 0 && eventGroup.RunAs == RunAsEventGroupTrigger {
		eventGroup.RunAs = RunAsOperationBot
	}
	switch eventGroup.RunAs {
	case RunAsEventGroupCreator:
		eventGroupInstance.OperatorID = eventGroup.OperatorID
	case RunAsOperationAdmin:
		adminId := 0
		adminUsername := ""
		for i := range operationOperators {
			if operationOperators[i].ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
				if !operationOperators[i].CurrentOperator.Active {
					return 0, errors.New("operation lead is deactivated")
				}
				if operationOperators[i].CurrentOperator.Deleted {
					return 0, errors.New("operation lead is deleted")
				}
				adminId = operationOperators[i].OperatorID
				adminUsername = operationOperators[i].CurrentOperator.Username
			}
		}
		adminApproved := false
		for i := range approvals {
			if approvals[i].OperatorID == adminId && approvals[i].Approved {
				adminApproved = true
			}
		}
		if !adminApproved {
			logging.LogError(nil, "operation lead never approved")
			return 0, errors.New(fmt.Sprintf("operation lead, %s, never approved \"%s\"", adminUsername, eventGroup.Name))
		}
		eventGroupInstance.OperatorID = adminId
	case RunAsOperationBot:
		adminId := 0
		adminUsername := ""
		botId := 0
		for i := range operationOperators {
			if operationOperators[i].ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
				if !operationOperators[i].CurrentOperator.Active {
					return 0, errors.New(fmt.Sprintf("operation lead %s is deactivated", operationOperators[i].CurrentOperator.Username))
				}
				if operationOperators[i].CurrentOperator.Deleted {
					return 0, errors.New(fmt.Sprintf("operation lead %s is deleted", operationOperators[i].CurrentOperator.Username))
				}
				adminId = operationOperators[i].OperatorID
				adminUsername = operationOperators[i].CurrentOperator.Username
			}
			if botId == 0 && operationOperators[i].CurrentOperator.AccountType == databaseStructs.AccountTypeBot {
				if !operationOperators[i].CurrentOperator.Active {
					continue
				}
				if operationOperators[i].CurrentOperator.Deleted {
					continue
				}
				botId = operationOperators[i].OperatorID
			}
		}
		adminApproved := false
		for i := range approvals {
			if approvals[i].OperatorID == adminId && approvals[i].Approved {
				adminApproved = true
			}
		}
		if !adminApproved {
			logging.LogError(nil, "operation lead never approved")
			return 0, errors.New(fmt.Sprintf("operation lead, %s, never approved \"%s\"", adminUsername, eventGroup.Name))
		}
		if botId == 0 {
			logging.LogError(nil, "no bot assigned to the operation that is active and not deleted")
			return 0, errors.New(fmt.Sprintf("no bot assigned to the operation that is active and not deleted, not running \"%s\"", eventGroup.Name))
		}
		eventGroupInstance.OperatorID = botId
	case RunAsEventGroupTrigger:
		triggerOperatorApproved := false
		triggerOperatorUsername := ""
		for i := range operationOperators {
			if operationOperators[i].CurrentOperator.ID == triggeringOperatorId {
				triggerOperatorUsername = operationOperators[i].CurrentOperator.Username
			}
		}
		for i := range approvals {
			if approvals[i].OperatorID == triggeringOperatorId && approvals[i].Approved {
				triggerOperatorApproved = true
			}
		}
		if !triggerOperatorApproved {
			logging.LogError(nil, "triggering operator never approved")
			return 0, errors.New(fmt.Sprintf("triggering operator, %s, never approved \"%s\"", triggerOperatorUsername, eventGroup.Name))
		}
		eventGroupInstance.OperatorID = triggeringOperatorId
	default:
		// this default case is running as a very specific user
		targetUserID := 0
		targetUserIsBot := false
		adminId := 0
		for i := range operationOperators {
			if operationOperators[i].CurrentOperator.Username == eventGroup.RunAs {
				if !operationOperators[i].CurrentOperator.Active {
					return 0, errors.New(fmt.Sprintf("target user, %s, is deactivated for workflow \"%s\"",
						operationOperators[i].CurrentOperator.Username, eventGroup.Name))
				}
				if operationOperators[i].CurrentOperator.Deleted {
					return 0, errors.New(fmt.Sprintf("target user, %s, is deleted for workflow \"%s\"",
						operationOperators[i].CurrentOperator.Username, eventGroup.Name))
				}
				if operationOperators[i].CurrentOperator.AccountType == databaseStructs.AccountTypeBot {
					targetUserIsBot = true
				}
				targetUserID = operationOperators[i].OperatorID
			}
			if operationOperators[i].ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
				adminId = operationOperators[i].OperatorID
			}
		}
		targetUserApproved := false
		for i := range approvals {
			if approvals[i].OperatorID == targetUserID && approvals[i].Approved {
				targetUserApproved = true
			}
			if targetUserIsBot && approvals[i].OperatorID == adminId && approvals[i].Approved {
				targetUserApproved = true
			}
		}
		if !targetUserApproved {
			logging.LogError(nil, "target user never approved or admin never approved for bot")
			return 0, errors.New(fmt.Sprintf("target user, %s, never approved \"%s\"", eventGroup.RunAs, eventGroup.Name))
		}
		eventGroupInstance.OperatorID = targetUserID
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO eventgroupinstance 
			(eventgroup_id, operator_id, operation_id, environment, status, trigger, total_order_steps, trigger_metadata) 
			VALUES (:eventgroup_id, :operator_id, :operation_id, :environment, :status, :trigger, :total_order_steps, :trigger_metadata) 
			RETURNING id`,
	)
	if err != nil {
		logging.LogError(err, "Failed to create new eventGroupInstance statement")
		return 0, err
	}
	err = statement.Get(&eventGroupInstance.ID, eventGroupInstance)
	if err != nil {
		logging.LogError(err, "Failed to create new eventGroupInstance")
		return 0, err
	}
	eventGroupSteps := []databaseStructs.EventStep{}
	err = database.DB.Select(&eventGroupSteps, "SELECT * FROM eventstep WHERE eventgroup_id = $1", eventGroupId)
	if err != nil {
		logging.LogError(err, "Failed to get event group steps")
		return 0, err
	}
	for i, _ := range eventGroupSteps {
		eventStepInstance := databaseStructs.EventStepInstance{
			EventGroupInstanceID: eventGroupInstance.ID,
			OperatorID:           eventGroupInstance.OperatorID,
			OperationID:          eventGroupInstance.OperationID,
			EventStepID:          eventGroupSteps[i].ID,
			Inputs:               eventGroupSteps[i].Inputs,
			Outputs:              eventGroupSteps[i].Outputs,
			Status:               EventGroupInstanceStatusQueued,
			Order:                eventGroupSteps[i].Order,
			ContinueOnError:      eventGroupSteps[i].ContinueOnError,
		}
		// combine the global event group environment with the step environment, step taking precedence
		eventGroupEnv := eventGroupInstance.Environment.StructValue()
		stepEnv := eventGroupSteps[i].Environment.StructValue()
		for k, v := range stepEnv {
			eventGroupEnv[k] = v
		}
		eventStepInstance.Environment = GetMythicJSONTextFromStruct(eventGroupEnv)
		_, err = database.DB.NamedExec(`INSERT INTO eventstepinstance
		(eventgroupinstance_id, operator_id, operation_id, eventstep_id, inputs, outputs, status, "order", environment, continue_on_error)
		VALUES (:eventgroupinstance_id, :operator_id, :operation_id, :eventstep_id, :inputs, :outputs, :status, :order, :environment, :continue_on_error)`,
			eventStepInstance)
		if err != nil {
			logging.LogError(err, "Failed to create new eventStepInstance")
			return 0, err
		}
	}
	return eventGroupInstance.ID, nil
}
func CancelEventGroupInstance(eventGroupInstanceId int, triggeringOperatorId int) error {
	eventGroupInstance := databaseStructs.EventGroupInstance{ID: eventGroupInstanceId}
	err := database.DB.Get(&eventGroupInstance, `SELECT * FROM eventgroupinstance WHERE id = $1`, eventGroupInstanceId)
	if err != nil {
		logging.LogError(err, "Failed to get event group information")
		return err
	}
	operatorOperation := databaseStructs.Operatoroperation{}
	err = database.DB.Get(&operatorOperation, `SELECT * FROM operatoroperation WHERE
                                    operator_id = $1 AND operation_id = $2`, triggeringOperatorId, eventGroupInstance.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to get operator operation information")
		return errors.New(fmt.Sprintf("Failed to get information about operator's role in operation"))
	}
	if operatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR {
		return errors.New("spectators can't cancel workflows")
	}
	eventGroupInstance.Status = EventGroupInstanceStatusCancelled
	eventGroupInstance.CancelledBy = sql.NullInt64{Valid: true, Int64: int64(triggeringOperatorId)}
	eventGroupInstance.EndTimestamp.Time = time.Now().UTC()
	eventGroupInstance.EndTimestamp.Valid = true
	_, err = database.DB.NamedExec(`UPDATE eventgroupinstance SET 
                              status=:status, cancelled_by=:cancelled_by, end_timestamp=:end_timestamp
			WHERE id=:id`, eventGroupInstance)
	if err != nil {
		logging.LogError(err, "failed to update eventgroupinstance")
		return err
	}
	err = updateAllRemainingStepInstances(eventGroupInstance.ID, EventGroupInstanceStatusCancelled)
	return err
}
func updateAllRemainingStepInstances(eventGroupInstanceId int, status string) error {
	eventStepInstances := []databaseStructs.EventStepInstance{}
	err := database.DB.Select(&eventStepInstances, `SELECT * FROM eventstepinstance
		WHERE eventgroupinstance_id = $1`, eventGroupInstanceId)
	if err != nil {
		logging.LogError(err, "failed to get event step instances")
		return err
	}
	for i, _ := range eventStepInstances {
		if eventStepInstances[i].Status == EventGroupInstanceStatusQueued || eventStepInstances[i].Status == EventGroupInstanceStatusRunning {
			eventStepInstances[i].Status = status
			eventStepInstances[i].EndTimestamp.Time = time.Now().UTC()
			eventStepInstances[i].EndTimestamp.Valid = true
			_, err = database.DB.NamedExec(`UPDATE eventstepinstance SET 
                             status=:status, end_timestamp=:end_timestamp 
                         WHERE id=:id`,
				eventStepInstances[i])
			if err != nil {
				logging.LogError(err, "Failed to cancel pending event step instance")
			}
		}
	}
	return nil
}

type eventGroupConsumingContainerNeeds struct {
	ConsumingContainerName string
	FunctionNames          []string
}
type consumingContainerSubscriptionDefinition struct {
	Name        string `json:"name"`
	Description string `json:"description"`
}

func ProcessEventGroupConsumingContainersByEventGroup(eventgroupId int) {
	eventSteps := []databaseStructs.EventStep{}
	err := database.DB.Select(&eventSteps, `SELECT * FROM eventstep WHERE eventgroup_id=$1`, eventgroupId)
	if err != nil {
		logging.LogError(err, "Failed to get event steps")
		return
	}
	neededContainers := []eventGroupConsumingContainerNeeds{}
	for i, _ := range eventSteps {
		if eventSteps[i].Action == ActionCustomFunction ||
			eventSteps[i].Action == ActionConditionalCheck ||
			eventSteps[i].Action == ActionInterceptTask ||
			eventSteps[i].Action == ActionInterceptResponse {
			containerNameInterface, ok := eventSteps[i].ActionData.StructValue()["container_name"]
			if !ok {
				logging.LogError(err, "Failed to get container name")
				continue
			}
			functionName := ""
			if eventSteps[i].Action == ActionInterceptTask {
				functionName = ActionInterceptTask
			}
			if eventSteps[i].Action == ActionInterceptResponse {
				functionName = ActionInterceptResponse
			}
			if eventSteps[i].Action == ActionCustomFunction || eventSteps[i].Action == ActionConditionalCheck {
				functionNameInterface, ok := eventSteps[i].ActionData.StructValue()["function_name"]
				if !ok {
					logging.LogError(err, "Failed to get function name")
					continue
				}
				functionName = functionNameInterface.(string)
			}
			containerName := containerNameInterface.(string)
			foundContainer := false
			for j, _ := range neededContainers {
				if neededContainers[j].ConsumingContainerName == containerName {
					foundContainer = true
					if !slices.Contains(neededContainers[j].FunctionNames, functionName) {
						neededContainers[j].FunctionNames = append(neededContainers[j].FunctionNames, functionName)
					}
					break
				}
			}
			if !foundContainer {
				neededContainers = append(neededContainers, eventGroupConsumingContainerNeeds{
					ConsumingContainerName: containerName,
					FunctionNames:          []string{functionName},
				})
			}
		}
	}
	// now we know all the containers we need and their functions, check the database
	consumingContainers := []databaseStructs.ConsumingContainer{}
	err = database.DB.Select(&consumingContainers, `SELECT * FROM consuming_container`)
	if err != nil {
		logging.LogError(err, "Failed to get consuming containers")
		return
	}
	for i, _ := range neededContainers {
		eventGroupConsumingContainer := databaseStructs.EventGroupConsumingContainer{
			ConsumingContainerName: neededContainers[i].ConsumingContainerName,
			EventGroupID:           eventgroupId,
			FunctionNames:          GetMythicJSONArrayFromStruct(neededContainers[i].FunctionNames),
			AllFunctionsAvailable:  true,
		}
		for j, _ := range consumingContainers {
			if consumingContainers[j].Name == neededContainers[i].ConsumingContainerName {
				eventGroupConsumingContainer.ConsumingContainerID.Valid = true
				eventGroupConsumingContainer.ConsumingContainerID.Int64 = int64(consumingContainers[j].ID)
				consumingContainerFunctions := consumingContainers[j].Subscriptions.StructStringValue()
				containerFunctionNames := make([]string, len(consumingContainerFunctions))
				for k, _ := range consumingContainerFunctions {
					currentName := consumingContainerSubscriptionDefinition{}
					err = json.Unmarshal([]byte(consumingContainerFunctions[k]), &currentName)
					if err != nil {
						logging.LogError(err, "failed to parse name from subscription")
					} else {
						containerFunctionNames[k] = currentName.Name
					}
				}
				for k, _ := range neededContainers[i].FunctionNames {
					if !slices.Contains(containerFunctionNames, neededContainers[i].FunctionNames[k]) {
						eventGroupConsumingContainer.AllFunctionsAvailable = false
					}
				}
			}
		}
		_, err = database.DB.NamedExec(`INSERT INTO eventgroupconsumingcontainer 
					(eventgroup_id, consuming_container_id, consuming_container_name, function_names, all_functions_available)
					VALUES 
					(:eventgroup_id, :consuming_container_id, :consuming_container_name, :function_names, :all_functions_available)`,
			eventGroupConsumingContainer)
		if err != nil {
			logging.LogError(err, "Failed to insert event group consuming container")
		}
	}
}
func UpdateEventGroupConsumingContainersMappingByConsumingContainer(consumingContainer databaseStructs.ConsumingContainer) {
	eventGroupConsumingContainers := []databaseStructs.EventGroupConsumingContainer{}
	err := database.DB.Select(&eventGroupConsumingContainers, `SELECT * FROM eventgroupconsumingcontainer`)
	if err != nil {
		logging.LogError(err, "Failed to get event group consuming containers")
		return
	}
	for i, _ := range eventGroupConsumingContainers {
		if consumingContainer.Name != eventGroupConsumingContainers[i].ConsumingContainerName {
			continue
		}
		if eventGroupConsumingContainers[i].ConsumingContainerID.Int64 == 0 {
			eventGroupConsumingContainers[i].ConsumingContainerID.Int64 = int64(consumingContainer.ID)
			eventGroupConsumingContainers[i].ConsumingContainerID.Valid = true
		}
		consumingContainerFunctions := consumingContainer.Subscriptions.StructStringValue()
		containerFunctionNames := make([]string, len(consumingContainerFunctions))
		for k, _ := range consumingContainerFunctions {
			currentName := consumingContainerSubscriptionDefinition{}
			err = json.Unmarshal([]byte(consumingContainerFunctions[k]), &currentName)
			if err != nil {
				logging.LogError(err, "failed to parse name from subscription")
			} else {
				containerFunctionNames[k] = currentName.Name
			}
		}
		eventGroupConsumingContainers[i].AllFunctionsAvailable = true
		for _, neededFuncName := range eventGroupConsumingContainers[i].FunctionNames.StructStringValue() {
			if !slices.Contains(containerFunctionNames, neededFuncName) {
				eventGroupConsumingContainers[i].AllFunctionsAvailable = false
			}
		}
		_, err = database.DB.NamedExec(`UPDATE eventgroupconsumingcontainer SET
					consuming_container_id=:consuming_container_id, all_functions_available=:all_functions_available
					WHERE id=:id`, eventGroupConsumingContainers[i])
		if err != nil {
			logging.LogError(err, "Failed to update event group consuming container")
		}
		_, err = database.DB.Exec(`UPDATE eventgroup SET updated_at=$1 WHERE id=$2`,
			time.Now().UTC(), eventGroupConsumingContainers[i].EventGroupID)
		if err != nil {
			logging.LogError(err, "Failed to update event group")
		}
	}
}
