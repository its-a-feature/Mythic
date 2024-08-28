package rabbitmq

import (
	"errors"
	"fmt"
	"github.com/jmoiron/sqlx"
	"time"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
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
		if query, args, err := sqlx.Named(`SELECT 
    		agent_task_id, "timestamp", command_name, params, id, token_id
			FROM task WHERE id IN (:ids) ORDER BY id ASC`, map[string]interface{}{
			"ids": taskIDs,
		}); err != nil {
			logging.LogError(err, "Failed to make named statement when searching for tasks")
			return nil, errors.New("failed to make statement to search for tasks")
		} else if query, args, err := sqlx.In(query, args...); err != nil {
			logging.LogError(err, "Failed to do sqlx.In")
			return nil, errors.New("failed to make query to search for tasks")
		} else {
			query = database.DB.Rebind(query)
			if err := database.DB.Select(&currentTasks, query, args...); err != nil {
				logging.LogError(err, "Failed to exec sqlx.IN modified statement")
				return nil, errors.New("failed to search for tasks")
			}
		}
	}

	if err := mapstructure.Decode(incoming, &agentMessage); err != nil {
		logging.LogError(err, "Failed to decode agent message into struct")
		return nil, errors.New(fmt.Sprintf("Failed to decode agent message into agentMessageGetTasking struct: %s", err.Error()))
	} else {
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
		for _, targetCallbackId := range callbackIds {
			if routablePath := callbackGraph.GetBFSPath(callbackID, targetCallbackId); routablePath != nil {
				// there's a route between our callback and the target callback for some sort of task
				logging.LogDebug("task exists for callback we can route to")
				currentTasks := []databaseStructs.Task{}
				if taskIDs := submittedTasksAwaitingFetching.getTasksForCallbackId(targetCallbackId); len(taskIDs) > 0 {
					if query, args, err := sqlx.Named(`SELECT 
						agent_task_id, "timestamp", command_name, params, id, token_id
						FROM task WHERE id IN (:ids) ORDER BY id ASC`, map[string]interface{}{
						"ids": taskIDs,
					}); err != nil {
						logging.LogError(err, "Failed to make named statement when searching for tasks")
						continue
					} else if query, args, err := sqlx.In(query, args...); err != nil {
						logging.LogError(err, "Failed to do sqlx.In")
						continue
					} else {
						query = database.DB.Rebind(query)
						if err := database.DB.Select(&currentTasks, query, args...); err != nil {
							logging.LogError(err, "Failed to exec sqlx.IN modified statement")
							continue
						}
					}
					for i := 0; i < len(currentTasks); i++ {
						// now that we have a path, need to recursively encrypt and wrap
						var tokenID int
						if currentTasks[i].TokenID.Valid {
							if err := database.DB.Get(&tokenID, `SELECT token_id FROM token WHERE id=$1`, currentTasks[i].TokenID.Int64); err != nil {
								logging.LogError(err, "failed to get token information")
							}
						}
						newTask := map[string]interface{}{
							"action": "get_tasking",
							"tasks": []agentMessageGetTaskingTask{
								{
									Command:    currentTasks[i].CommandName,
									Parameters: currentTasks[i].Params,
									ID:         currentTasks[i].AgentTaskID,
									Timestamp:  currentTasks[i].Timestamp.Unix(),
									Token:      &tokenID,
								},
							},
						}

						if _, err := database.DB.Exec(`UPDATE task SET
							status=$2, status_timestamp_processing=$3
							WHERE id=$1`, currentTasks[i].ID, PT_TASK_FUNCTION_STATUS_PROCESSING, time.Now().UTC()); err != nil {
							logging.LogError(err, "Failed to update task status to processing")
						} else if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, updateCheckinTime); err != nil {
							logging.LogError(err, "Failed to recursively encrypt message")
						} else {
							submittedTasksAwaitingFetching.removeTask(currentTasks[i].ID)
							go addMitreAttackTaskMapping(currentTasks[i].ID)
							delegateMessages = append(delegateMessages, delegateMessageResponse{
								Message:       string(wrappedMessage),
								SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
								C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
							})
						}
					}

				}
			}
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
			if routablePath := callbackGraph.GetBFSPath(callbackID, targetCallbackId); routablePath != nil {
				// there's a route between our callback and the target callback for some sort of proxy data
				if messages, err := proxyPorts.GetDataForCallbackId(targetCallbackId, CALLBACK_PORT_TYPE_SOCKS); err != nil {
					logging.LogError(err, "Failed to get socks proxy data for routable callback")
				} else if messages != nil {
					// now that we have a path, need to recursively encrypt and wrap
					newTask := map[string]interface{}{
						"action":                 "get_tasking",
						CALLBACK_PORT_TYPE_SOCKS: messages,
					}
					if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, updateCheckinTime); err != nil {
						logging.LogError(err, "Failed to recursively encrypt message")
					} else {
						delegateMessages = append(delegateMessages, delegateMessageResponse{
							Message:       string(wrappedMessage),
							SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
							C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
						})
					}
				}
				if messages, err := proxyPorts.GetDataForCallbackId(targetCallbackId, CALLBACK_PORT_TYPE_RPORTFWD); err != nil {
					logging.LogError(err, "Failed to get rpfwd proxy data for routable callback")
				} else if messages != nil {
					// now that we have a path, need to recursively encrypt and wrap
					newTask := map[string]interface{}{
						"action":                    "get_tasking",
						CALLBACK_PORT_TYPE_RPORTFWD: messages,
					}
					if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, updateCheckinTime); err != nil {
						logging.LogError(err, "Failed to recursively encrypt message")
					} else {
						delegateMessages = append(delegateMessages, delegateMessageResponse{
							Message:       string(wrappedMessage),
							SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
							C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
						})
					}
				}
				if messages, err := proxyPorts.GetDataForCallbackId(targetCallbackId, CALLBACK_PORT_TYPE_INTERACTIVE); err != nil {
					logging.LogError(err, "Failed to get interactive proxy data for routable callback")
				} else if messages != nil {
					// now that we have a path, need to recursively encrypt and wrap
					newTask := map[string]interface{}{
						"action":                       "get_tasking",
						CALLBACK_PORT_TYPE_INTERACTIVE: messages,
					}
					if wrappedMessage, err := RecursivelyEncryptMessage(routablePath, newTask, updateCheckinTime); err != nil {
						logging.LogError(err, "Failed to recursively encrypt message")
					} else {
						delegateMessages = append(delegateMessages, delegateMessageResponse{
							Message:       string(wrappedMessage),
							SuppliedUuid:  routablePath[len(routablePath)-1].DestinationAgentId,
							C2ProfileName: routablePath[len(routablePath)-1].C2ProfileName,
						})
					}
				}
			}
		}
	}
	return delegateMessages
}
