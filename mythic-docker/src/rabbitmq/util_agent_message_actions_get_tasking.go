package rabbitmq

import (
	"database/sql"
	"errors"
	"fmt"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
	"github.com/mitchellh/mapstructure"
)

type agentMessageGetTasking struct {
	GetDelegateTasks bool                   `json:"get_delegate_tasks" mapstructure:"get_delegate_tasks"`
	TaskingSize      int                    `json:"tasking_size" mapstructure:"tasking_size"`
	Other            map[string]interface{} `json:"-" mapstructure:",remain"` // capture any 'other' keys that were passed in so we can reply back with them
}

type agentMessageGetTaskingTask struct {
	Timestamp  int64  `json:"timestamp"`
	Command    string `json:"command"`
	Parameters string `json:"parameters"`
	ID         string `json:"id"`
	Token      *int   `json:"token,omitempty"`
}

type agentMessageTaskRow struct {
	ID           int           `db:"id"`
	CallbackID   int           `db:"callback_id"`
	AgentTaskID  string        `db:"agent_task_id"`
	Timestamp    time.Time     `db:"timestamp"`
	CommandName  string        `db:"command_name"`
	Params       string        `db:"params"`
	AgentTokenID sql.NullInt64 `db:"agent_token_id"`
}

func getAgentMessageTaskRows(taskIDs []int) ([]agentMessageTaskRow, error) {
	currentTasks := []agentMessageTaskRow{}
	if len(taskIDs) == 0 {
		return currentTasks, nil
	}
	query, args, err := sqlx.Named(`SELECT
		task.agent_task_id, task."timestamp", task.command_name, task.params, task.id, task.callback_id,
		token.token_id "agent_token_id"
		FROM task
		LEFT JOIN token ON task.token_id = token.id
		WHERE task.id IN (:ids)
		ORDER BY task.id ASC`, map[string]interface{}{
		"ids": taskIDs,
	})
	if err != nil {
		return currentTasks, err
	}
	query, args, err = sqlx.In(query, args...)
	if err != nil {
		return currentTasks, err
	}
	query = database.DB.Rebind(query)
	err = database.DB.Select(&currentTasks, query, args...)
	return currentTasks, err
}

func markAgentMessageTasksProcessing(taskIDs []int, processingTime time.Time) error {
	if len(taskIDs) == 0 {
		return nil
	}
	query, args, err := sqlx.Named(`UPDATE task SET
		status=:status,
		status_timestamp_processing=:status_timestamp_processing
		WHERE id IN (:ids)`, map[string]interface{}{
		"ids":                         taskIDs,
		"status":                      PT_TASK_FUNCTION_STATUS_PROCESSING,
		"status_timestamp_processing": processingTime,
	})
	if err != nil {
		return err
	}
	query, args, err = sqlx.In(query, args...)
	if err != nil {
		return err
	}
	query = database.DB.Rebind(query)
	_, err = database.DB.Exec(query, args...)
	return err
}

func buildAgentMessageTask(task agentMessageTaskRow) agentMessageGetTaskingTask {
	newTask := agentMessageGetTaskingTask{
		Command:    task.CommandName,
		Parameters: task.Params,
		ID:         task.AgentTaskID,
		Timestamp:  task.Timestamp.Unix(),
	}
	if task.AgentTokenID.Valid {
		tokenID := int(task.AgentTokenID.Int64)
		newTask.Token = &tokenID
	}
	return newTask
}

func handleAgentMessageGetTasking(incoming *map[string]interface{}, callbackID int) (map[string]interface{}, error) {
	// got message:
	/*
		{
		  "action": "get_tasking",
		  "tasking_size": -1,
		  "get_delegate_tasks": true
		}
	*/
	// default for get_delegate_tasks is true
	// need to:
	/*
		1. check for direct tasks
		2. check for delegate tasks
	*/
	agentMessage := agentMessageGetTasking{}
	currentTasks := []databaseStructs.Task{}
	if taskIDs := submittedTasksAwaitingFetching.getTasksForCallbackId(callbackID); len(taskIDs) > 0 {
		query, args, err := sqlx.Named(`SELECT 
    		agent_task_id, "timestamp", command_name, params, id, token_id
			FROM task WHERE id IN (:ids) ORDER BY id ASC`, map[string]interface{}{
			"ids": taskIDs,
		})
		if err != nil {
			logging.LogError(err, "Failed to make named statement when searching for tasks")
			return nil, errors.New("failed to make statement to search for tasks")
		}
		query, args, err = sqlx.In(query, args...)
		if err != nil {
			logging.LogError(err, "Failed to do sqlx.In")
			return nil, errors.New("failed to make query to search for tasks")
		}
		query = database.DB.Rebind(query)
		err = database.DB.Select(&currentTasks, query, args...)
		if err != nil {
			logging.LogError(err, "Failed to exec sqlx.IN modified statement")
			return nil, errors.New("failed to search for tasks")
		}
	}

	err := mapstructure.Decode(incoming, &agentMessage)
	if err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into agentMessageGetTasking struct: %s", err.Error()))
	}
	tasksToIssue := []agentMessageGetTaskingTask{}
	currentTaskCount := 0
	for _, task := range currentTasks {
		if currentTaskCount < agentMessage.TaskingSize || agentMessage.TaskingSize < 0 {
			newTask := agentMessageGetTaskingTask{
				Command:    task.CommandName,
				Parameters: task.Params,
				ID:         task.AgentTaskID,
				Timestamp:  task.Timestamp.Unix(),
			}
			if task.TokenID.Valid {
				var tokenID int
				if err := database.DB.Get(&tokenID, `SELECT token_id FROM token WHERE id=$1`, task.TokenID.Int64); err != nil {
					logging.LogError(err, "failed to get token information")
				} else {
					newTask.Token = &tokenID
				}
			}
			tasksToIssue = append(tasksToIssue, newTask)
			if _, err := database.DB.Exec(`UPDATE task SET
					status=$2, status_timestamp_processing=$3
					WHERE id=$1`, task.ID, PT_TASK_FUNCTION_STATUS_PROCESSING, time.Now().UTC()); err != nil {
				logging.LogError(err, "Failed to update task status to processing")
			} else {
				submittedTasksAwaitingFetching.removeTask(task.ID)
				go addMitreAttackTaskMapping(task.ID)
			}
			currentTaskCount += 1
		}
	}
	response := map[string]interface{}{}
	response["tasks"] = tasksToIssue
	delete(*incoming, "tasking_size")
	reflectBackOtherKeys(&response, &agentMessage.Other)
	//logging.LogDebug("agent asked for tasking", "tasks", response)
	return response, nil
}

func getDelegateTaskMessages(callbackID int, agentUUIDLength int, updateCheckinTime bool) []delegateMessageResponse {
	// check to see if there's other submitted tasking that is routable through our callback
	if !callbackGraph.CanHaveDelegates(callbackID) {
		return nil
	}
	delegateMessages := []delegateMessageResponse{}
	// get a list of all the other callbacks with tasks waiting to be processed
	if callbackIds := submittedTasksAwaitingFetching.getOtherCallbackIds(callbackID); len(callbackIds) > 0 {
		// check if there's a route between our callback and the callback with a task
		routableCallbackIds := make([]int, 0, len(callbackIds))
		routablePaths := make(map[int][]cbGraphAdjMatrixEntry)
		for _, targetCallbackId := range callbackIds {
			if routablePath := callbackGraph.GetBFSPath(callbackID, targetCallbackId); routablePath != nil && len(routablePath) > 0 {
				// there's a route between our callback and the target callback for some sort of task
				logging.LogDebug("task exists for callback we can route to")
				routableCallbackIds = append(routableCallbackIds, targetCallbackId)
				routablePaths[targetCallbackId] = routablePath
			}
		}
		if len(routableCallbackIds) == 0 {
			return delegateMessages
		}
		taskIDsByCallbackID := submittedTasksAwaitingFetching.getTasksForCallbackIds(routableCallbackIds)
		allTaskIDs := make([]int, 0)
		for _, targetCallbackId := range routableCallbackIds {
			allTaskIDs = append(allTaskIDs, taskIDsByCallbackID[targetCallbackId]...)
		}
		if len(allTaskIDs) == 0 {
			return delegateMessages
		}
		currentTasks, err := getAgentMessageTaskRows(allTaskIDs)
		if err != nil {
			logging.LogError(err, "Failed to fetch delegated tasking")
			return delegateMessages
		}
		tasksByCallbackID := make(map[int][]agentMessageGetTaskingTask)
		issuedTaskIDs := make([]int, 0, len(currentTasks))
		for _, currentTask := range currentTasks {
			if _, ok := routablePaths[currentTask.CallbackID]; !ok {
				continue
			}
			tasksByCallbackID[currentTask.CallbackID] = append(tasksByCallbackID[currentTask.CallbackID], buildAgentMessageTask(currentTask))
			issuedTaskIDs = append(issuedTaskIDs, currentTask.ID)
		}
		if len(issuedTaskIDs) == 0 {
			return delegateMessages
		}
		if err := markAgentMessageTasksProcessing(issuedTaskIDs, time.Now().UTC()); err != nil {
			logging.LogError(err, "Failed to update delegated task status to processing")
			return delegateMessages
		}
		submittedTasksAwaitingFetching.removeTasksAfterProcessingUpdate(issuedTaskIDs)
		for _, taskID := range issuedTaskIDs {
			go addMitreAttackTaskMapping(taskID)
		}
		for _, targetCallbackId := range routableCallbackIds {
			tasks := tasksByCallbackID[targetCallbackId]
			if len(tasks) == 0 {
				continue
			}
			routablePath := routablePaths[targetCallbackId]
			newTask := map[string]interface{}{
				"action": "get_tasking",
				"tasks":  tasks,
			}
			wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, updateCheckinTime)
			if err != nil {
				logging.LogError(err, "Failed to recursively encrypt message")
				continue
			}
			delegateMessages = append(delegateMessages, delegateMessageResponse{
				Message:       string(wrappedMessage),
				SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
				C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
			})
		}
	}
	return delegateMessages
}

func getDelegateProxyMessages(callbackID int, agentUUIDLength int, updateCheckinTime bool) []delegateMessageResponse {
	// check to see if there's other submitted tasking that is routable through our callback
	if !callbackGraph.CanHaveDelegates(callbackID) {
		return nil
	}
	delegateMessages := []delegateMessageResponse{}
	// get a list of all the other callbacks with proxy ports open
	if callbackIds := proxyPorts.GetOtherCallbackIds(callbackID); len(callbackIds) > 0 {
		// check if there's a route between our callback and the callback with a task
		for _, targetCallbackId := range callbackIds {
			if routablePath := callbackGraph.GetBFSPath(callbackID, targetCallbackId); routablePath != nil && len(routablePath) > 0 {
				// there's a route between our callback and the target callback for some sort of proxy data
				proxyData, err := proxyPorts.GetDataForCallbackIdAllTypes(targetCallbackId)
				if err != nil {
					logging.LogError(err, "Failed to get proxy data for routable callback")
					continue
				}
				newTask := map[string]interface{}{
					"action": "get_tasking",
				}
				gotData := false
				if len(proxyData.Socks) > 0 {
					// now that we have a path, need to recursively encrypt and wrap
					newTask[CALLBACK_PORT_TYPE_SOCKS] = proxyData.Socks
					gotData = true
				}
				if len(proxyData.Rpfwd) > 0 {
					// now that we have a path, need to recursively encrypt and wrap
					newTask[CALLBACK_PORT_TYPE_RPORTFWD] = proxyData.Rpfwd
					gotData = true
				}
				if len(proxyData.Interactive) > 0 {
					// now that we have a path, need to recursively encrypt and wrap
					newTask[CALLBACK_PORT_TYPE_INTERACTIVE] = proxyData.Interactive
					gotData = true
				}
				if gotData {
					wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, updateCheckinTime)
					if err != nil {
						logging.LogError(err, "Failed to recursively encrypt message")
						continue
					}
					delegateMessages = append(delegateMessages, delegateMessageResponse{
						Message:       string(wrappedMessage),
						SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
						C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
					})
				}
			}
		}
	}
	return delegateMessages
}
