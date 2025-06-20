package rabbitmq

import (
	"encoding/json"
	"fmt"
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
		Queue:      PT_TASK_CREATE_TASKING_RESPONSE,
		RoutingKey: PT_TASK_CREATE_TASKING_RESPONSE,
		Handler:    processPtTaskCreateMessages,
	})
}

func processPtTaskCreateMessages(msg amqp.Delivery) {
	payloadMsg := PTTaskCreateTaskingMessageResponse{}
	err := json.Unmarshal(msg.Body, &payloadMsg)
	if err != nil {
		logging.LogError(err, "Failed to process message into struct")
		return
	}
	// now process the create_tasking response body to update the task
	task := databaseStructs.Task{}
	task.ID = payloadMsg.TaskID
	if task.ID <= 0 {
		// we ran into an error and couldn't even get the task information out
		go SendAllOperationsMessage(payloadMsg.Error, 0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	err = database.DB.Get(&task, `SELECT * FROM task WHERE id=$1`, task.ID)
	if err != nil {
		logging.LogError(err, "Failed to find task from create_tasking")
		go SendAllOperationsMessage(err.Error(), 0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	_, err = database.DB.Exec(`UPDATE apitokens SET deleted=true AND active=false WHERE task_id=$1`, task.ID)
	if err != nil {
		logging.LogError(err, "Failed to update the apitokens to set to deleted")
	}
	//logging.LogInfo("got response back from create message", "resp", payloadMsg, "original", string(msg.Body))

	var updateColumns []string
	if payloadMsg.CommandName != nil {
		task.CommandName = *payloadMsg.CommandName
		updateColumns = append(updateColumns, "command_name=:command_name")
	}
	if payloadMsg.ParameterGroupName != nil {
		task.ParameterGroupName = *payloadMsg.ParameterGroupName
		updateColumns = append(updateColumns, "parameter_group_name=:parameter_group_name")
	}
	if payloadMsg.Params != nil {
		task.Params = *payloadMsg.Params
		updateColumns = append(updateColumns, "params=:params")
	}
	if payloadMsg.DisplayParams != nil {
		task.DisplayParams = *payloadMsg.DisplayParams
		updateColumns = append(updateColumns, "display_params=:display_params")
	}
	if payloadMsg.Stdout != nil {
		task.Stdout += *payloadMsg.Stdout
		updateColumns = append(updateColumns, "stdout=:stdout")
	}
	if payloadMsg.Stderr != nil {
		task.Stderr += *payloadMsg.Stderr
		updateColumns = append(updateColumns, "stderr=:stderr")
	}
	if payloadMsg.Completed != nil {
		task.Completed = *payloadMsg.Completed
		updateColumns = append(updateColumns, "completed=:completed")
	}
	if payloadMsg.TokenID != nil {
		if err := database.DB.Get(&task.TokenID.Int64, `SELECT id FROM token WHERE token_id=$1 AND operation_id=$2`,
			*payloadMsg.TokenID, task.OperationID); err != nil {
			logging.LogError(err, "Failed to find token to update in tasking")
		} else {
			task.TokenID.Valid = true
			updateColumns = append(updateColumns, "token_id=:token_id")
		}

	}
	if payloadMsg.CompletionFunctionName != nil {
		task.CompletedCallbackFunction = *payloadMsg.CompletionFunctionName
		updateColumns = append(updateColumns, "completed_callback_function=:completed_callback_function")
	}
	if payloadMsg.TaskStatus != nil {
		task.Status = *payloadMsg.TaskStatus
	}
	if task.Completed {
		/*
			if task.Status == PT_TASK_FUNCTION_STATUS_PREPROCESSING {
				task.Status = "completed"
			}

		*/
		if payloadMsg.TaskStatus != nil {
			task.Status = *payloadMsg.TaskStatus
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
		}
		task.Timestamp = time.Now().UTC()
		updateColumns = append(updateColumns, "timestamp=:timestamp")
		task.StatusTimestampSubmitted.Valid = true
		task.StatusTimestampSubmitted.Time = task.Timestamp
		updateColumns = append(updateColumns, "status_timestamp_submitted=:status_timestamp_submitted")
		task.StatusTimestampProcessed.Valid = true
		task.StatusTimestampProcessed.Time = task.Timestamp
		updateColumns = append(updateColumns, "status_timestamp_processed=:status_timestamp_processed")
	} else {
		if payloadMsg.Success {
			if task.IsInteractiveTask {
				task.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
			} else {
				task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_POST
			}
		} else {
			if payloadMsg.TaskStatus != nil {
				task.Status = *payloadMsg.TaskStatus
			} else {
				task.Status = PT_TASK_FUNCTION_STATUS_PREPROCESSING_ERROR
			}
		}
		if payloadMsg.ReprocessAtNewCommandPayloadType != nil && *payloadMsg.ReprocessAtNewCommandPayloadType != "" {
			task.Status = PT_TASK_FUNCTION_STATUS_PREPROCESSING
		}
	}
	updateColumns = append(updateColumns, "status=:status")
	updateString := fmt.Sprintf(`UPDATE task SET %s WHERE id=:id`, strings.Join(updateColumns, ","))
	//logging.LogDebug("update string for create tasking", "update string", updateString)
	_, err = database.DB.NamedExec(updateString, task)
	if err != nil {
		logging.LogError(err, "Failed to update task status")
		return
	}
	if payloadMsg.Success {
		if task.Status == PT_TASK_FUNCTION_STATUS_OPSEC_POST || task.Status == PT_TASK_FUNCTION_STATUS_PREPROCESSING {
			allTaskData := GetTaskConfigurationForContainer(task.ID)
			if payloadMsg.ReprocessAtNewCommandPayloadType != nil && *payloadMsg.ReprocessAtNewCommandPayloadType != "" {
				allTaskData.CommandPayloadType = *payloadMsg.ReprocessAtNewCommandPayloadType
				if payloadMsg.CommandName != nil && *payloadMsg.CommandName != "" {
					allTaskData.Task.CommandName = *payloadMsg.CommandName
				}
				_, err = database.DB.Exec(`UPDATE task SET command_payload_type=$1, process_at_original_command=false
					WHERE id=$2`, allTaskData.CommandPayloadType, task.ID)
				if err != nil {
					logging.LogError(err, "failed to update command_payload_type based on ReprocessAtNewCommandPayloadType")
				}
				logging.LogInfo("sending task back to create tasking", "payload type", allTaskData.CommandPayloadType,
					"command name", allTaskData.Task.CommandName)
				err = RabbitMQConnection.SendPtTaskCreate(allTaskData)
				if err != nil {
					logging.LogError(err, "In processPtTaskCreateMessages, but failed to SendPtTaskCreate ")
				}
				return
			}
			err = RabbitMQConnection.SendPtTaskOPSECPost(allTaskData)
			if err != nil {
				logging.LogError(err, "In processPtTaskCreateMessages, but failed to SendPtTaskOPSECPost ")
			}
		}
		if task.Completed {
			EventingChannel <- EventNotification{
				Trigger:             eventing.TriggerTaskFinish,
				OperationID:         task.OperationID,
				OperatorID:          task.OperatorID,
				EventStepInstanceID: int(task.EventStepInstanceID.Int64),
				TaskID:              task.ID,
				ActionSuccess:       !strings.Contains(strings.ToLower(task.Status), "error"),
			}
			go CheckAndProcessTaskCompletionHandlers(task.ID)
		} else if task.IsInteractiveTask {
			// we're not completed and we are an interactive task, send it down to the agent
			go submittedTasksAwaitingFetching.addTask(task)
		}
	} else {
		task.Completed = true
		task.Stderr += payloadMsg.Error
		_, err = database.DB.NamedExec(`UPDATE task SET
					status=:status, stderr=:stderr, completed=:completed 
					WHERE
					id=:id`, task)
		_, err = database.DB.Exec(`INSERT INTO response (task_id, operation_id, response) 
				VALUES ($1, $2, $3)`, task.ID, task.OperationID, task.Stderr)
		if err != nil {
			logging.LogError(err, "failed to add error to responses")
		}
		if err != nil {
			logging.LogError(err, "Failed to update task status")
			return
		}
		EventingChannel <- EventNotification{
			Trigger:             eventing.TriggerTaskFinish,
			OperationID:         task.OperationID,
			OperatorID:          task.OperatorID,
			EventStepInstanceID: int(task.EventStepInstanceID.Int64),
			TaskID:              task.ID,
			ActionSuccess:       false,
		}
		// we hit an error in processing, so check if others are waiting on us to finish
		go CheckAndProcessTaskCompletionHandlers(task.ID)
	}
}
