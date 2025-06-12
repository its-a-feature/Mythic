package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"github.com/its-a-feature/Mythic/eventing"
	"strings"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_TASK_OPSEC_POST_CHECK_RESPONSE,
		RoutingKey: PT_TASK_OPSEC_POST_CHECK_RESPONSE,
		Handler:    processPtTaskOPSECPostMessages,
	})
}

func processPtTaskOPSECPostMessages(msg amqp.Delivery) {
	payloadMsg := PTTaskOPSECPostTaskMessageResponse{}
	err := json.Unmarshal(msg.Body, &payloadMsg)
	if err != nil {
		logging.LogError(err, "Failed to process message into struct")
		return
	}
	task := databaseStructs.Task{}
	task.ID = payloadMsg.TaskID
	if task.ID <= 0 {
		// we ran into an error and couldn't even get the task information out
		go SendAllOperationsMessage(payloadMsg.Error, 0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	err = database.DB.Get(&task, `SELECT status, operation_id, eventstepinstance_id FROM task WHERE id=$1`, task.ID)
	if err != nil {
		logging.LogError(err, "Failed to find task from create_tasking")
		go SendAllOperationsMessage(err.Error(), 0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	_, err = database.DB.Exec(`UPDATE apitokens SET deleted=true AND active=false WHERE task_id=$1`, task.ID)
	if err != nil {
		logging.LogError(err, "Failed to update the apitokens to set to deleted")
	}
	if payloadMsg.Success {
		if !payloadMsg.OpsecPostBlocked || (payloadMsg.OpsecPostBlocked && payloadMsg.OpsecPostBypassed != nil && *payloadMsg.OpsecPostBypassed) {
			task.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_POST_BLOCKED
		}
		task.OpsecPostBlocked.Bool = payloadMsg.OpsecPostBlocked
		task.OpsecPostBlocked.Valid = true
		task.OpsecPostBypassRole = string(payloadMsg.OpsecPostBypassRole)
		if payloadMsg.OpsecPostBypassed != nil {
			task.OpsecPostBypassed = *payloadMsg.OpsecPostBypassed
		} else if payloadMsg.OpsecPostBlocked {
			task.OpsecPostBypassed = false
		} else {
			task.OpsecPostBypassed = true
		}
		task.OpsecPostMessage = payloadMsg.OpsecPostMessage
		childTasks := []databaseStructs.Task{}
		if task.Status != PT_TASK_FUNCTION_STATUS_OPSEC_POST_BLOCKED {
			// get tasks where this task is the parent task and the tasks aren't complete
			err = database.DB.Select(&childTasks, `SELECT id FROM task WHERE parent_task_id=$1 AND completed=false`, task.ID)
			if err != nil {
				logging.LogError(err, "Failed to check for subtasks when completing opsec post check")
				return
			}
			if len(childTasks) > 0 {
				task.Status = PT_TASK_FUNCTION_STATUS_DELEGATING
			}
			err = database.DB.Get(&task, `SELECT
					command.script_only "command.script_only"
					FROM task
					JOIN command ON task.command_id = command.id
					WHERE task.id=$1`, task.ID)
			if err != nil {
				logging.LogError(err, "Failed to get command information for task finishing")
				return
			}
			if task.Command.ScriptOnly && len(childTasks) == 0 {
				task.Completed = true
				if task.Status == PT_TASK_FUNCTION_STATUS_SUBMITTED {
					// if we're script only and are about to move to submitted, instead move to completed
					task.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
				}
				task.StatusTimestampSubmitted.Valid = true
				task.StatusTimestampSubmitted.Time = time.Now().UTC()
				task.StatusTimestampProcessed.Valid = true
				task.StatusTimestampProcessed.Time = task.StatusTimestampSubmitted.Time
				_, err = database.DB.NamedExec(`UPDATE task SET 
                			status_timestamp_submitted=:status_timestamp_submitted,
                			status_timestamp_processed=:status_timestamp_processed,
                			completed=:completed,
                			status=:status
                			WHERE id=:id`, task)
				if err != nil {
					logging.LogError(err, "Failed to update submitted timestamp")
					return
				}
				// check to potentially execute completion functions
				go CheckAndProcessTaskCompletionHandlers(task.ID)
			}
		}
		if task.Completed {
			EventingChannel <- EventNotification{
				Trigger:             eventing.TriggerTaskFinish,
				OperationID:         task.OperationID,
				EventStepInstanceID: int(task.EventStepInstanceID.Int64),
				TaskID:              task.ID,
				ActionSuccess:       !strings.Contains(strings.ToLower(task.Status), "error"),
			}
		} else {
			checkForTaskInterception(&task)
		}
		_, err = database.DB.NamedExec(`UPDATE task SET
			status=:status, opsec_post_blocked=:opsec_post_blocked, opsec_post_bypass_role=:opsec_post_bypass_role,
			opsec_post_bypassed=:opsec_post_bypassed, opsec_post_message=:opsec_post_message, completed=:completed
			WHERE id=:id`, task)
		if err != nil {
			logging.LogError(err, "Failed to update task status")
			return
		}

		if task.Status == PT_TASK_FUNCTION_STATUS_SUBMITTED {
			submittedTasksAwaitingFetching.addTaskById(task.ID)
			task.StatusTimestampSubmitted.Valid = true
			task.StatusTimestampSubmitted.Time = time.Now().UTC()
			_, err = database.DB.NamedExec(`UPDATE task SET 
                status_timestamp_submitted=:status_timestamp_submitted WHERE id=:id`, task)
			if err != nil {
				logging.LogError(err, "Failed to update submitted timestamp")
			}
		}
	} else {
		task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_POST_ERROR
		task.Stderr = payloadMsg.Error
		task.Completed = true
		_, err = database.DB.NamedExec(`UPDATE task SET
			status=:status, stderr=:stderr, completed=:completed
			WHERE id=:id`, task)
		if err != nil {
			logging.LogError(err, "Failed to update task status")
			return
		}
		go CheckAndProcessTaskCompletionHandlers(task.ID)
		EventingChannel <- EventNotification{
			Trigger:             eventing.TriggerTaskFinish,
			OperationID:         task.OperationID,
			EventStepInstanceID: int(task.EventStepInstanceID.Int64),
			TaskID:              task.ID,
			ActionSuccess:       !strings.Contains(strings.ToLower(task.Status), "error"),
		}
	}
}
func checkForTaskInterception(task *databaseStructs.Task) {
	err := database.DB.Get(&task.OperationID, `SELECT operation_id FROM task WHERE id=$1`, task.ID)
	if err != nil {
		logging.LogError(err, "failed to query database for task information")
		return
	}
	interceptEventGroup := databaseStructs.EventGroup{}
	err = database.DB.Get(&interceptEventGroup, `SELECT id FROM eventgroup 
          WHERE operation_id=$1 AND trigger=$2 AND active=true AND deleted=false`,
		task.OperationID, eventing.TriggerTaskIntercept)
	if errors.Is(err, sql.ErrNoRows) {
		return
	}
	if err != nil {
		logging.LogError(err, "failed to query database for eventgroups that intercept tasks")
		return
	}
	task.Status = PT_TASK_FUNCTION_STATUS_INTERCEPTED
	task.Completed = false
	EventingChannel <- EventNotification{
		Trigger:      eventing.TriggerTaskIntercept,
		OperationID:  task.OperationID,
		EventGroupID: interceptEventGroup.ID,
		TaskID:       task.ID,
	}
}
