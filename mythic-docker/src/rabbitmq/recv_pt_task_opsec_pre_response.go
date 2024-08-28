package rabbitmq

import (
	"encoding/json"
	"github.com/its-a-feature/Mythic/eventing"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_TASK_OPSEC_PRE_CHECK_RESPONSE,
		RoutingKey: PT_TASK_OPSEC_PRE_CHECK_RESPONSE,
		Handler:    processPtTaskOPSECPreMessages,
	})
}

func processPtTaskOPSECPreMessages(msg amqp.Delivery) {
	payloadMsg := PTTTaskOPSECPreTaskMessageResponse{}
	if err := json.Unmarshal(msg.Body, &payloadMsg); err != nil {
		logging.LogError(err, "Failed to process message into struct")
	} else {
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
			shouldMoveToCreateTasking := false
			if !payloadMsg.OpsecPreBlocked || (payloadMsg.OpsecPreBlocked && payloadMsg.OpsecPreBypassed != nil && *payloadMsg.OpsecPreBypassed) {
				shouldMoveToCreateTasking = true
				task.Status = PT_TASK_FUNCTION_STATUS_PREPROCESSING
			} else {
				task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_PRE_BLOCKED
			}

			task.OpsecPreBlocked.Bool = payloadMsg.OpsecPreBlocked
			task.OpsecPreBlocked.Valid = true
			task.OpsecPreBypassRole = string(payloadMsg.OpsecPreBypassRole)
			if payloadMsg.OpsecPreBypassed != nil {
				task.OpsecPreBypassed = *payloadMsg.OpsecPreBypassed
			} else if payloadMsg.OpsecPreBlocked {
				task.OpsecPreBypassed = false
			} else {
				task.OpsecPreBypassed = true
			}
			task.OpsecPreMessage = payloadMsg.OpsecPreMessage
			if _, err := database.DB.NamedExec(`UPDATE task SET
			status=:status, opsec_pre_blocked=:opsec_pre_blocked, opsec_pre_bypass_role=:opsec_pre_bypass_role,
			opsec_pre_bypassed=:opsec_pre_bypassed, opsec_pre_message=:opsec_pre_message 
			WHERE id=:id`, task); err != nil {
				logging.LogError(err, "Failed to update task status")
				return
			} else if shouldMoveToCreateTasking {
				allTaskData := GetTaskConfigurationForContainer(task.ID)
				if err := RabbitMQConnection.SendPtTaskCreate(allTaskData); err != nil {
					logging.LogError(err, "In processPtTaskOPSECPreMessages, but failed to sendSendPtTaskCreate ")
				}
				return
			}
		} else {
			task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_PRE_ERROR
			logging.LogInfo("response", "task", payloadMsg)
			task.Stderr = payloadMsg.Error
			task.Completed = true
			if _, err := database.DB.NamedExec(`UPDATE task SET
			status=:status, stderr=:stderr, completed=:completed 
			WHERE
			id=:id`, task); err != nil {
				logging.LogError(err, "Failed to update task status")
				return
			}
			_, err = database.DB.Exec(`INSERT INTO response (task_id, operation_id, response) 
				VALUES ($1, $2, $3)`, task.ID, task.OperationID, task.Stderr)
			if err != nil {
				logging.LogError(err, "failed to add error to responses")
			}
			go CheckAndProcessTaskCompletionHandlers(task.ID)
			EventingChannel <- EventNotification{
				Trigger:             eventing.TriggerTaskFinish,
				OperationID:         task.OperationID,
				OperatorID:          task.OperatorID,
				EventStepInstanceID: int(task.EventStepInstanceID.Int64),
				TaskID:              task.ID,
				ActionSuccess:       !strings.Contains(strings.ToLower(task.Status), "error"),
			}
		}
	}
}
