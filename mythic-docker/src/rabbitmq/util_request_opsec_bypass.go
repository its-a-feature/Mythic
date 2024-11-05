package rabbitmq

import (
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"time"
)

type RequestOpsecBypassMessage struct {
	TaskID            int
	OperatorOperation *databaseStructs.Operatoroperation
}
type RequestOpsecBypassMessageResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func RequestOpsecBypass(input RequestOpsecBypassMessage) RequestOpsecBypassMessageResponse {
	response := RequestOpsecBypassMessageResponse{
		Status: "error",
	}
	task := databaseStructs.Task{ID: input.TaskID}
	if err := database.DB.Get(&task, `SELECT
		opsec_pre_blocked, opsec_pre_bypassed, opsec_pre_bypass_role, opsec_pre_bypass_user_id,
		opsec_post_blocked, opsec_post_bypassed, opsec_post_bypass_role, opsec_post_bypass_user_id,
		display_id, operator_id,
		command.script_only "command.script_only"
		FROM task
		JOIN command on task.command_id = command.id
		WHERE task.id=$1 AND operation_id=$2`, task.ID, input.OperatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to fetch task information")
		response.Error = err.Error()
		return response
	} else {
		if task.OpsecPreBlocked.Valid && task.OpsecPreBlocked.Bool && !task.OpsecPreBypassed {
			// we have a request to bypass the opsec pre block
			switch OPSEC_ROLE(task.OpsecPreBypassRole) {
			case OPSEC_ROLE_LEAD:
				if input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
					updateTaskFromOpsecPreToCreateTasking(input, task)
				} else {
					errMsg := errors.New(fmt.Sprintf("%s tried to submit an opsec bypass request for task %d, but only the lead can approve this",
						input.OperatorOperation.CurrentOperator.Username, task.DisplayID))
					logging.LogError(errMsg, "Failed bypass request")
					go SendAllOperationsMessage(errMsg.Error(), input.OperatorOperation.CurrentOperation.ID, "", database.MESSAGE_LEVEL_WARNING)
					response.Error = errMsg.Error()
					return response
				}
			case OPSEC_ROLE_OPERATOR:
				if input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR ||
					input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
					updateTaskFromOpsecPreToCreateTasking(input, task)
				} else {
					errMsg := errors.New(fmt.Sprintf("%s tried to submit an opsec bypass request for task %d, but spectators cannot approve this",
						input.OperatorOperation.CurrentOperator.Username, task.DisplayID))
					logging.LogError(errMsg, "Failed bypass request")
					go SendAllOperationsMessage(errMsg.Error(), input.OperatorOperation.CurrentOperation.ID, "", database.MESSAGE_LEVEL_WARNING)
					response.Error = errMsg.Error()
					return response
				}
			case OPSEC_ROLE_OTHER_OPERATOR:
				if input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR {
					errMsg := errors.New(fmt.Sprintf("%s tried to submit an opsec bypass request for task %d, but spectators cannot approve this",
						input.OperatorOperation.CurrentOperator.Username, task.DisplayID))
					logging.LogError(errMsg, "Failed bypass request")
					go SendAllOperationsMessage(errMsg.Error(), input.OperatorOperation.CurrentOperation.ID, "", database.MESSAGE_LEVEL_WARNING)
					response.Error = errMsg.Error()
					return response
				} else if task.OperatorID != input.OperatorOperation.CurrentOperator.ID {
					// operatorX submitted the task and we are operatorY with viewmode operator or lead, so we can bypass
					updateTaskFromOpsecPreToCreateTasking(input, task)
				} else {
					// need to check if we're the only possible choice, if we're the only option, then we succeed
					operators := []databaseStructs.Operatoroperation{}
					if err := database.DB.Select(&operators, `SELECT 
    					operatoroperation.id
						FROM operatoroperation 
						JOIN operator ON operatoroperation.operator_id = operator.id
						WHERE operatoroperation.operation_id=$1 AND operatoroperation.view_mode!=$2
						AND operator.account_type!=$3 AND operator.active=true AND operator.deleted=false`,
						input.OperatorOperation.CurrentOperation.ID,
						database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR,
						databaseStructs.AccountTypeBot); err != nil {
						logging.LogError(err, "Failed to search for other operator / lead users for the operation")
						response.Error = err.Error()
						return response
					} else if len(operators) > 1 {
						response.Error = "An operator other than yourself must approve this"
						return response
					} else {
						updateTaskFromOpsecPreToCreateTasking(input, task)
					}
				}
			default:
				logging.LogError(nil, "Unknown opsec pre bypass role", "role", task.OpsecPreBypassRole)
				response.Error = fmt.Sprintf("Unknown opsec pre bypass role: %s", task.OpsecPreBypassRole)
				return response
			}
		} else if task.OpsecPostBlocked.Valid && task.OpsecPostBlocked.Bool && !task.OpsecPostBypassed {
			// we have a request to bypass the opsec post block
			switch OPSEC_ROLE(task.OpsecPostBypassRole) {
			case OPSEC_ROLE_LEAD:
				if input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
					updateTaskFromOpsecPostToReady(input, task)
				} else {
					errMsg := errors.New(fmt.Sprintf("%s tried to submit an opsec bypass request for task %d, but only the lead can approve this",
						input.OperatorOperation.CurrentOperator.Username, task.DisplayID))
					logging.LogError(errMsg, "Failed bypass request")
					go SendAllOperationsMessage(errMsg.Error(), input.OperatorOperation.CurrentOperation.ID, "", database.MESSAGE_LEVEL_WARNING)
					response.Error = errMsg.Error()
					return response
				}
			case OPSEC_ROLE_OPERATOR:
				if input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR ||
					input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
					updateTaskFromOpsecPostToReady(input, task)
				} else {
					errMsg := errors.New(fmt.Sprintf("%s tried to submit an opsec bypass request for task %d, but spectators cannot approve this",
						input.OperatorOperation.CurrentOperator.Username, task.DisplayID))
					logging.LogError(errMsg, "Failed bypass request")
					go SendAllOperationsMessage(errMsg.Error(), input.OperatorOperation.CurrentOperation.ID, "", database.MESSAGE_LEVEL_WARNING)
					response.Error = errMsg.Error()
					return response
				}
			case OPSEC_ROLE_OTHER_OPERATOR:
				if input.OperatorOperation.ViewMode == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR {
					errMsg := errors.New(fmt.Sprintf("%s tried to submit an opsec bypass request for task %d, but spectators cannot approve this",
						input.OperatorOperation.CurrentOperator.Username, task.DisplayID))
					logging.LogError(errMsg, "Failed bypass request")
					go SendAllOperationsMessage(errMsg.Error(), input.OperatorOperation.CurrentOperation.ID, "", database.MESSAGE_LEVEL_WARNING)
					response.Error = errMsg.Error()
					return response
				} else if task.OperatorID != input.OperatorOperation.CurrentOperator.ID {
					// operatorX submitted the task and we are operatorY with viewmode operator or lead, so we can bypass
					updateTaskFromOpsecPostToReady(input, task)
				} else {
					// need to check if we're the only possible choice, if we're the only option, then we succeed
					operators := []databaseStructs.Operatoroperation{}
					if err := database.DB.Select(&operators, `SELECT 
    					operatoroperation.id
						FROM operatoroperation 
						JOIN operator ON operatoroperation.operator_id = operator.id
						WHERE operatoroperation.operation_id=$1 AND operatoroperation.view_mode!=$2
						AND operator.account_type!=$3 AND operator.active=true AND operator.deleted=false`,
						input.OperatorOperation.CurrentOperation.ID,
						database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR,
						databaseStructs.AccountTypeBot); err != nil {
						logging.LogError(err, "Failed to search for other operator / lead users for the operation")
						response.Error = err.Error()
						return response
					} else if len(operators) > 1 {
						response.Error = "An operator other than yourself must approve this"
						return response
					} else {
						updateTaskFromOpsecPostToReady(input, task)
					}
				}
			default:
				logging.LogError(nil, "Unknown opsec post bypass role", "role", task.OpsecPostBypassRole)
				response.Error = fmt.Sprintf("Unknown opsec post bypass role: %s", task.OpsecPostBypassRole)
				return response
			}
		} else {
			// both opsec pre and post should be fine
			logging.LogError(nil, "Got request to bypass opsec when no opsec is blocking")
			response.Error = fmt.Sprintf("No opsec blocks currently exist")
			return response
		}
	}
	response.Status = "success"
	return response
}

func updateTaskFromOpsecPreToCreateTasking(input RequestOpsecBypassMessage, task databaseStructs.Task) {
	task.OpsecPreBypassed = true
	task.OpsecPreBypassUserID.Valid = true
	task.OpsecPreBypassUserID.Int64 = int64(input.OperatorOperation.CurrentOperator.ID)
	task.Status = PT_TASK_FUNCTION_STATUS_PREPROCESSING
	task.Timestamp = time.Now().UTC()
	if _, err := database.DB.NamedExec(`UPDATE task SET
                opsec_pre_bypassed=:opsec_pre_bypassed, opsec_pre_bypass_user_id=:opsec_pre_bypass_user_id,
                status=:status, timestamp=:timestamp WHERE id=:id`, task); err != nil {
		logging.LogError(err, "Failed to update task")
	} else {
		allTaskData := GetTaskConfigurationForContainer(task.ID)
		if err := RabbitMQConnection.SendPtTaskCreate(allTaskData); err != nil {
			logging.LogError(err, "In processPtTaskOPSECPreMessages, but failed to sendSendPtTaskCreate ")
		}
	}
}
func updateTaskFromOpsecPostToReady(input RequestOpsecBypassMessage, task databaseStructs.Task) {
	task.OpsecPostBypassed = true
	task.OpsecPostBypassUserID.Valid = true
	task.OpsecPostBypassUserID.Int64 = int64(input.OperatorOperation.CurrentOperator.ID)

	task.Timestamp = time.Now().UTC()
	childTasks := []databaseStructs.Task{}
	if err := database.DB.Select(&childTasks, `SELECT id FROM task WHERE parent_task_id=$1 AND completed=false`, task.ID); err != nil {
		logging.LogError(err, "Failed to check for subtasks when completing opsec post check")
	} else if len(childTasks) > 0 {
		task.Status = PT_TASK_FUNCTION_STATUS_DELEGATING
	} else if task.Command.ScriptOnly {
		task.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
		task.Completed = true
	} else {
		task.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
	}
	if _, err := database.DB.NamedExec(`UPDATE task SET
			status=:status, opsec_post_bypassed=:opsec_post_bypassed, opsec_post_bypass_user_id=:opsec_post_bypass_user_id,
			"timestamp"=:timestamp, completed=:completed
			WHERE id=:id`, task); err != nil {
		logging.LogError(err, "Failed to update task status")
		return
	} else if task.Status == PT_TASK_FUNCTION_STATUS_SUBMITTED {
		submittedTasksAwaitingFetching.addTaskById(task.ID)
	}
}
