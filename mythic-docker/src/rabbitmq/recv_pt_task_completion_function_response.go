package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_TASK_COMPLETION_FUNCTION_RESPONSE,
		RoutingKey: PT_TASK_COMPLETION_FUNCTION_RESPONSE,
		Handler:    processPtTaskCompletionFunctionMessages,
		Scopes:     []string{authorization.SCOPE_TASK_WRITE},
	})

}

func processPtTaskCompletionFunctionMessages(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey)
	task := databaseStructs.Task{}
	parentTask := databaseStructs.Task{}
	payloadMsg := PTTaskCompletionFunctionMessageResponse{}
	var groupTaskIDs []int
	authContext, err := GetRabbitMQAuthContextFromHeaders(msg.Headers)
	if err != nil {
		logging.LogError(err, "Failed to get auth headers")
		return
	}
	err = json.Unmarshal(msg.Body, &payloadMsg)
	if err != nil {
		logging.LogError(err, "Failed to process message into struct")
		return
	}
	completionMutex.Lock()
	defer completionMutex.Unlock()
	logging.LogInfo("completion response", "response", payloadMsg)
	err = database.DB.Get(&task, `SELECT
		completed, parent_task_id, subtask_callback_function, subtask_callback_function_completed, subtask_callback_function_started,
		group_callback_function, group_callback_function_completed, group_callback_function_started, completed_callback_function,
		completed_callback_function_completed, completed_callback_function_started, subtask_group_name,
		status, params, parameter_group_name, display_params, id, display_id
		FROM task
		WHERE id=$1 AND operation_id=$2`, payloadMsg.TaskID, authContext.OperationID)
	if err != nil {
		logging.LogError(err, "Failed to get task information when processing task completion function response")
		return
	}
	if payloadMsg.ParentTaskId != 0 {
		if !task.ParentTaskID.Valid || task.ParentTaskID.Int64 != int64(payloadMsg.ParentTaskId) {
			logging.LogError(nil, "Completion response parent does not match task", "task_id", task.ID)
			return
		}
		err = database.DB.Get(&parentTask, `SELECT
		completed, parent_task_id, subtask_callback_function, subtask_callback_function_completed, subtask_callback_function_started,
		group_callback_function, group_callback_function_completed, group_callback_function_started, completed_callback_function,
		completed_callback_function_completed, completed_callback_function_started, subtask_group_name,
		status, params, parameter_group_name, display_params, id, display_id
		FROM task
		WHERE id=$1 AND operation_id=$2`, payloadMsg.ParentTaskId, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to get task information when processing task completion function response")
			return
		}
	}
	// Output fields hold only this response's additions. Append them in SQL so
	// concurrent agent output and earlier handler messages are never overwritten.
	succeeded := payloadMsg.Success && payloadMsg.Error == ""
	stage, function := "", ""
	if task.CompletedCallbackFunctionStarted && !task.CompletedCallbackFunctionCompleted {
		stage, function = "task", task.CompletedCallbackFunction
		task.CompletedCallbackFunctionCompleted = succeeded
	} else if task.SubtaskCallbackFunctionStarted && !task.SubtaskCallbackFunctionCompleted {
		stage, function = "subtask", task.SubtaskCallbackFunction
		task.SubtaskCallbackFunctionCompleted = succeeded
	} else if task.GroupCallbackFunctionStarted && !task.GroupCallbackFunctionCompleted {
		stage, function = "group", task.GroupCallbackFunction
		task.GroupCallbackFunctionCompleted = succeeded
	} else {
		logging.LogError(nil, "No started completion handler matches response", "task_id", task.ID)
		return
	}
	message := "finished"
	if !succeeded {
		message = "failed"
		if payloadMsg.Error != "" {
			message += ": " + payloadMsg.Error
		} else if payloadMsg.Stderr == nil || *payloadMsg.Stderr == "" {
			message += ": no error output provided by the handler"
		}
		message += "; retry the handler."
	}
	group := ""
	if stage == "group" {
		group = task.SubtaskGroupName
	}
	message = taskCompletionMessage(stage, function, task.DisplayID, group, message)
	if succeeded {
		task.Stdout = message
	} else {
		task.Stderr = message
	}
	if stage == "group" {
		// Record the same invocation on every member without changing any member's
		// agent status. The triggering task's output is appended below.
		err = database.DB.Select(&groupTaskIDs, `UPDATE task SET
            group_callback_function_completed=$4,
            stdout=stdout || CASE WHEN id=$5 THEN '' ELSE $6 END,
            stderr=stderr || CASE WHEN id=$5 THEN '' ELSE $7 END
            WHERE parent_task_id=$1 AND subtask_group_name=$2 AND group_callback_function=$3
            RETURNING id`,
			task.ParentTaskID.Int64,
			task.SubtaskGroupName,
			task.GroupCallbackFunction,
			succeeded,
			task.ID, task.Stdout, task.Stderr)
		if err != nil {
			logging.LogError(err, "Failed to update group completion function result")
			return
		}
	}
	// Subtask/group handlers execute in the parent; retain context on both the
	// triggering child and the parent, and apply explicit returned fields there.
	target := &task
	if payloadMsg.ParentTaskId != 0 {
		target = &parentTask
		target.Stdout, target.Stderr = task.Stdout, task.Stderr
	}
	if payloadMsg.TaskStatus != nil && *payloadMsg.TaskStatus != "" {
		_, err = database.DB.Exec(`UPDATE task SET status=$2 WHERE id=$1 AND operation_id=$3`,
			target.ID, *payloadMsg.TaskStatus, authContext.OperationID)
		if err != nil {
			logging.LogError(err, "Failed to apply explicit completion task status")
			return
		}
	}
	if payloadMsg.DisplayParams != nil {
		target.DisplayParams = *payloadMsg.DisplayParams
	}
	if payloadMsg.Stdout != nil {
		target.Stdout += *payloadMsg.Stdout
	}
	if payloadMsg.Stderr != nil {
		target.Stderr += *payloadMsg.Stderr
	}
	if payloadMsg.Params != nil {
		target.Params = *payloadMsg.Params
	}
	if payloadMsg.ParameterGroupName != nil {
		target.ParameterGroupName = *payloadMsg.ParameterGroupName
	}
	if payloadMsg.Completed != nil && *payloadMsg.Completed {
		target.Completed = true
	}
	_, err = database.DB.NamedExec(`UPDATE task SET
		display_params=:display_params, stdout=stdout || :stdout, stderr=stderr || :stderr,
		params=:params, parameter_group_name=:parameter_group_name, completed=:completed,
		subtask_callback_function_completed=:subtask_callback_function_completed,
		group_callback_function_completed=:group_callback_function_completed,
		completed_callback_function_completed=:completed_callback_function_completed
		WHERE id=:id`, task)
	if err != nil {
		logging.LogError(err, "Failed to update task from completion function response")
		return
	}
	if payloadMsg.ParentTaskId != 0 {
		_, err = database.DB.NamedExec(`UPDATE task SET
			display_params=:display_params, stdout=stdout || :stdout, stderr=stderr || :stderr,
			params=:params, parameter_group_name=:parameter_group_name, completed=:completed,
			subtask_callback_function_completed=:subtask_callback_function_completed,
			group_callback_function_completed=:group_callback_function_completed,
			completed_callback_function_completed=:completed_callback_function_completed
			WHERE id=:id`, parentTask)
		if err != nil {
			logging.LogError(err, "Failed to update parent task from completion function response")
			return
		}
	}
	// Continue under the same lock, after both task snapshots have been saved.
	if len(groupTaskIDs) == 0 {
		groupTaskIDs = []int{task.ID}
	}
	for _, taskID := range groupTaskIDs {
		if !succeeded {
			expireAPITokensForTask(taskID)
		}
		if task.Completed {
			checkAndProcessTaskCompletionHandlers(taskID, authContext)
		}
	}
}
