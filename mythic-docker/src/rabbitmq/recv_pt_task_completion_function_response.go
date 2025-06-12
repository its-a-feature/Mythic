package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
	"strings"
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_TASK_COMPLETION_FUNCTION_RESPONSE,
		RoutingKey: PT_TASK_COMPLETION_FUNCTION_RESPONSE,
		Handler:    processPtTaskCompletionFunctionMessages,
	})

}

func processPtTaskCompletionFunctionMessages(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey)
	task := databaseStructs.Task{}
	parentTask := databaseStructs.Task{}
	payloadMsg := PTTaskCompletionFunctionMessageResponse{}
	err := json.Unmarshal(msg.Body, &payloadMsg)
	if err != nil {
		logging.LogError(err, "Failed to process message into struct")
		return
	}
	logging.LogInfo("completion response", "response", payloadMsg)
	err = database.DB.Get(&task, `SELECT
		completed, parent_task_id, subtask_callback_function, subtask_callback_function_completed,
		group_callback_function, group_callback_function_completed, completed_callback_function,
		completed_callback_function_completed, subtask_group_name,
		status, "stdout", stderr, params, parameter_group_name, display_params, id
		FROM task
		WHERE id=$1`, payloadMsg.TaskID)
	if err != nil {
		logging.LogError(err, "Failed to get task information when processing task completion function response")
		return
	}
	if payloadMsg.ParentTaskId != 0 {
		err = database.DB.Get(&parentTask, `SELECT
		completed, parent_task_id, subtask_callback_function, subtask_callback_function_completed,
		group_callback_function, group_callback_function_completed, completed_callback_function,
		completed_callback_function_completed, subtask_group_name,
		status, "stdout", stderr, params, parameter_group_name, display_params, id
		FROM task
		WHERE id=$1`, payloadMsg.ParentTaskId)
		if err != nil {
			logging.LogError(err, "Failed to get task information when processing task completion function response")
			return
		}
	}
	if task.CompletedCallbackFunction != "" && !task.CompletedCallbackFunctionCompleted {
		// this task has a completion function set, and it hasn't been executed, so run it
		// ex in create_tasking: completionFunctionName := "shellCompleted"
		//	response.CompletionFunctionName = &completionFunctionName
		// this function is executed for the TASK
		task.CompletedCallbackFunctionCompleted = true
		if payloadMsg.Success {
			task.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION_ERROR
		}
	} else if task.SubtaskCallbackFunction != "" && !task.SubtaskCallbackFunctionCompleted {
		// this task has a subtask callback function, and that subtask function hasn't completed successfully
		// ex in create_tasking:
		//	completionFunctionName := "pwdCompleted"
		//	if responseCreate, err := mythicrpc.SendMythicRPCTaskCreateSubtask(mythicrpc.MythicRPCTaskCreateSubtaskMessage{
		//		TaskID:      taskData.Task.ID,
		//		CommandName: "pwd",
		//		SubtaskCallbackFunction: &completionFunctionName,
		//	});
		// this function is executed for the PARENT_TASK
		task.SubtaskCallbackFunctionCompleted = true
		if payloadMsg.Success {
			task.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_SUBTASK_COMPLETED_FUNCTION_ERROR
		}

	} else if task.SubtaskGroupName != "" && task.GroupCallbackFunction != "" && !task.GroupCallbackFunctionCompleted {
		// we have a subtask group name, we have a group callback function defined, and that group callback function is done
		// need to check if we're the last one in the group to finish - if so, we need to call the function, if not do nothing
		// this function is executed for the PARENT_TASK
		task.GroupCallbackFunctionCompleted = true
		if payloadMsg.Success {
			// need to make sure _all_ group tasks are updated to mark as completed as well
			if _, err := database.DB.NamedExec(`UPDATE task SET
                group_callback_function_completed=true WHERE
			    parent_task_id=:id AND subtask_group_name=:subtask_group_name`, task); err != nil {
				logging.LogError(err, "Failed to update group to all set completion function to true")
			} else {
				task.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
			}
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_GROUP_COMPLETED_FUNCTION_ERROR
		}
	}
	// this stuff happens for all of these options
	if payloadMsg.TaskStatus != nil && *payloadMsg.TaskStatus != "" {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.Status = *payloadMsg.TaskStatus
		} else {
			task.Status = *payloadMsg.TaskStatus
		}
	}
	if payloadMsg.DisplayParams != nil {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.DisplayParams = *payloadMsg.DisplayParams
		} else {
			task.DisplayParams = *payloadMsg.DisplayParams
		}

	}
	if payloadMsg.Stdout != nil {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.Stdout += *payloadMsg.Stdout
		} else {
			task.Stdout += *payloadMsg.Stdout
		}

	}
	if payloadMsg.Stderr != nil {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.Stderr += *payloadMsg.Stderr
		} else {
			task.Stderr += *payloadMsg.Stderr
		}

	}
	if payloadMsg.Params != nil {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.Params = *payloadMsg.Params
		} else {
			task.Params = *payloadMsg.Params
		}

	}
	if payloadMsg.ParameterGroupName != nil {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.ParameterGroupName = *payloadMsg.ParameterGroupName
		} else {
			task.ParameterGroupName = *payloadMsg.ParameterGroupName
		}

	}
	if payloadMsg.Error != "" {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			parentTask.Stderr += payloadMsg.Error
			parentTask.Status = PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION_ERROR
		} else {
			task.Stderr += payloadMsg.Error
			task.Status = PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION_ERROR
			task.Completed = true
		}
	}
	if payloadMsg.Completed != nil {
		// called function in parent task's task, so these fields apply to the parent task, not the sub task
		if payloadMsg.ParentTaskId != 0 {
			if !parentTask.Completed && *payloadMsg.Completed {
				parentTask.Completed = true
			}
		} else {
			if !task.Completed && *payloadMsg.Completed {
				task.Completed = true
			}
		}

	}
	if task.Completed && strings.Contains("error", task.Status) && len(task.Stderr) == 0 {
		// if the task is now completed and we're returning error, but there's no stderr, add something
		task.Stderr = "No error output provided by the task completion function, but Success was set to False.\n"
	}
	if _, err := database.DB.NamedExec(`UPDATE task SET
		status=:status, display_params=:display_params, "stdout"=:stdout, stderr=:stderr,
		params=:params, parameter_group_name=:parameter_group_name, completed=:completed,
		subtask_callback_function_completed=:subtask_callback_function_completed,
		group_callback_function_completed=:group_callback_function_completed,
		completed_callback_function_completed=:completed_callback_function_completed
		WHERE id=:id`, task); err != nil {
		logging.LogError(err, "Failed to update task status from completion function response")
	} else if task.Completed && payloadMsg.Success {
		go CheckAndProcessTaskCompletionHandlers(task.ID)
	}
	if payloadMsg.ParentTaskId != 0 {
		_, err := database.DB.NamedExec(`UPDATE task SET
		status=:status, display_params=:display_params, "stdout"=:stdout, stderr=:stderr,
		params=:params, parameter_group_name=:parameter_group_name, completed=:completed,
		subtask_callback_function_completed=:subtask_callback_function_completed,
		group_callback_function_completed=:group_callback_function_completed,
		completed_callback_function_completed=:completed_callback_function_completed
		WHERE id=:id`, parentTask)
		if err != nil {
			logging.LogError(err, "Failed to update task status from completion function response")
			return
		}
		// check for completion handlers for the parent
		go CheckAndProcessTaskCompletionHandlers(parentTask.ID)
	}
}
