package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskUpdateMessage struct {
	TaskID            int     `json:"task_id"`
	UpdateStatus      *string `json:"update_status,omitempty"`
	UpdateStdout      *string `json:"update_stdout,omitempty"`
	UpdateStderr      *string `json:"update_stderr,omitempty"`
	UpdateCommandName *string `json:"update_command_name,omitempty"`
	UpdateCompleted   *bool   `json:"update_completed,omitempty"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTaskUpdateMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TASK_UPDATE,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TASK_UPDATE,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTaskUpdate, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskUpdate(input MythicRPCTaskUpdateMessage) MythicRPCTaskUpdateMessageResponse {
	response := MythicRPCTaskUpdateMessageResponse{
		Success: false,
	}
	task := databaseStructs.Task{}
	if err := database.DB.Get(&task, `SELECT 
	id, status, stdout, stderr, command_name, completed
	FROM task WHERE id=$1`, input.TaskID); err != nil {
		response.Error = err.Error()
		return response
	}
	if input.UpdateStatus != nil {
		task.Status = *input.UpdateStatus
	}
	if input.UpdateStdout != nil {
		task.Stdout += *input.UpdateStdout
	}
	if input.UpdateStderr != nil {
		task.Stderr += *input.UpdateStderr
	}
	if input.UpdateCommandName != nil {
		task.CommandName = *input.UpdateCommandName
	}
	if input.UpdateCompleted != nil {
		task.Completed = *input.UpdateCompleted
	}
	if _, err := database.DB.NamedExec(`UPDATE task SET
	status=:status, stdout=:stdout, stderr=:stderr, command_name=:command_name, completed=:completed
	WHERE id=:id`, task); err != nil {
		response.Error = err.Error()
		return response
	} else {
		response.Success = true
		if task.Completed {
			go CheckAndProcessTaskCompletionHandlers(task.ID)
		}
		return response
	}
}
func processMythicRPCTaskUpdate(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskUpdateMessage{}
	responseMsg := MythicRPCTaskUpdateMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCTaskUpdate(incomingMessage)
	}
	return responseMsg
}
