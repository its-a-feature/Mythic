package rabbitmq

import (
	"encoding/json"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCTaskSearchMessage struct {
	TaskID              int       `json:"task_id"`
	SearchTaskID        *int      `json:"search_task_id"`
	SearchTaskDisplayID *int      `json:"search_task_display_id"`
	SearchAgentTaskID   *string   `json:"agent_task_id,omitempty"`
	SearchHost          *string   `json:"host,omitempty"`
	SearchCallbackID    *int      `json:"callback_id,omitempty"`
	SearchCompleted     *bool     `json:"completed,omitempty"`
	SearchCommandNames  *[]string `json:"command_names,omitempty"`
	SearchParams        *string   `json:"params,omitempty"`
	SearchParentTaskID  *int      `json:"parent_task_id,omitempty"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCTaskSearchMessageResponse struct {
	Success bool                    `json:"success"`
	Error   string                  `json:"error"`
	Tasks   []PTTaskMessageTaskData `json:"tasks"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_TASK_SEARCH,     // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_TASK_SEARCH,     // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCTaskSearch, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCTaskSearch(input MythicRPCTaskSearchMessage) MythicRPCTaskSearchMessageResponse {
	response := MythicRPCTaskSearchMessageResponse{
		Success: false,
	}
	paramDict := make(map[string]interface{})
	setAnySearchValues := false
	searchString := `SELECT task.id FROM task `
	if input.SearchHost != nil {
		searchString += `JOIN callback ON task.callback_id = callback.id `
		searchString += `WHERE callback.host=:host `
		paramDict["host"] = *input.SearchHost
		paramDict["id"] = input.TaskID
		setAnySearchValues = true
	}
	if input.SearchAgentTaskID != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.agent_task_id=:agent_task_id `
		} else {
			searchString += `AND task.agent_task_id=:agent_task_id `
		}
		paramDict["agent_task_id"] = *input.SearchAgentTaskID
		setAnySearchValues = true
	}
	if input.SearchCallbackID != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.callback_id=:callback_id `
		} else {
			searchString += `AND task.callback_id=:callback_id `
		}
		paramDict["callback_id"] = *input.SearchCallbackID
		setAnySearchValues = true
	}
	if input.SearchCommandNames != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.command_name IN (:command_names) `
		} else {
			searchString += `AND task.command_name IN (:command_names) `
		}
		paramDict["command_names"] = *input.SearchCommandNames
		setAnySearchValues = true
	}
	if input.SearchCompleted != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.completed=:completed `
		} else {
			searchString += `AND task.completed=:completed `
		}
		paramDict["completed"] = *input.SearchCompleted
		setAnySearchValues = true
	}
	if input.SearchParams != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.original_params ILIKE :params `
		} else {
			searchString += `AND task.original_params ILIKE :params `
		}
		paramDict["params"] = "%" + *input.SearchParams + "%"
		setAnySearchValues = true
	}
	if input.SearchTaskID != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.id=:search_id `
		} else {
			searchString += `AND task.id=:search_id `
		}
		paramDict["search_id"] = *input.SearchTaskID
		setAnySearchValues = true
	}
	if input.SearchTaskDisplayID != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.display_id=:search_display_id `
		} else {
			searchString += `AND task.display_id=:search_display_id `
		}
		paramDict["search_display_id"] = *input.SearchTaskDisplayID
		setAnySearchValues = true
	}
	if input.SearchParentTaskID != nil {
		if !setAnySearchValues {
			searchString += `WHERE task.parent_task_id=:parent_task_id `
		} else {
			searchString += `AND task.parent_task_id=:parent_task_id `
		}
		paramDict["parent_task_id"] = *input.SearchParentTaskID
		setAnySearchValues = true
	}
	if !setAnySearchValues {
		searchString += `WHERE task.id=:id`
		paramDict["id"] = input.TaskID
	}
	searchString += " ORDER BY task.id DESC"
	query, args, err := sqlx.Named(searchString, paramDict)
	if err != nil {
		logging.LogError(err, "Failed to make named statement when searching for tasks")
		response.Error = err.Error()
		return response
	}
	query, args, err = sqlx.In(query, args...)
	if err != nil {
		logging.LogError(err, "Failed to do sqlx.In")
		response.Error = err.Error()
		return response
	}
	query = database.DB.Rebind(query)
	tasks := []databaseStructs.Task{}
	err = database.DB.Select(&tasks, query, args...)
	if err != nil {
		logging.LogError(err, "Failed to exec sqlx.IN modified statement")
		response.Error = err.Error()
		return response
	}
	for _, task := range tasks {
		response.Tasks = append(response.Tasks, GetTaskMessageTaskInformation(task.ID))
	}
	response.Success = true
	return response
}
func processMythicRPCTaskSearch(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCTaskSearchMessage{}
	responseMsg := MythicRPCTaskSearchMessageResponse{
		Success: false,
	}
	err := json.Unmarshal(msg.Body, &incomingMessage)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
		return responseMsg
	}
	return MythicRPCTaskSearch(incomingMessage)
}
