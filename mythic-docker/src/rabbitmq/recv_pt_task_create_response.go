package rabbitmq

import (
	"encoding/json"
	"fmt"
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
	if err := json.Unmarshal(msg.Body, &payloadMsg); err != nil {
		logging.LogError(err, "Failed to process message into struct")
	} else {
		// now process the create_tasking response body to update the task
		task := databaseStructs.Task{}
		task.ID = payloadMsg.TaskID
		if task.ID <= 0 {
			// we ran into an error and couldn't even get the task information out
			go database.SendAllOperationsMessage(payloadMsg.Error, 0, "", database.MESSAGE_LEVEL_WARNING)
			return
		} else if err := database.DB.Get(&task, `SELECT status FROM task WHERE id=$1`, task.ID); err != nil {
			logging.LogError(err, "Failed to find task from create_tasking")
			go database.SendAllOperationsMessage(err.Error(), 0, "", database.MESSAGE_LEVEL_WARNING)
			return
		}
		logging.LogInfo("got response back from create message", "resp", payloadMsg, "original", string(msg.Body))
		if payloadMsg.Success {
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
				task.Stdout = *payloadMsg.Stdout
				updateColumns = append(updateColumns, "stdout=:stdout")
			}
			if payloadMsg.Stderr != nil {
				task.Stderr = *payloadMsg.Stderr
				updateColumns = append(updateColumns, "stderr=:stderr")
			}
			if payloadMsg.Completed != nil {
				task.Completed = *payloadMsg.Completed
				updateColumns = append(updateColumns, "completed=:completed")
			}
			if payloadMsg.TokenID != nil {
				task.TokenID.Int64 = int64(*payloadMsg.TokenID)
				task.TokenID.Valid = true
				updateColumns = append(updateColumns, "token_id=:token_id")
			}
			if payloadMsg.CompletionFunctionName != nil {
				task.CompletedCallbackFunction = *payloadMsg.CompletionFunctionName
				updateColumns = append(updateColumns, "completed_callback_function=:completed_callback_function")
			}
			if payloadMsg.TaskStatus != nil {
				task.Status = *payloadMsg.TaskStatus
				updateColumns = append(updateColumns, "status=:status")
			}
			if task.Completed {
				if task.Status == PT_TASK_FUNCTION_STATUS_PREPROCESSING {
					task.Status = "completed"
					updateColumns = append(updateColumns, "status=:status")
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
				if task.Status == PT_TASK_FUNCTION_STATUS_PREPROCESSING {
					task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_POST
					updateColumns = append(updateColumns, "status=:status")
				}
			}

			updateString := fmt.Sprintf(`UPDATE task SET %s WHERE id=:id`, strings.Join(updateColumns, ","))
			logging.LogDebug("update string for create tasking", "update string", updateString)
			if _, err := database.DB.NamedExec(updateString, task); err != nil {
				logging.LogError(err, "Failed to update task status")
				return
			} else {
				if task.Status == PT_TASK_FUNCTION_STATUS_OPSEC_POST {
					allTaskData := GetTaskConfigurationForContainer(task.ID)
					if err := RabbitMQConnection.SendPtTaskOPSECPost(allTaskData); err != nil {
						logging.LogError(err, "In processPtTaskCreateMessages, but failed to SendPtTaskOPSECPost ")
					}
				}
			}
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_PREPROCESSING_ERROR
			task.Stderr = payloadMsg.Error
			if _, err := database.DB.NamedExec(`UPDATE task SET
			status=:status, stderr=:stderr 
			WHERE
			id=:id`, task); err != nil {
				logging.LogError(err, "Failed to update task status")
				return
			}
		}
	}
}
