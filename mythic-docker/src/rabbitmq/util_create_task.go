package rabbitmq

import (
	"encoding/json"
	"fmt"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/mitchellh/mapstructure"
	"strconv"
	"strings"
	"sync"
	"time"
)

var (
	NonPayloadCommands = []string{"help", "clear"}
)

type CreateTaskInput struct {
	CallbackDisplayID       int
	CurrentOperationID      int
	OperatorID              int
	IsOperatorAdmin         bool
	CommandName             string
	DisabledCommandID       *int
	Params                  string
	OriginalParams          *string
	TaskingLocation         *string
	Token                   *int
	ParameterGroupName      *string
	ParentTaskID            *int
	GroupName               *string
	SubtaskCallbackFunction *string
	GroupCallbackFunction   *string
	FileIDs                 []string
	IsInteractiveTask       bool
	InteractiveTaskType     *int
}

type CreateTaskResponse struct {
	Status        string `json:"status"`
	Error         string `json:"error"`
	TaskID        int    `json:"id"`
	TaskDisplayID int    `json:"display_id"`
}

type submittedTask struct {
	TaskID              int
	IsInteractiveTask   bool
	InteractiveTaskType int
	ParentTaskID        int
	CallbackID          int
	OperationID         int
}
type submittedTasksForAgents struct {
	Tasks *[]submittedTask
	sync.RWMutex
}

var submittedTasksAwaitingFetching submittedTasksForAgents

func (s *submittedTasksForAgents) Initialize() {
	currentTasks := []databaseStructs.Task{}
	taskArray := make([]submittedTask, 0)
	s.Tasks = &taskArray
	if err := database.DB.Select(&currentTasks, `SELECT
	id, callback_id, operation_id, is_interactive_task, interactive_task_type, parent_task_id
	FROM task
	WHERE status='submitted'`); err != nil {
		logging.LogError(err, "Failed to search for tasks")
	} else {
		s.Lock()
		for _, t := range currentTasks {
			*s.Tasks = append(*s.Tasks, submittedTask{
				TaskID:              t.ID,
				CallbackID:          t.CallbackID,
				OperationID:         t.OperationID,
				IsInteractiveTask:   t.IsInteractiveTask,
				InteractiveTaskType: int(t.InteractiveTaskType.Int64),
				ParentTaskID:        int(t.ParentTaskID.Int64),
			})
		}
		s.Unlock()
	}
}
func (s *submittedTasksForAgents) addTask(task databaseStructs.Task) {
	// before we add this for agents to pick up, see if this task can go to a pushC2 connected callback
	if grpc.PushC2Server.CheckClientConnected(task.CallbackID) {
		// we have a task directly for a pushC2 connected callback
		newTaskMsg, err := pushC2AgentMessageGetTasking(task.ID)
		if err != nil {
			logging.LogError(err, "failed to generate pushc2 task message")
		}
		err = sendMessageToDirectPushC2(task.CallbackID, newTaskMsg, false)
		if err != nil {
			logging.LogError(err, "failed to send pushc2 task message")
		} else {
			_, err = database.DB.Exec(`UPDATE callback SET last_checkin=$1
			WHERE id=$2`, time.UnixMicro(0), task.CallbackID)
			if err != nil {
				logging.LogError(err, "Failed to update callback last checkin time")
			}
			return
		}
	} else {
		// check if the task is for a linked agent of a push c2 style client
		connectedPushClient := grpc.PushC2Server.GetConnectedClients()
		for _, clientID := range connectedPushClient {
			if routablePath := callbackGraph.GetBFSPath(clientID, task.CallbackID); routablePath != nil {
				// we have a p2p path from callbackID to task.CallbackID
				delegateMessages := pushC2AgentGetDelegateTaskMessages(task.ID, task.CallbackID, routablePath)
				if delegateMessages != nil {
					newTaskMsg := map[string]interface{}{
						"action":    "get_tasking",
						"delegates": delegateMessages,
					}
					/*
						err := sendMessageToDirectPushC2(clientID, newTaskMsg, false)
						if err != nil {
							logging.LogError(err, "failed to send pushc2 delegate task message")
						} else {
							return
						}

					*/

					responseChan, callbackUUID, base64Encoded, c2ProfileName, trackingID, agentUUIDSize, err := grpc.PushC2Server.GetPushC2ClientInfo(clientID)
					logging.LogDebug("new msg for push c2", "task", newTaskMsg)
					uUIDInfo, err := LookupEncryptionData(c2ProfileName, callbackUUID, false)
					if err != nil {
						logging.LogError(err, "Failed to find encryption data for callback")
						break
					}
					responseBytes, err := EncryptMessage(uUIDInfo, callbackUUID, newTaskMsg, agentUUIDSize, base64Encoded)
					if err != nil {
						logging.LogError(err, "Failed to encrypt message")
						break
					}
					//logging.LogDebug("new encrypted msg for push c2", "enc", string(responseBytes))
					select {
					case responseChan <- services.PushC2MessageFromMythic{
						Message:    responseBytes,
						Success:    true,
						Error:      "",
						TrackingID: trackingID,
					}:
						// everything went ok, return from this
						logging.LogDebug("Sent message back to responseChan")
						return
					case <-time.After(grpc.PushC2Server.GetChannelTimeout()):
						logging.LogError(nil, "timeout trying to send to responseChannel")
						return
					}

				}
			}
		}
	}
	s.Lock()
	defer s.Unlock()
	logging.LogInfo("adding task to SubmittedTasks")
	*s.Tasks = append(*s.Tasks, submittedTask{
		TaskID:              task.ID,
		CallbackID:          task.CallbackID,
		OperationID:         task.OperationID,
		IsInteractiveTask:   task.IsInteractiveTask,
		InteractiveTaskType: int(task.InteractiveTaskType.Int64),
		ParentTaskID:        int(task.ParentTaskID.Int64),
	})
}
func (s *submittedTasksForAgents) addTaskById(taskId int) {
	task := databaseStructs.Task{ID: taskId}
	if err := database.DB.Get(&task, `SELECT id, callback_id, operation_id, is_interactive_task, 
       interactive_task_type, parent_task_id FROM task
		WHERE id=$1`, task.ID); err != nil {
		logging.LogError(err, "Failed to find task to add for submitted tasks")
	} else {
		s.addTask(task)
	}
}
func (s *submittedTasksForAgents) removeTask(taskId int) {
	s.Lock()
	defer s.Unlock()
	for i := 0; i < len(*s.Tasks); i++ {
		if (*s.Tasks)[i].TaskID == taskId {
			*s.Tasks = append((*s.Tasks)[:i], (*s.Tasks)[i+1:]...)
			return
		}
	}
}
func (s *submittedTasksForAgents) getTasksForCallbackId(callbackId int) []int {
	tasks := []int{}
	s.RLock()
	defer s.RUnlock()
	for i := 0; i < len(*s.Tasks); i++ {
		if (*s.Tasks)[i].CallbackID == callbackId && !(*s.Tasks)[i].IsInteractiveTask {
			tasks = append(tasks, (*s.Tasks)[i].TaskID)
		}
	}
	return tasks
}
func (s *submittedTasksForAgents) getInteractiveTasksForCallbackId(callbackId int) []int {
	tasks := []int{}
	s.RLock()
	defer s.RUnlock()
	for i := 0; i < len(*s.Tasks); i++ {
		if (*s.Tasks)[i].CallbackID == callbackId && (*s.Tasks)[i].IsInteractiveTask {
			tasks = append(tasks, (*s.Tasks)[i].TaskID)
		}
	}
	return tasks
}
func (s *submittedTasksForAgents) getOtherCallbackIds(callbackId int) []int {
	callbacks := []int{}
	s.RLock()
	defer s.RUnlock()
	for i := 0; i < len(*s.Tasks); i++ {
		if (*s.Tasks)[i].CallbackID != callbackId && !(*s.Tasks)[i].IsInteractiveTask {
			if !utils.SliceContains(callbacks, (*s.Tasks)[i].CallbackID) {
				callbacks = append(callbacks, (*s.Tasks)[i].CallbackID)
			}
		}
	}
	return callbacks
}
func (s *submittedTasksForAgents) getInteractiveTasksOtherCallbackIds(callbackId int) []int {
	callbacks := []int{}
	s.RLock()
	defer s.RUnlock()
	for i := 0; i < len(*s.Tasks); i++ {
		if (*s.Tasks)[i].CallbackID != callbackId && (*s.Tasks)[i].IsInteractiveTask {
			if !utils.SliceContains(callbacks, (*s.Tasks)[i].CallbackID) {
				callbacks = append(callbacks, (*s.Tasks)[i].CallbackID)
			}
		}
	}
	return callbacks
}

func CreateTask(createTaskInput CreateTaskInput) CreateTaskResponse {
	response := CreateTaskResponse{
		Status: "error",
	}
	callback := databaseStructs.Callback{}
	task := databaseStructs.Task{}
	baseBlockedCommandsProfile := databaseStructs.Disabledcommandsprofile{}
	blockedCommands := []databaseStructs.Disabledcommandsprofile{}
	// get information about the callback we're trying to task
	if err := database.DB.Get(&callback, `SELECT 
		callback.*,
		payload.os "payload.os",
		payload.payload_type_id "payload.payload_type_id",
		payload.id "payload.id"
		FROM callback
		JOIN payload ON callback.registered_payload_id = payload.id
		WHERE
		callback.display_id=$1 and callback.operation_id=$2`,
		createTaskInput.CallbackDisplayID,
		createTaskInput.CurrentOperationID); err != nil {
		logging.LogError(err, "Failed to get callback", "callback_id", createTaskInput.CallbackDisplayID)
		response.Error = "Failed to get callback information"
		return response
	} else if err := database.DB.Get(&callback.Payload.Payloadtype, `SELECT
			"name", id
			FROM payloadtype
			WHERE id=$1`, callback.Payload.PayloadTypeID); err != nil {
		logging.LogError(err, "Failed to get payload type information")
		response.Error = "Failed to get payload type information"
		return response
		// make sure the user's current operation matches that of the callback we're trying tot ask
	} else if createTaskInput.CurrentOperationID != callback.OperationID {
		response.Error = "Cannot task callback that's not in your current operation"
		return response
		// if the callback is locked, make sure this operator can actually task it
	} else if callback.Locked && !createTaskInput.IsOperatorAdmin && int(callback.LockedOperatorID.Int64) != createTaskInput.OperatorID {
		response.Error = "Cannot task callback that's locked!"
		return response
		// if we're not looking at help/clear, fetch the command info and check for block lists
	} else if !utils.SliceContains(NonPayloadCommands, createTaskInput.CommandName) {
		if err := database.DB.Get(&task.Command, `SELECT
			id, attributes
			FROM command WHERE cmd=$1 AND payload_type_id=$2`,
			createTaskInput.CommandName, callback.Payload.PayloadTypeID); err != nil {
			logging.LogError(err, "Failed to get command")
			response.Error = "Failed to get command"
			return response
		}
		task.CommandID.Int64 = int64(task.Command.ID)
		task.CommandID.Valid = true
		// if the operator has a command block list applied, make sure they can issue this task
		if createTaskInput.DisabledCommandID != nil {
			if err := database.DB.Get(&baseBlockedCommandsProfile, `SELECT
				"name" FROM disabledcommandsprofile WHERE id=$1`, *createTaskInput.DisabledCommandID); err != nil {
				logging.LogError(err, "Failed to fetch disabled command profile name")
				response.Error = "Failed to get blocked command list name"
				return response
			} else if err := database.DB.Select(&blockedCommands, `SELECT
				id FROM disabledcommandsprofile WHERE "name"=$1 AND command_id=$2 AND operation_id=$3`,
				baseBlockedCommandsProfile.Name, task.CommandID.Int64, createTaskInput.CurrentOperationID); err != nil {
				logging.LogError(err, "Failed to query for matching blocked commands")
				response.Error = "Failed to get list of blocked commands"
				return response
			} else if len(blockedCommands) > 0 {
				logging.LogError(nil, "Tasking blocked")
				response.Error = "Block list preventing execution"
				return response
			}
		}

	}
	if createTaskInput.OriginalParams == nil {
		createTaskInput.OriginalParams = &createTaskInput.Params
	}
	commandAttributes := CommandAttribute{}
	loadedCommand := databaseStructs.Loadedcommands{}
	// set up the new task for the database
	task.AgentTaskID = uuid.New().String()
	task.CommandName = createTaskInput.CommandName
	task.CallbackID = callback.ID
	task.Callback = callback
	task.OperatorID = createTaskInput.OperatorID
	task.OperationID = createTaskInput.CurrentOperationID
	task.Params = createTaskInput.Params
	task.OriginalParams = *createTaskInput.OriginalParams
	task.DisplayParams = createTaskInput.Params
	task.IsInteractiveTask = createTaskInput.IsInteractiveTask
	if task.IsInteractiveTask {
		if createTaskInput.InteractiveTaskType == nil {
			logging.LogError(nil, "Missing a task type for an interactive task")
			response.Error = "Missing task type for interactive task"
			return response
		} else if InteractiveTask.IsValid(*createTaskInput.InteractiveTaskType) {
			task.InteractiveTaskType.Valid = true
			task.InteractiveTaskType.Int64 = int64(*createTaskInput.InteractiveTaskType)
		} else {
			logging.LogError(nil, "Invalid task type for interactive task")
			response.Error = "Invalid task type for interactive task"
			return response
		}
	}
	if createTaskInput.TaskingLocation == nil {
		task.TaskingLocation = "command_line"
	} else {
		task.TaskingLocation = *createTaskInput.TaskingLocation
	}
	if createTaskInput.ParentTaskID != nil {
		task.ParentTaskID.Valid = true
		task.ParentTaskID.Int64 = int64(*createTaskInput.ParentTaskID)
	}
	if createTaskInput.GroupName != nil {
		task.SubtaskGroupName = *createTaskInput.GroupName
	}
	if createTaskInput.SubtaskCallbackFunction != nil {
		task.SubtaskCallbackFunction = *createTaskInput.SubtaskCallbackFunction
	}
	if createTaskInput.GroupCallbackFunction != nil {
		task.GroupCallbackFunction = *createTaskInput.GroupCallbackFunction
	}
	if task.IsInteractiveTask {
		task.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
	} else {
		task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_PRE
	}
	if createTaskInput.Token != nil && *createTaskInput.Token > 0 {
		token := databaseStructs.Token{}
		if err := database.DB.Get(&token, `SELECT id FROM token WHERE "token_id"=$1`, *createTaskInput.Token); err != nil {
			logging.LogError(err, "Failed to get token information")
			response.Error = "Failed to get token information"
			return response
		}
		task.TokenID.Int64 = int64(token.ID)
		task.TokenID.Valid = true
	}
	if createTaskInput.ParameterGroupName == nil {
		task.ParameterGroupName = "Default"
	} else {
		task.ParameterGroupName = *createTaskInput.ParameterGroupName
	}
	if createTaskInput.CommandName == "clear" {
		return handleClearCommand(createTaskInput, callback, task)
	} else if createTaskInput.CommandName == "help" {
		return handleHelpCommand(createTaskInput, callback, task)
		// make sure the command matches the OS for cases where all commands are built into the agent
	} else if err := mapstructure.Decode(task.Command.Attributes.StructValue(), &commandAttributes); err != nil {
		logging.LogError(err, "Failed to parse out command attributes")
		response.Error = "Failed to parse command attributes"
		return response
	} else if len(commandAttributes.SupportedOS) > 0 && !utils.SliceContains(commandAttributes.SupportedOS, callback.Payload.Os) {
		logging.LogError(nil, "Trying to issue command that doesn't match supported OS of payload")
		response.Error = "Trying to issue command that doesn't match supported OS of payload"
		return response
		// make sure the command is loaded into this callback
	} else if err := database.DB.Get(&loadedCommand, `SELECT
		id FROM loadedcommands WHERE command_id=$1 AND callback_id=$2`,
		task.Command.ID, callback.ID); err != nil {
		logging.LogError(err, "Tried to run a command that's not loaded in that callback")
		response.Error = "Command not loaded into current callback"
		return response
		// add the preprocessing task to the database before sending it off to the container
	} else if err := addTaskToDatabase(&task); err != nil {
		response.Error = "Failed to create task in database"
		return response
	}
	associateUploadedFilesWithTask(&task, createTaskInput.FileIDs)
	if task.IsInteractiveTask {
		go submittedTasksAwaitingFetching.addTask(task)
		return CreateTaskResponse{
			Status:        "success",
			TaskID:        task.ID,
			TaskDisplayID: task.DisplayID,
		}
	} else {
		return submitTaskToContainer(task.ID)
	}

}

func associateUploadedFilesWithTask(task *databaseStructs.Task, files []string) {
	for _, fileID := range files {
		if _, err := database.DB.Exec(`UPDATE filemeta SET 
			task_id=$1, host=$2
			WHERE
			agent_file_id=$3 AND operation_id=$4`, task.ID, task.Callback.Host, fileID, task.OperationID); err != nil {
			logging.LogError(err, "Failed to update task association for file")
		}
	}
}
func addTaskToDatabase(task *databaseStructs.Task) error {
	// create the task in the database
	//logging.LogInfo("adding task to database", "task", task)
	transaction, err := database.DB.Beginx()
	if err != nil {
		logging.LogError(err, "Failed to begin transaction")
		return err
	}
	defer transaction.Rollback()
	_, err = transaction.Exec(`LOCK TABLE task`)
	if err != nil {
		logging.LogError(err, "Failed to lock callback table")
		return err
	}
	if statement, err := transaction.PrepareNamed(`INSERT INTO task 
	(agent_task_id,command_name,callback_id,operator_id,command_id,token_id,params,
		original_params,display_params,status,tasking_location,parameter_group_name,
		parent_task_id,subtask_callback_function,group_callback_function,subtask_group_name,operation_id,
	    is_interactive_task, interactive_task_type)
		VALUES (:agent_task_id, :command_name, :callback_id, :operator_id, :command_id, :token_id, :params,
			:original_params, :display_params, :status, :tasking_location, :parameter_group_name,
			:parent_task_id, :subtask_callback_function, :group_callback_function, :subtask_group_name, :operation_id,
		        :is_interactive_task, :interactive_task_type)
			RETURNING id`); err != nil {
		logging.LogError(err, "Failed to make a prepared statement for new task creation")
		return err
	} else if err := statement.Get(&task.ID, task); err != nil {
		logging.LogError(err, "Failed to create new task in database")
		return err
	} else if err = transaction.Commit(); err != nil {
		logging.LogError(err, "Failed to commit transaction of creating new callback")
		return err
	} else {
		go emitTaskLog(task.ID)
		return nil
	}
}

func handleClearCommand(createTaskInput CreateTaskInput, callback databaseStructs.Callback, task databaseStructs.Task) CreateTaskResponse {
	output := CreateTaskResponse{
		Status: "error",
		Error:  "not implemented",
	}
	task.Status = "processing"
	if err := addTaskToDatabase(&task); err != nil {
		logging.LogError(err, "Failed to add task to database")
		output.Error = err.Error()
		return output
	}
	tasksToClear := []databaseStructs.Task{}
	if createTaskInput.Params == "" || strings.ToLower(createTaskInput.Params) == "all" {
		if err := database.DB.Select(&tasksToClear, `SELECT id FROM task WHERE 
			operation_id=$1 AND (status='submitted' OR status='delegating...') AND callback_id=$2`,
			task.OperationID, callback.ID); err != nil {
			logging.LogError(err, "Failed to fetch tasks to clear")
			go addErrToTask(task.ID, fmt.Sprintf("Failed to fetch tasks to clear: %v\n", err))
			go updateTaskStatus(task.ID, "error", true)
			output.Error = err.Error()
			return output
		}
	} else if taskNum, err := strconv.Atoi(createTaskInput.Params); err != nil {
		logging.LogError(err, "Failed to process task number to clear")
		go addErrToTask(task.ID, fmt.Sprintf("Failed parse task number: %v\n", err))
		go updateTaskStatus(task.ID, "error", true)
		output.Error = err.Error()
		return output
	} else if err := database.DB.Select(&tasksToClear, `SELECT id FROM task WHERE 
			operation_id=$1 AND status='submitted' AND callback_id=$2 AND display_id=$3`,
		task.OperationID, callback.ID, taskNum); err != nil {
		logging.LogError(err, "Failed to fetch task to clear")
		go addErrToTask(task.ID, fmt.Sprintf("Failed to fetch task to clear: %v\n", err))
		go updateTaskStatus(task.ID, "error", true)
		output.Error = err.Error()
		return output
	}
	outputMsg := ""
	if len(tasksToClear) == 0 {
		outputMsg = "No tasks by that number in the 'submitted' state\n"
	} else {
		for _, t := range tasksToClear {
			submittedTasksAwaitingFetching.removeTask(t.ID)
			go updateTaskStatus(t.ID, "cleared", true)
			outputMsg += fmt.Sprintf("Cleared Task %d\n", t.ID)
		}
	}
	go updateTaskStatus(task.ID, "completed", true)
	go addOutputToTask(task.ID, outputMsg, task.OperationID)
	output.Status = "success"
	output.Error = ""
	return output
}
func addOutputToTask(taskId int, output string, operationId int) {
	if _, err := database.DB.Exec(`INSERT INTO response (task_id, response, operation_id)
		VALUES ($1, $2, $3)`, taskId, output, operationId); err != nil {
		logging.LogError(err, "Failed to add output to task")
	}
}
func addErrToTask(taskId int, output string) {
	if _, err := database.DB.Exec(`UPDATE task SET stderr=$1 WHERE id=$2`, output, taskId); err != nil {
		logging.LogError(err, "Failed to update stderr for task")
	}
}
func updateTaskStatus(taskId int, status string, completed bool) {
	if _, err := database.DB.Exec(`UPDATE task SET status=$1, completed=$2 WHERE id=$3`,
		status, completed, taskId); err != nil {
		logging.LogError(err, "Failed to update task status")
	}
}
func handleHelpCommand(createTaskInput CreateTaskInput, callback databaseStructs.Callback, task databaseStructs.Task) CreateTaskResponse {
	output := CreateTaskResponse{
		Status: "error",
		Error:  "not implemented",
	}
	task.Status = "processing"
	if err := addTaskToDatabase(&task); err != nil {
		logging.LogError(err, "Failed to add task to database")
		output.Error = err.Error()
		return output
	}
	output.TaskID = task.ID
	output.TaskDisplayID = task.DisplayID
	if task.Params == "" {
		// looking for help about all loaded commands
		loadedCommands := []databaseStructs.Loadedcommands{}
		if err := database.DB.Select(&loadedCommands, `SELECT
		command.cmd "command.cmd",
		command.attributes "command.attributes",
		command.description "command.description",
		command.help_cmd "command.help_cmd"
		FROM loadedcommands
		JOIN command ON command_id=command.id
		WHERE loadedcommands.callback_id=$1 ORDER BY command.cmd ASC`, callback.ID); err != nil {
			logging.LogError(err, "Failed to fetch loaded commands")
			go updateTaskStatus(task.ID, "error", true)
			go addErrToTask(task.ID, fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error()))
			output.Error = fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error())
			return output
		} else {
			responseUserOutput := "Loaded Commands In Agent:\n"
			for _, cmd := range loadedCommands {
				commandAttributes := CommandAttribute{}
				// for a given command, first check that it's appropriate for our callback.payload.os
				if err := mapstructure.Decode(cmd.Command.Attributes.StructValue(), &commandAttributes); err != nil {
					logging.LogError(err, "Failed to parse out command attributes")
				} else if len(commandAttributes.SupportedOS) == 0 || utils.SliceContains(commandAttributes.SupportedOS, callback.Payload.Os) {
					responseUserOutput += fmt.Sprintf("\n%s\n\tUsage: %s\n\tDescription: %s",
						cmd.Command.Cmd, cmd.Command.HelpCmd, cmd.Command.Description)
				}
			}
			go updateTaskStatus(task.ID, "completed", true)
			go addOutputToTask(task.ID, responseUserOutput, task.OperationID)
			output.Error = ""
			output.Status = "success"
			return output
		}
	} else if task.Params == "help" {
		// looking for detailed help about a specific command
		responseOutput := `The 'help' command gives detailed information about specific commands or general information about all available commands.\n`
		go updateTaskStatus(task.ID, "completed", true)
		go addOutputToTask(task.ID, responseOutput, task.OperationID)
		output.Error = ""
		output.Status = "success"
		return output
	} else if task.Params == "clear" {
		responseOutput := "The 'clear' command will mark tasks as 'cleared' so that they can't be picked up by agents'.\n"
		responseOutput += "Clear with no arguments or with the 'all' argument will clear all tasking in the 'submitted' or 'delegating...' state for the current callback.\n"
		responseOutput += "Clear can also take one argument, the task number, to clear just that one task.\n"
		go updateTaskStatus(task.ID, "completed", true)
		go addOutputToTask(task.ID, responseOutput, task.OperationID)
		output.Error = ""
		output.Status = "success"
		return output
	} else {
		command := databaseStructs.Command{}
		commandParameters := []databaseStructs.Commandparameters{}
		if err := database.DB.Get(&command, `SELECT
		attributes,
		description,
		help_cmd
		FROM command
		WHERE cmd=$1 AND payload_type_id=$2`, task.Params, callback.Payload.PayloadTypeID); err != nil {
			logging.LogError(err, "Failed to fetch loaded commands")
			go updateTaskStatus(task.ID, "error", true)
			go addErrToTask(task.ID, fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error()))
			output.Error = fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error())
			return output
		}
		if err := database.DB.Select(&commandParameters, `SELECT
		commandparameters.*,
		command.attributes "command.attributes",
		command.description "command.description",
		command.help_cmd "command.help_cmd"
		FROM commandparameters
		JOIN command ON command_id=command.id
		WHERE command.payload_type_id=$1 AND command.cmd=$2`, callback.Payload.PayloadTypeID, task.Params); err != nil {
			logging.LogError(err, "Failed to fetch loaded commands")
			go updateTaskStatus(task.ID, "error", true)
			go addErrToTask(task.ID, fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error()))
			output.Error = fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error())
			return output
		} else {
			responseUserOutput := ""
			commandAttributes := CommandAttribute{}
			// for a given command, first check that it's appropriate for our callback.payload.os
			if err := mapstructure.Decode(command.Attributes.StructValue(), &commandAttributes); err != nil {
				logging.LogError(err, "Failed to parse out command attributes")
			} else {
				if attributesJSON, err := json.MarshalIndent(commandAttributes, "", "\t"); err != nil {
					responseUserOutput += fmt.Sprintf("\n%s\n\tUsage: %s\n\tDescription: %s\nAttributes: %v\nParameters:\n\n",
						command.Cmd, command.HelpCmd, command.Description, err.Error())
					logging.LogError(err, "Failed to marshal command attributes")
				} else {
					responseUserOutput += fmt.Sprintf("\n%s\n\tUsage: %s\n\tDescription: %s\nAttributes: %s\nParameters:\n\n",
						command.Cmd, command.HelpCmd, command.Description, attributesJSON)
				}

			}
			paramGroupNames := []string{}
			for _, p := range commandParameters {
				if !utils.SliceContains(paramGroupNames, p.ParameterGroupName) {
					paramGroupNames = append(paramGroupNames, p.ParameterGroupName)
				}
			}
			for _, groupName := range paramGroupNames {
				responseUserOutput += fmt.Sprintf("Parameter Group: %s\n", groupName)
				for _, param := range commandParameters {
					if param.ParameterGroupName == groupName {
						responseUserOutput += fmt.Sprintf("\tParameter Name: %s\n\t\tCLI Name: %s\n\t\tDisplay Name: %s\n\t\tDescription: %s\n\t\tParameter Type: %s\n",
							param.Name, param.CliName, param.DisplayName, param.Description, param.Type)
						responseUserOutput += fmt.Sprintf("\t\tRequired: %v\n", param.Required)
					}
				}
			}
			go updateTaskStatus(task.ID, "success", true)
			go addOutputToTask(task.ID, responseUserOutput, task.OperationID)
			output.Error = ""
			output.Status = "success"
			return output
		}
	}
}

func submitTaskToContainer(taskID int) CreateTaskResponse {
	output := CreateTaskResponse{
		Status: "error",
		Error:  "not implemented",
	}
	taskMessage := GetTaskConfigurationForContainer(taskID)
	if err := RabbitMQConnection.SendPtTaskOPSECPre(taskMessage); err != nil {
		logging.LogError(err, "Failed to send task to payload type")
		output.Error = err.Error()
		if _, err := database.DB.Exec(`UPDATE task SET status=$1 WHERE id=$2`,
			TASK_STATUS_CONTAINER_DOWN, taskID); err != nil {
			logging.LogError(err, "Failed to update task status")
		}
	} else {
		output.Status = "success"
		output.Error = ""
		output.TaskID = taskID
		output.TaskDisplayID = taskMessage.Task.DisplayID
	}
	return output
}
