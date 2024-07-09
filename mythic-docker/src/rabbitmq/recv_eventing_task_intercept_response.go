package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
	"time"
)

type TaskInterceptMessageResponse struct {
	EventStepInstanceID int                    `json:"eventstepinstance_id" mapstructure:"eventstepinstance_id"`
	TaskID              int                    `json:"task_id" mapstructure:"task_id"`
	Success             bool                   `json:"success" mapstructure:"success"`
	StdOut              string                 `json:"stdout" mapstructure:"stdout"`
	StdErr              string                 `json:"stderr" mapstructure:"stderr"`
	BlockTask           bool                   `json:"block_task" mapstructure:"block_task"`
	BypassRole          string                 `json:"bypass_role" mapstructure:"bypass_role"`
	BypassMessage       string                 `json:"bypass_message" mapstructure:"bypass_message"`
	Outputs             map[string]interface{} `json:"outputs" mapstructure:"outputs"`
}

func init() {
	RabbitMQConnection.AddDirectQueue(DirectQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      EVENTING_TASK_INTERCEPT_RESPONSE,
		RoutingKey: EVENTING_TASK_INTERCEPT_RESPONSE,
		Handler:    processEventingTaskInterceptResponse,
	})
}

func processEventingTaskInterceptResponse(msg amqp.Delivery) {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	input := TaskInterceptMessageResponse{}
	err := json.Unmarshal(msg.Body, &input)
	if err != nil {
		logging.LogError(err, "Failed to process eventing task intercept response message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to process eventing task intercept response %s", err.Error()),
			0, "", database.MESSAGE_LEVEL_WARNING)
		return
	}
	task := databaseStructs.Task{ID: input.TaskID}
	EventingChannel <- EventNotification{
		Trigger:             eventing.TriggerTaskInterceptResponse,
		EventStepInstanceID: input.EventStepInstanceID,
		TaskID:              task.ID,
		Outputs:             input.Outputs,
		ActionStdout:        input.StdOut,
		ActionStderr:        input.StdErr,
		ActionSuccess:       input.Success,
	}
	if !input.Success {
		task.Status = PT_TASK_FUNCTION_STATUS_INTERCEPTED_ERROR
		task.Completed = true
		_, err = database.DB.NamedExec(`UPDATE task SET status=:status, completed=:completed WHERE id=:id`, task)
		if err != nil {
			logging.LogError(err, "failed to update task status after interception")
			return
		}
		return
	}
	if input.BlockTask {
		task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_POST_BLOCKED
		task.OpsecPostBlocked.Bool = true
		task.OpsecPostBlocked.Valid = true
		task.OpsecPostBypassRole = input.BypassRole
		task.OpsecPostBypassed = false
		task.OpsecPostMessage = input.BypassMessage
		_, err = database.DB.NamedExec(`UPDATE task SET
			status=:status, opsec_post_blocked=:opsec_post_blocked, opsec_post_bypass_role=:opsec_post_bypass_role,
			opsec_post_bypassed=:opsec_post_bypassed, opsec_post_message=:opsec_post_message, completed=:completed
			WHERE id=:id`, task)
		if err != nil {
			logging.LogError(err, "Failed to update task status")
			return
		}
	} else {
		task.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
		task.OpsecPostBlocked.Bool = false
		task.OpsecPostBlocked.Valid = true
		task.OpsecPostBypassRole = input.BypassRole
		task.OpsecPostBypassed = false
		task.OpsecPostMessage = input.BypassMessage
		_, err = database.DB.NamedExec(`UPDATE task SET
			status=:status, opsec_post_blocked=:opsec_post_blocked, opsec_post_bypass_role=:opsec_post_bypass_role,
			opsec_post_bypassed=:opsec_post_bypassed, opsec_post_message=:opsec_post_message, completed=:completed
			WHERE id=:id`, task)
		if err != nil {
			logging.LogError(err, "Failed to update task status")
			return
		}
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
}
