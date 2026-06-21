package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"math"
	"regexp"
	"sort"
	"strconv"
	"strings"
	"sync"
	"text/tabwriter"
	"time"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	"github.com/its-a-feature/Mythic/database/enums/PushC2Connections"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/its-a-feature/Mythic/grpc"
	"github.com/its-a-feature/Mythic/grpc/services"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/mitchellh/mapstructure"
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
	EventStepInstanceID     int
	APITokensID             int
	PayloadType             *string
	AliasResolution         *OperatorAliasResolution
	AuthContext             RabbitMQAuthContext
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
	Tasks                         *[]submittedTask
	tasksByCallbackID             map[int][]int
	interactiveTasksByCallbackID  map[int][]int
	callbacksWithTasks            []int
	callbacksWithInteractiveTasks []int
	taskByID                      map[int]submittedTask
	sync.RWMutex
}

var submittedTasksAwaitingFetching submittedTasksForAgents

func (s *submittedTasksForAgents) Initialize() {
	currentTasks := []databaseStructs.Task{}
	taskArray := make([]submittedTask, 0)
	s.Lock()
	s.Tasks = &taskArray
	s.resetTaskIndexesLocked()
	s.Unlock()
	if err := database.DB.Select(&currentTasks, `SELECT
	id, callback_id, operation_id, is_interactive_task, interactive_task_type, parent_task_id
	FROM task
	WHERE status='submitted'`); err != nil {
		logging.LogError(err, "Failed to search for tasks")
	} else {
		s.Lock()
		for _, t := range currentTasks {
			s.addTaskLocked(newSubmittedTask(t))
		}
		s.Unlock()
	}
}

func newSubmittedTask(task databaseStructs.Task) submittedTask {
	return submittedTask{
		TaskID:              task.ID,
		CallbackID:          task.CallbackID,
		OperationID:         task.OperationID,
		IsInteractiveTask:   task.IsInteractiveTask,
		InteractiveTaskType: int(task.InteractiveTaskType.Int64),
		ParentTaskID:        int(task.ParentTaskID.Int64),
	}
}

func (s *submittedTasksForAgents) resetTaskIndexesLocked() {
	s.tasksByCallbackID = make(map[int][]int)
	s.interactiveTasksByCallbackID = make(map[int][]int)
	s.callbacksWithTasks = make([]int, 0)
	s.callbacksWithInteractiveTasks = make([]int, 0)
	s.taskByID = make(map[int]submittedTask)
}

func (s *submittedTasksForAgents) ensureTaskStoreLocked() {
	if s.Tasks == nil {
		taskArray := make([]submittedTask, 0)
		s.Tasks = &taskArray
	}
	if s.taskByID == nil || s.tasksByCallbackID == nil || s.interactiveTasksByCallbackID == nil {
		tasks := *s.Tasks
		s.resetTaskIndexesLocked()
		for _, task := range tasks {
			s.addTaskToIndexesLocked(task)
		}
	}
}

func (s *submittedTasksForAgents) addTaskLocked(task submittedTask) bool {
	s.ensureTaskStoreLocked()
	if _, exists := s.taskByID[task.TaskID]; exists {
		return false
	}
	*s.Tasks = append(*s.Tasks, task)
	s.addTaskToIndexesLocked(task)
	return true
}

func (s *submittedTasksForAgents) addTaskToIndexesLocked(task submittedTask) {
	s.taskByID[task.TaskID] = task
	if task.IsInteractiveTask {
		if len(s.interactiveTasksByCallbackID[task.CallbackID]) == 0 {
			s.callbacksWithInteractiveTasks = append(s.callbacksWithInteractiveTasks, task.CallbackID)
		}
		s.interactiveTasksByCallbackID[task.CallbackID] = append(s.interactiveTasksByCallbackID[task.CallbackID], task.TaskID)
	} else {
		if len(s.tasksByCallbackID[task.CallbackID]) == 0 {
			s.callbacksWithTasks = append(s.callbacksWithTasks, task.CallbackID)
		}
		s.tasksByCallbackID[task.CallbackID] = append(s.tasksByCallbackID[task.CallbackID], task.TaskID)
	}
}

func (s *submittedTasksForAgents) removeTaskFromIndexesLocked(task submittedTask) {
	delete(s.taskByID, task.TaskID)
	if task.IsInteractiveTask {
		s.interactiveTasksByCallbackID[task.CallbackID] = removeTaskID(s.interactiveTasksByCallbackID[task.CallbackID], task.TaskID)
		if len(s.interactiveTasksByCallbackID[task.CallbackID]) == 0 {
			delete(s.interactiveTasksByCallbackID, task.CallbackID)
			s.callbacksWithInteractiveTasks = removeCallbackID(s.callbacksWithInteractiveTasks, task.CallbackID)
		}
		return
	}
	s.tasksByCallbackID[task.CallbackID] = removeTaskID(s.tasksByCallbackID[task.CallbackID], task.TaskID)
	if len(s.tasksByCallbackID[task.CallbackID]) == 0 {
		delete(s.tasksByCallbackID, task.CallbackID)
		s.callbacksWithTasks = removeCallbackID(s.callbacksWithTasks, task.CallbackID)
	}
}

func removeTaskID(taskIDs []int, taskID int) []int {
	for i, currentTaskID := range taskIDs {
		if currentTaskID == taskID {
			return append(taskIDs[:i], taskIDs[i+1:]...)
		}
	}
	return taskIDs
}

func removeCallbackID(callbackIDs []int, callbackID int) []int {
	for i, currentCallbackID := range callbackIDs {
		if currentCallbackID == callbackID {
			return append(callbackIDs[:i], callbackIDs[i+1:]...)
		}
	}
	return callbackIDs
}

func cloneTaskIDs(taskIDs []int) []int {
	return append([]int(nil), taskIDs...)
}

func (s *submittedTasksForAgents) removeTaskFromStoreLocked(taskID int) (submittedTask, bool) {
	s.ensureTaskStoreLocked()
	task, ok := s.taskByID[taskID]
	if !ok {
		return submittedTask{}, false
	}
	s.removeTaskFromIndexesLocked(task)
	for i := 0; i < len(*s.Tasks); i++ {
		if (*s.Tasks)[i].TaskID == taskID {
			*s.Tasks = append((*s.Tasks)[:i], (*s.Tasks)[i+1:]...)
			break
		}
	}
	return task, true
}

func (s *submittedTasksForAgents) addTask(task databaseStructs.Task) {
	// before we add this for agents to pick up, see if this task can go to a pushC2 connected callback
	if grpc.PushC2Server.CheckClientConnected(task.CallbackID) > PushC2Connections.Connected {
		// we have a task directly for a pushC2 connected callback
		newTaskMsg, err := pushC2AgentMessageGetTasking(task.ID)
		if err != nil {
			logging.LogError(err, "failed to generate pushc2 task message")
		}
		err = sendMessageToDirectPushC2(task.CallbackID, newTaskMsg)
		if err != nil {
			logging.LogError(err, "failed to send pushc2 task message")
		}
		EventingChannel <- EventNotification{
			Trigger:     eventing.TriggerTaskStart,
			OperationID: task.OperationID,
			OperatorID:  task.OperatorID,
			TaskID:      task.ID,
		}
		return
	}
	// check if the task is for a linked agent of a push c2 style client
	connectedPushClient := grpc.PushC2Server.GetConnectedClients()
	for _, clientID := range connectedPushClient {
		if routablePath := callbackGraph.GetBFSPath(clientID, task.CallbackID); routablePath != nil && len(routablePath) > 0 {
			// we have a p2p path from callbackID to task.CallbackID
			delegateMessages := pushC2AgentGetDelegateTaskMessages(task.ID, task.CallbackID, routablePath)
			if delegateMessages != nil {
				newTaskMsg := map[string]interface{}{
					"action":    "get_tasking",
					"delegates": delegateMessages,
				}
				responseChan, callbackUUID, base64Encoded, c2ProfileName, trackingID, _, err := grpc.PushC2Server.GetPushC2ClientInfo(clientID)
				//logging.LogDebug("new msg for push c2", "task", newTaskMsg)
				uUIDInfo, err := LookupEncryptionData(c2ProfileName, callbackUUID, false)
				if err != nil {
					logging.LogError(err, "Failed to find encryption data for callback")
					break
				}
				responseBytes, err := EncryptMessageWithAuthContext(uUIDInfo, callbackUUID, newTaskMsg, base64Encoded,
					getMessageProcessingAuthContext(uUIDInfo, RabbitMQAuthContext{}))
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
					logging.LogDebug("Sent message to PushC2 Channel")

				case <-time.After(grpc.PushC2Server.GetChannelTimeout()):
					logging.LogError(nil, "timeout trying to send to responseChannel")

				}
				EventingChannel <- EventNotification{
					Trigger:     eventing.TriggerTaskStart,
					OperationID: task.OperationID,
					OperatorID:  task.OperatorID,
					TaskID:      task.ID,
				}
				return
			}
		}
	}
	s.Lock()
	defer s.Unlock()
	logging.LogInfo("adding task to SubmittedTasks")
	s.addTaskLocked(newSubmittedTask(task))
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
	task, found := s.removeTaskFromStoreLocked(taskId)
	s.Unlock()
	if !found {
		return
	}
	EventingChannel <- EventNotification{
		Trigger:     eventing.TriggerTaskStart,
		OperationID: task.OperationID,
		TaskID:      task.TaskID,
	}
	if task.IsInteractiveTask {
		_, err := database.DB.Exec(`UPDATE task SET
                status_timestamp_processing=$1, status_timestamp_processed=$1, completed=true 
                WHERE id=$2`, time.Now().UTC(), taskId)
		if err != nil {
			logging.LogError(err, "failed to update timestamp for interactive task")
		}
	} else {
		_, err := database.DB.Exec(`UPDATE task SET
                status_timestamp_processing=$1 
                WHERE id=$2`, time.Now().UTC(), taskId)
		if err != nil {
			logging.LogError(err, "failed to update timestamp for interactive task")
		}
	}
}
func (s *submittedTasksForAgents) getTasksForCallbackId(callbackId int) []int {
	s.RLock()
	defer s.RUnlock()
	return cloneTaskIDs(s.tasksByCallbackID[callbackId])
}
func (s *submittedTasksForAgents) getTasksForCallbackIds(callbackIds []int) map[int][]int {
	tasksByCallbackID := make(map[int][]int)
	if len(callbackIds) == 0 {
		return tasksByCallbackID
	}
	callbackIDMap := make(map[int]bool, len(callbackIds))
	for _, callbackId := range callbackIds {
		callbackIDMap[callbackId] = true
	}
	s.RLock()
	defer s.RUnlock()
	for callbackID := range callbackIDMap {
		if taskIDs := s.tasksByCallbackID[callbackID]; len(taskIDs) > 0 {
			tasksByCallbackID[callbackID] = cloneTaskIDs(taskIDs)
		}
	}
	return tasksByCallbackID
}
func (s *submittedTasksForAgents) getInteractiveTasksForCallbackId(callbackId int) []int {
	s.RLock()
	defer s.RUnlock()
	return cloneTaskIDs(s.interactiveTasksByCallbackID[callbackId])
}
func (s *submittedTasksForAgents) hasInteractiveTasksForCallbackId(callbackId int) bool {
	s.RLock()
	defer s.RUnlock()
	return len(s.interactiveTasksByCallbackID[callbackId]) > 0
}
func (s *submittedTasksForAgents) getCallbackIdsWithInteractiveTasks(callbackIds []int) map[int]bool {
	var callbacksWithInteractiveTasks map[int]bool
	if len(callbackIds) == 0 {
		return callbacksWithInteractiveTasks
	}
	s.RLock()
	defer s.RUnlock()
	for _, callbackId := range callbackIds {
		if len(s.interactiveTasksByCallbackID[callbackId]) == 0 {
			continue
		}
		if callbacksWithInteractiveTasks == nil {
			callbacksWithInteractiveTasks = make(map[int]bool)
		}
		callbacksWithInteractiveTasks[callbackId] = true
	}
	return callbacksWithInteractiveTasks
}
func (s *submittedTasksForAgents) getOtherCallbackIds(callbackId int) []int {
	callbacks := []int{}
	s.RLock()
	defer s.RUnlock()
	for _, currentCallbackID := range s.callbacksWithTasks {
		if currentCallbackID != callbackId {
			callbacks = append(callbacks, currentCallbackID)
		}
	}
	return callbacks
}
func (s *submittedTasksForAgents) getInteractiveTasksOtherCallbackIds(callbackId int) []int {
	callbacks := []int{}
	s.RLock()
	defer s.RUnlock()
	for _, currentCallbackID := range s.callbacksWithInteractiveTasks {
		if currentCallbackID != callbackId {
			callbacks = append(callbacks, currentCallbackID)
		}
	}
	return callbacks
}
func (s *submittedTasksForAgents) removeTasksAfterProcessingUpdate(taskIds []int) {
	if len(taskIds) == 0 {
		return
	}
	taskIDMap := make(map[int]bool, len(taskIds))
	for _, taskId := range taskIds {
		taskIDMap[taskId] = true
	}
	taskStartEvents := make([]EventNotification, 0, len(taskIds))
	s.Lock()
	s.ensureTaskStoreLocked()
	pendingTasks := (*s.Tasks)[:0]
	for i := 0; i < len(*s.Tasks); i++ {
		task := (*s.Tasks)[i]
		if taskIDMap[task.TaskID] {
			taskStartEvents = append(taskStartEvents, EventNotification{
				Trigger:     eventing.TriggerTaskStart,
				OperationID: task.OperationID,
				TaskID:      task.TaskID,
			})
			s.removeTaskFromIndexesLocked(task)
			continue
		}
		pendingTasks = append(pendingTasks, task)
	}
	*s.Tasks = pendingTasks
	s.Unlock()
	for _, taskStartEvent := range taskStartEvents {
		EventingChannel <- taskStartEvent
	}
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
	err := database.DB.Get(&callback, `SELECT 
		callback.*,
		payload.os "payload.os",
		payload.payload_type_id "payload.payload_type_id",
		payload.id "payload.id"
		FROM callback
		JOIN payload ON callback.registered_payload_id = payload.id
		WHERE
		callback.display_id=$1 and callback.operation_id=$2`,
		createTaskInput.CallbackDisplayID,
		createTaskInput.CurrentOperationID)
	if err != nil {
		logging.LogError(err, "Failed to get callback", "callback_id", createTaskInput.CallbackDisplayID)
		response.Error = "Failed to get callback information"
		return response
	}
	err = database.DB.Get(&callback.Payload.Payloadtype, `SELECT
			"name", id, command_help_function
			FROM payloadtype
			WHERE id=$1`, callback.Payload.PayloadTypeID)
	if err != nil {
		logging.LogError(err, "Failed to get payload type information")
		response.Error = "Failed to get payload type information"
		return response
		// make sure the user's current operation matches that of the callback we're trying tot ask
	}
	if createTaskInput.CurrentOperationID != callback.OperationID {
		response.Error = "Cannot task callback that's not in your current operation"
		return response
		// if the callback is locked, make sure this operator can actually task it
	}
	if callback.Locked && !createTaskInput.IsOperatorAdmin && int(callback.LockedOperatorID.Int64) != createTaskInput.OperatorID {
		response.Error = "Cannot task callback that's locked!"
		return response
		// if we're not looking at help/clear, fetch the command info and check for block lists
	}
	if strings.HasPrefix(strings.TrimSpace(createTaskInput.CommandName), "/") {
		// we're looking at some sort of alias, so try to resolve that first
		err = resolveCallbackTaskAlias(&createTaskInput, callback)
		if err != nil {
			response.Error = err.Error()
			return response
		}
	}
	if !utils.SliceContains(NonPayloadCommands, createTaskInput.CommandName) {
		loadedCommands := []databaseStructs.Loadedcommands{}
		err = database.DB.Select(&loadedCommands, `SELECT
			command.id "command.id", 
			command.attributes "command.attributes",
			command.supported_ui_features "command.supported_ui_features",
			payloadtype.name "command.payloadtype.name"
			FROM loadedcommands 
			JOIN command ON loadedcommands.command_id = command.id
			JOIN payloadtype ON command.payload_type_id = payloadtype.id
			WHERE command.cmd=$1 AND loadedcommands.callback_id=$2`,
			createTaskInput.CommandName, callback.ID)
		if err != nil {
			logging.LogError(err, "Failed to get command")
			response.Error = "Failed to get command"
			return response
		}
		if len(loadedCommands) == 0 {
			logging.LogError(err, "Failed to fetch command by that name")
			response.Error = "Failed to fetch command by that name"
			return response
		}
		if createTaskInput.PayloadType != nil && *createTaskInput.PayloadType != "" {
			for _, loadedCommand := range loadedCommands {
				if loadedCommand.Command.Payloadtype.Name == *createTaskInput.PayloadType {
					task.Command = loadedCommand.Command
					break
				}
			}
		} else {
			for _, loadedCommand := range loadedCommands {
				if loadedCommand.Command.Payloadtype.Name == callback.Payload.Payloadtype.Name {
					task.Command = loadedCommand.Command
					break
				}
			}
		}
		if task.Command.ID == 0 {
			if createTaskInput.PayloadType != nil && *createTaskInput.PayloadType != "" {
				logging.LogError(nil, "explicit payload type provided", "payload type", *createTaskInput.PayloadType, "no loaded commands match that payload type and name")
				response.Error = fmt.Sprintf("This %s callback has no commands loaded that match the name (%s) and payload type (%s) provided.",
					callback.Payload.Payloadtype.Name,
					createTaskInput.CommandName,
					*createTaskInput.PayloadType)
			} else {
				logging.LogError(nil, "failed to find command for callback's payload type", "command", createTaskInput.CommandName, "payload type", callback.Payload.Payloadtype.Name)
				response.Error = fmt.Sprintf("This %s callback has no commands loaded that match the name %s",
					callback.Payload.Payloadtype.Name,
					createTaskInput.CommandName)
			}
			return response
		}
		task.CommandID.Int64 = int64(task.Command.ID)
		task.CommandID.Valid = true
		if createTaskInput.PayloadType != nil && *createTaskInput.PayloadType != "" {
			task.CommandPayloadType = *createTaskInput.PayloadType
		} else {
			task.CommandPayloadType = task.Command.Payloadtype.Name
		}
		// if the operator has a command block list applied, make sure they can issue this task
		if createTaskInput.DisabledCommandID != nil {
			err = database.DB.Get(&baseBlockedCommandsProfile, `SELECT
				"name" FROM disabledcommandsprofile WHERE id=$1`, *createTaskInput.DisabledCommandID)
			if err != nil {
				logging.LogError(err, "Failed to fetch disabled command profile name")
				response.Error = "Failed to get blocked command list name"
				return response
			}
			err = database.DB.Select(&blockedCommands, `SELECT
				id FROM disabledcommandsprofile WHERE "name"=$1 AND command_id=$2 AND operation_id=$3`,
				baseBlockedCommandsProfile.Name, task.CommandID.Int64, createTaskInput.CurrentOperationID)
			if err != nil {
				logging.LogError(err, "Failed to query for matching blocked commands")
				response.Error = "Failed to get list of blocked commands"
				return response
			}
			if len(blockedCommands) > 0 {
				logging.LogError(nil, "Tasking blocked")
				response.Error = "Block list preventing execution"
				return response
			}
		}
	}
	if createTaskInput.AliasResolution != nil && task.Command.ID > 0 {
		commandParameters := []databaseStructs.Commandparameters{}
		err = database.DB.Select(&commandParameters, `SELECT
			id, name, display_name, cli_name, type, parameter_group_name, required, ui_position
			FROM commandparameters
			WHERE command_id=$1
			ORDER BY parameter_group_name, ui_position, id`,
			task.Command.ID)
		if err != nil {
			logging.LogError(err, "Failed to get command parameters for alias-expanded task")
			response.Error = "Failed to get command parameters for alias-expanded task"
			return response
		}
		commandName, params, err := SplitOperatorAliasExpandedTaskLine(createTaskInput.AliasResolution.Expanded, commandParameters)
		if err != nil {
			logging.LogError(err, "Failed to parse callback tasking alias-expanded parameters", "expanded", createTaskInput.AliasResolution.Expanded)
			response.Error = err.Error()
			return response
		}
		if commandName != "" {
			createTaskInput.CommandName = commandName
		}
		if createTaskInput.OriginalParams == nil {
			originalParams := createTaskInput.Params
			createTaskInput.OriginalParams = &originalParams
		}
		createTaskInput.Params = params
	}
	selectedParameterGroupName := "Default"
	if createTaskInput.ParameterGroupName != nil {
		selectedParameterGroupName = *createTaskInput.ParameterGroupName
	}
	displayParams := createTaskInput.Params
	if task.Command.ID > 0 {
		expandedParams, credentialParamsExpanded, err := expandCredentialJSONTaskingParameters(
			task.Command.ID,
			selectedParameterGroupName,
			createTaskInput.CurrentOperationID,
			createTaskInput.Params,
		)
		if err != nil {
			response.Error = err.Error()
			return response
		}
		if credentialParamsExpanded {
			displayParams = createTaskInput.Params
			createTaskInput.Params = expandedParams
		}
	}
	commandAttributes := CommandAttribute{}
	// set up the new task for the database
	task.AgentTaskID = uuid.New().String()
	task.CommandName = createTaskInput.CommandName
	task.CallbackID = callback.ID
	task.Callback = callback
	task.OperatorID = createTaskInput.OperatorID
	task.OperationID = createTaskInput.CurrentOperationID
	task.Params = createTaskInput.Params
	task.MythicParsedParams = createTaskInput.Params
	task.OriginalParams = *createTaskInput.OriginalParams
	task.DisplayParams = displayParams
	task.IsInteractiveTask = createTaskInput.IsInteractiveTask
	if createTaskInput.EventStepInstanceID > 0 {
		task.EventStepInstanceID.Valid = true
		task.EventStepInstanceID.Int64 = int64(createTaskInput.EventStepInstanceID)
		eventInstance := databaseStructs.EventStepInstance{ID: createTaskInput.EventStepInstanceID}
		err = database.DB.Get(&eventInstance, `SELECT
    		operator_id
    		FROM eventstepinstance
    		WHERE id=$1`, eventInstance.ID)
		if err != nil {
			logging.LogError(err, "Failed to find operator for specified eventstepinstance")
			response.Error = err.Error()
			return response
		}
		task.OperatorID = eventInstance.OperatorID
	}
	if createTaskInput.APITokensID > 0 {
		task.APITokensID.Valid = true
		task.APITokensID.Int64 = int64(createTaskInput.APITokensID)
	}
	if task.IsInteractiveTask {
		if createTaskInput.InteractiveTaskType == nil {
			logging.LogError(nil, "Missing a task type for an interactive task")
			response.Error = "Missing task type for interactive task"
			return response
		}
		if InteractiveTask.IsValid(*createTaskInput.InteractiveTaskType) {
			task.InteractiveTaskType.Valid = true
			task.InteractiveTaskType.Int64 = int64(*createTaskInput.InteractiveTaskType)
		} else {
			logging.LogError(nil, "Invalid task type for interactive task")
			response.Error = "Invalid task type for interactive task"
			return response
		}
	}
	if task.IsInteractiveTask {
		task.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
	} else {
		task.Status = PT_TASK_FUNCTION_STATUS_OPSEC_PRE
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
	if createTaskInput.Token != nil && *createTaskInput.Token > 0 {
		token := databaseStructs.Token{}
		err = database.DB.Get(&token, `SELECT id FROM token WHERE "token_id"=$1`, *createTaskInput.Token)
		if err != nil {
			logging.LogError(err, "Failed to get token information")
			response.Error = "Failed to get token information"
			return response
		}
		task.TokenID.Int64 = int64(token.ID)
		task.TokenID.Valid = true
	}
	task.ParameterGroupName = selectedParameterGroupName
	if createTaskInput.CommandName == "clear" {
		return handleClearCommand(createTaskInput, callback, task)
	}
	if createTaskInput.CommandName == "help" {
		return handleHelpCommand(createTaskInput, callback, task)
		// make sure the command matches the OS for cases where all commands are built into the agent
	}
	err = mapstructure.Decode(task.Command.Attributes.StructValue(), &commandAttributes)
	if err != nil {
		logging.LogError(err, "Failed to parse out command attributes")
		response.Error = "Failed to parse command attributes"
		return response
	}
	if len(commandAttributes.SupportedOS) > 0 && !utils.SliceContains(commandAttributes.SupportedOS, callback.Payload.Os) {
		logging.LogError(nil, "Trying to issue command that doesn't match supported OS of payload")
		response.Error = "Trying to issue command that doesn't match supported OS of payload"
		return response
		// make sure the command is loaded into this callback
	}
	supportedUIFeatures := task.Command.SupportedUiFeatures.StructStringValue()
	if utils.SliceContains(supportedUIFeatures, PT_TASK_SUPPORTED_UI_FEATURE_TASK_PROCESS_INTERACTIVE_TASKS) {
		task.Status = PT_TASK_CREATE_TASKING
	}
	if createTaskInput.AliasResolution != nil {
		resolution, err := json.MarshalIndent(createTaskInput.AliasResolution, "", "\t")
		if err != nil {
			logging.LogError(err, "Failed to marshal alias resolution")
		}
		task.AliasResolution = string(resolution)
	}
	err = addTaskToDatabase(&task)
	if err != nil {
		response.Error = "Failed to create task in database"
		return response
	}
	associateUploadedFilesWithTask(&task, createTaskInput.FileIDs)
	EventingChannel <- EventNotification{
		Trigger:     eventing.TriggerTaskCreate,
		OperationID: task.OperationID,
		OperatorID:  task.OperatorID,
		TaskID:      task.ID,
	}
	if task.IsInteractiveTask {
		if utils.SliceContains(supportedUIFeatures, PT_TASK_SUPPORTED_UI_FEATURE_TASK_PROCESS_INTERACTIVE_TASKS) {
			go sendTaskToContainerCreateTasking(task.ID, createTaskInput.AuthContext)
		} else {
			go submittedTasksAwaitingFetching.addTask(task)
		}
	} else {
		go sendTaskToContainerOpsecPre(task.ID, createTaskInput.AuthContext)
	}
	return CreateTaskResponse{
		Status:        "success",
		TaskID:        task.ID,
		TaskDisplayID: task.DisplayID,
	}
}

func resolveCallbackTaskAlias(createTaskInput *CreateTaskInput, callback databaseStructs.Callback) error {
	payloadTypeID := callback.Payload.PayloadTypeID
	if createTaskInput.PayloadType != nil && strings.TrimSpace(*createTaskInput.PayloadType) != "" {
		// trying to resolve this for a different payload type
		payloadType := databaseStructs.Payloadtype{}
		err := database.DB.Get(&payloadType,
			`SELECT id FROM payloadtype WHERE name=$1 AND deleted=false`,
			strings.TrimSpace(*createTaskInput.PayloadType))
		if err != nil {
			logging.LogError(err, "Failed to fetch payload type for callback alias", "payload_type", *createTaskInput.PayloadType)
			return fmt.Errorf("failed to find payload type for alias scope")
		}
		payloadTypeID = payloadType.ID
	}
	line := strings.TrimSpace(createTaskInput.CommandName)
	if strings.TrimSpace(createTaskInput.Params) != "" {
		line = strings.TrimSpace(line + " " + strings.TrimSpace(createTaskInput.Params))
	}
	// set nil for terminal commands since payload types have no built in alias terminal commands
	resolution, err := ResolveOperatorAliasLineWithProvidedSlashCommands(createTaskInput.OperatorID, OperatorAliasScope{PayloadTypeID: payloadTypeID}, line, nil)
	if err != nil {
		logging.LogError(err, "Failed to resolve callback task alias", "command", createTaskInput.CommandName)
		return err
	}
	if !resolution.AliasMatched {
		return fmt.Errorf("unknown callback tasking alias /%s", createTaskInput.CommandName)
	}
	if resolution.FinalIsSlash {
		return fmt.Errorf("callback tasking alias expansion ended with unresolved slash command /%s", resolution.FinalCommand)
	}
	commandName, params, err := SplitOperatorAliasExpandedTaskLine(resolution.Expanded)
	if err != nil {
		return err
	}
	if commandName == "" {
		return fmt.Errorf("callback tasking alias expanded to an empty command")
	}
	createTaskInput.CommandName = commandName
	createTaskInput.Params = params
	createTaskInput.AliasResolution = &resolution
	return nil
}

func SplitOperatorAliasExpandedTaskLine(line string, commandParameterSets ...[]databaseStructs.Commandparameters) (string, string, error) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return "", "", nil
	}
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "", "", nil
	}
	command := strings.TrimPrefix(parts[0], "/")
	params := ""
	if len(trimmed) > len(parts[0]) {
		params = strings.TrimSpace(trimmed[len(parts[0]):])
	}
	logging.LogDebug("SplitOperatorAliasExpandedTaskLine", "command", command, "params", params)
	if len(commandParameterSets) == 0 || strings.TrimSpace(params) == "" {
		return command, params, nil
	}
	commandParameters := commandParameterSets[0]
	if len(commandParameters) == 0 {
		return command, params, nil
	}

	var decodedParams interface{}
	if err := json.Unmarshal([]byte(params), &decodedParams); err == nil {
		switch decodedParams.(type) {
		case map[string]interface{}, []interface{}:
			return command, params, nil
		}
	} else if strings.HasPrefix(params, "{") {
		return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s as JSON: %w", command, err)
	}

	getDefaultValueForType := func(parameterType string) (interface{}, bool) {
		switch parameterType {
		case "string":
			return "", true
		case "typedArray", "array":
			return []interface{}{}, true
		case "number":
			return 0, true
		case "boolean":
			return true, true
		default:
			return nil, false
		}
	}
	parseNumber := func(value string) (float64, bool) {
		number, err := strconv.ParseFloat(value, 64)
		if err != nil || math.IsNaN(number) {
			return 0, false
		}
		return number, true
	}
	parameterGroupName := func(parameter databaseStructs.Commandparameters) string {
		if strings.TrimSpace(parameter.ParameterGroupName) == "" {
			return "Default"
		}
		return parameter.ParameterGroupName
	}
	appendUnique := func(values []string, value string) []string {
		for _, existing := range values {
			if existing == value {
				return values
			}
		}
		return append(values, value)
	}
	appendInterfaceValue := func(current interface{}, value interface{}) []interface{} {
		if current == nil {
			return []interface{}{value}
		}
		switch typed := current.(type) {
		case []interface{}:
			return append(typed, value)
		case []string:
			output := make([]interface{}, 0, len(typed)+1)
			for _, item := range typed {
				output = append(output, item)
			}
			return append(output, value)
		default:
			return []interface{}{typed, value}
		}
	}
	parseToArgv := func(input string) ([]string, error) {
		argv := []string{}
		if input == "" {
			return argv, nil
		}
		singleQuoted := false
		doubleQuoted := false
		backslash := false
		buffer := ""
		pushBuffer := func() {
			if len(buffer) == 0 {
				return
			}
			if len(buffer) >= 2 {
				first := buffer[0]
				last := buffer[len(buffer)-1]
				if first == last && (first == '\'' || first == '"') {
					argv = append(argv, buffer[1:len(buffer)-1])
					buffer = ""
					return
				}
			}
			argv = append(argv, buffer)
			buffer = ""
		}
		for _, value := range input {
			if (singleQuoted || doubleQuoted) && value == '\\' {
				if !backslash {
					backslash = true
					continue
				}
				backslash = false
				buffer += "\\"
				continue
			}
			if !singleQuoted && !doubleQuoted {
				if value == '\'' {
					if backslash {
						backslash = false
						buffer += "'"
						continue
					}
					singleQuoted = true
					buffer += string(value)
					continue
				}
				if value == '"' {
					if backslash {
						backslash = false
						buffer += "\""
						continue
					}
					doubleQuoted = true
					buffer += string(value)
					continue
				}
				if value == ' ' {
					if backslash {
						backslash = false
						buffer += "\\"
					}
					pushBuffer()
					continue
				}
			}
			if singleQuoted && value == '\'' {
				if backslash {
					buffer += "'"
					backslash = false
					continue
				}
				singleQuoted = false
				if len(buffer) > 0 {
					buffer += string(value)
				} else {
					buffer += string(value) + string(value)
				}
				continue
			}
			if doubleQuoted && value == '"' {
				if backslash {
					buffer += "\""
					backslash = false
					continue
				}
				doubleQuoted = false
				if len(buffer) > 0 {
					buffer += string(value)
				} else {
					buffer += string(value) + string(value)
				}
				continue
			}
			if backslash {
				buffer += "\\" + string(value)
				backslash = false
			} else {
				buffer += string(value)
			}
		}
		if backslash {
			buffer += "\\"
		}
		pushBuffer()
		if doubleQuoted {
			logging.LogError(nil, "unexpected end of string while looking for matching double quote in alias resolution")
			return nil, fmt.Errorf("unexpected end of string while looking for matching double quote")
		}
		if singleQuoted {
			logging.LogError(nil, "unexpected end of string while looking for matching single quote in alias resolution")
			return nil, fmt.Errorf("unexpected end of string while looking for matching single quote")
		}
		return argv, nil
	}
	type aliasTaskPositionalMetadata struct {
		Value string
		Index int
	}
	parameterTypeForFlag := map[string]string{}
	parameterByFlag := map[string]databaseStructs.Commandparameters{}
	allFlags := map[string]bool{}
	for _, parameter := range commandParameters {
		if strings.TrimSpace(parameter.CliName) == "" {
			continue
		}
		flag := "-" + parameter.CliName
		allFlags[flag] = true
		parameterByFlag[flag] = parameter
		switch parameter.Type {
		case COMMAND_PARAMETER_TYPE_CHOOSE_ONE, COMMAND_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM, COMMAND_PARAMETER_TYPE_STRING:
			parameterTypeForFlag[flag] = "string"
		case COMMAND_PARAMETER_TYPE_NUMBER:
			parameterTypeForFlag[flag] = "number"
		case COMMAND_PARAMETER_TYPE_BOOLEAN:
			parameterTypeForFlag[flag] = "boolean"
		case COMMAND_PARAMETER_TYPE_ARRAY, COMMAND_PARAMETER_TYPE_CHOOSE_MULTIPLE:
			parameterTypeForFlag[flag] = "array"
		case COMMAND_PARAMETER_TYPE_TYPED_ARRAY:
			parameterTypeForFlag[flag] = "typedArray"
		case COMMAND_PARAMETER_TYPE_FILE:
			parameterTypeForFlag[flag] = "file"
		default:
			parameterTypeForFlag[flag] = "complex"
		}
	}
	argv, err := parseToArgv(params)
	if err != nil {
		return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: %w", command, err)
	}
	logging.LogDebug("SplitOperatorAliasExpandedTaskLine", "argv", argv)
	parsed := map[string]interface{}{
		"_": []string{},
	}
	var lastProcessedParameter *databaseStructs.Commandparameters
	lastProcessedValueIndex := -1
	positionalsMetadata := []aliasTaskPositionalMetadata{}
	recordProcessedParameter := func(parameter databaseStructs.Commandparameters, valueIndex int) {
		lastProcessedParameter = &parameter
		lastProcessedValueIndex = valueIndex
	}
	recordProcessedFlag := func(flag string, valueIndex int) {
		if parameter, ok := parameterByFlag[flag]; ok {
			recordProcessedParameter(parameter, valueIndex)
		}
	}
	currentArgument := ""
	currentArgumentType := ""
	setDefaultIfMissing := func(flag string, argumentType string) {
		key := strings.TrimPrefix(flag, "-")
		if _, found := parsed[key]; found {
			return
		}
		if defaultValue, ok := getDefaultValueForType(argumentType); ok {
			parsed[key] = defaultValue
		}
	}
	for index := 0; index < len(argv); index++ {
		value := argv[index]
		if currentArgument == "" {
			if argumentType, ok := parameterTypeForFlag[value]; ok {
				currentArgument = value
				currentArgumentType = argumentType
				if index == len(argv)-1 {
					setDefaultIfMissing(currentArgument, currentArgumentType)
				}
				continue
			}
			positionals := parsed["_"].([]string)
			parsed["_"] = append(positionals, value)
			positionalsMetadata = append(positionalsMetadata, aliasTaskPositionalMetadata{Value: value, Index: index})
			continue
		}
		if allFlags[value] {
			setDefaultIfMissing(currentArgument, currentArgumentType)
			currentArgument = ""
			currentArgumentType = ""
			index--
			continue
		}
		key := strings.TrimPrefix(currentArgument, "-")
		switch currentArgumentType {
		case "string":
			parsed[key] = value
			recordProcessedFlag(currentArgument, index)
			currentArgument = ""
			currentArgumentType = ""
		case "file":
			if _, err := uuid.Parse(value); err != nil {
				return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: file parameter %s must be an uploaded file UUID", command, key)
			}
			parsed[key] = value
			recordProcessedFlag(currentArgument, index)
			currentArgument = ""
			currentArgumentType = ""
		case "boolean":
			if strings.EqualFold(value, "false") {
				parsed[key] = false
			} else if strings.EqualFold(value, "true") {
				parsed[key] = true
			} else {
				parsed[key] = true
			}
			recordProcessedFlag(currentArgument, index)
			currentArgument = ""
			currentArgumentType = ""
		case "number":
			number, ok := parseNumber(value)
			if !ok {
				return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: failed to parse number for %s: %s", command, key, value)
			}
			parsed[key] = number
			recordProcessedFlag(currentArgument, index)
			currentArgument = ""
			currentArgumentType = ""
		case "typedArray":
			parsed[key] = appendInterfaceValue(parsed[key], []interface{}{"", value})
			recordProcessedFlag(currentArgument, index)
		case "array":
			parsed[key] = appendInterfaceValue(parsed[key], value)
			recordProcessedFlag(currentArgument, index)
		case "complex":
			var complexValue interface{}
			if err := json.Unmarshal([]byte(value), &complexValue); err != nil {
				parsed[key] = value
			} else {
				parsed[key] = complexValue
			}
			recordProcessedFlag(currentArgument, index)
			currentArgument = ""
			currentArgumentType = ""
		}
	}
	logging.LogDebug("SplitOperatorAliasExpandedTaskLine", "parsed", parsed)
	groupOptions := []string{}
	for _, parameter := range commandParameters {
		groupOptions = appendUnique(groupOptions, parameterGroupName(parameter))
	}
	for key := range parsed {
		if key == "_" {
			continue
		}
		parameterGroups := []string{}
		foundParameterGroup := false
		for _, parameter := range commandParameters {
			if parameter.CliName == key || parameter.DisplayName == key || parameter.Name == key {
				foundParameterGroup = true
				parameterGroups = append(parameterGroups, parameterGroupName(parameter))
			}
		}
		intersection := []string{}
		for _, option := range groupOptions {
			for _, group := range parameterGroups {
				if option == group {
					intersection = appendUnique(intersection, option)
				}
			}
		}
		if len(intersection) == 0 {
			if foundParameterGroup {
				logging.LogError(nil, "invalid parameter groups", "groupOptions", groupOptions, "parameterGroups", parameterGroups)
				return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: two or more specified parameters cannot be used together", command)
			}
			continue
		}
		groupOptions = intersection
	}
	sort.Strings(groupOptions)
	usedGroupName := ""
	if len(groupOptions) == 1 {
		usedGroupName = groupOptions[0]
	} else if len(groupOptions) > 1 {
		for _, groupName := range groupOptions {
			if groupName == "Default" {
				usedGroupName = "Default"
				break
			}
		}
		if usedGroupName == "" {
			logging.LogDebug("SplitOperatorAliasExpandedTaskLine", "no default group found, using first group", "groupOptions", groupOptions)
			return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: parameter group is ambiguous", command)
		}
	}
	groupParameters := []databaseStructs.Commandparameters{}
	for _, parameter := range commandParameters {
		if parameterGroupName(parameter) == usedGroupName {
			groupParameters = append(groupParameters, parameter)
		}
	}
	sort.SliceStable(groupParameters, func(i, j int) bool {
		if groupParameters[i].UiPosition == groupParameters[j].UiPosition {
			return groupParameters[i].ID < groupParameters[j].ID
		}
		return groupParameters[i].UiPosition < groupParameters[j].UiPosition
	})
	unsatisfiedArguments := []databaseStructs.Commandparameters{}
	for _, parameter := range groupParameters {
		if _, found := parsed[parameter.CliName]; !found {
			unsatisfiedArguments = append(unsatisfiedArguments, parameter)
		}
	}
	positionals := parsed["_"].([]string)
	remainingPositionalsMetadata := positionalsMetadata
	shiftPositionalMetadata := func() (aliasTaskPositionalMetadata, bool) {
		if len(remainingPositionalsMetadata) == 0 {
			return aliasTaskPositionalMetadata{}, false
		}
		currentMetadata := remainingPositionalsMetadata[0]
		remainingPositionalsMetadata = remainingPositionalsMetadata[1:]
		return currentMetadata, true
	}
	for index := 0; index < len(unsatisfiedArguments); index++ {
		if len(positionals) == 0 {
			break
		}
		temp := positionals[0]
		positionals = positionals[1:]
		positionalMetadata, hasPositionalMetadata := shiftPositionalMetadata()
		parameter := unsatisfiedArguments[index]
		switch parameter.Type {
		case COMMAND_PARAMETER_TYPE_CHOOSE_ONE, COMMAND_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM, COMMAND_PARAMETER_TYPE_STRING:
			parsed[parameter.CliName] = temp
			if hasPositionalMetadata {
				recordProcessedParameter(parameter, positionalMetadata.Index)
			}
		case COMMAND_PARAMETER_TYPE_NUMBER:
			number, ok := parseNumber(temp)
			if !ok {
				return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: failed to parse number for %s: %s", command, parameter.CliName, temp)
			}
			parsed[parameter.CliName] = number
			if hasPositionalMetadata {
				recordProcessedParameter(parameter, positionalMetadata.Index)
			}
		case COMMAND_PARAMETER_TYPE_BOOLEAN:
			if strings.EqualFold(temp, "false") {
				parsed[parameter.CliName] = false
				if hasPositionalMetadata {
					recordProcessedParameter(parameter, positionalMetadata.Index)
				}
			} else if strings.EqualFold(temp, "true") {
				parsed[parameter.CliName] = true
				if hasPositionalMetadata {
					recordProcessedParameter(parameter, positionalMetadata.Index)
				}
			} else {
				return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: failed to parse boolean for %s: %s", command, parameter.CliName, temp)
			}
		case COMMAND_PARAMETER_TYPE_ARRAY, COMMAND_PARAMETER_TYPE_TYPED_ARRAY, COMMAND_PARAMETER_TYPE_FILE_MULTIPLE, COMMAND_PARAMETER_TYPE_CHOOSE_MULTIPLE:
			parsed[parameter.CliName] = appendInterfaceValue(parsed[parameter.CliName], temp)
			if hasPositionalMetadata {
				recordProcessedParameter(parameter, positionalMetadata.Index)
			}
			index--
		default:
			parsed[parameter.CliName] = temp
			if hasPositionalMetadata {
				recordProcessedParameter(parameter, positionalMetadata.Index)
			}
		}
	}
	parsed["_"] = positionals
	positionalsMetadata = remainingPositionalsMetadata
	coalesceTrailingPositionals := func() {
		if len(positionals) == 0 {
			return
		}
		if lastProcessedParameter == nil || lastProcessedValueIndex < 0 {
			return
		}
		if len(positionalsMetadata) != len(positionals) {
			return
		}
		for _, positionalMetadata := range positionalsMetadata {
			if positionalMetadata.Index <= lastProcessedValueIndex {
				return
			}
		}
		coalesceParameter := *lastProcessedParameter
		for _, groupParameter := range groupParameters {
			if groupParameter.CliName == lastProcessedParameter.CliName {
				coalesceParameter = groupParameter
				break
			}
		}
		switch coalesceParameter.Type {
		case COMMAND_PARAMETER_TYPE_STRING:
			existingValue, _ := parsed[coalesceParameter.CliName].(string)
			values := make([]string, 0, len(positionals)+1)
			if existingValue != "" {
				values = append(values, existingValue)
			}
			values = append(values, positionals...)
			parsed[coalesceParameter.CliName] = strings.Join(values, " ")
		case COMMAND_PARAMETER_TYPE_ARRAY, COMMAND_PARAMETER_TYPE_CHOOSE_MULTIPLE, COMMAND_PARAMETER_TYPE_FILE_MULTIPLE:
			for _, positional := range positionals {
				parsed[coalesceParameter.CliName] = appendInterfaceValue(parsed[coalesceParameter.CliName], positional)
			}
		case COMMAND_PARAMETER_TYPE_TYPED_ARRAY:
			for _, positional := range positionals {
				parsed[coalesceParameter.CliName] = appendInterfaceValue(parsed[coalesceParameter.CliName], []interface{}{"", positional})
			}
		default:
			return
		}
		positionals = []string{}
		positionalsMetadata = []aliasTaskPositionalMetadata{}
		parsed["_"] = positionals
	}
	coalesceTrailingPositionals()

	if leftOverPositionals, ok := parsed["_"].([]string); ok && len(leftOverPositionals) > 0 {
		return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: too many positional arguments given; quote arguments containing spaces", command)
	}
	delete(parsed, "_")
	marshaledParams, err := json.Marshal(parsed)
	if err != nil {
		logging.LogError(err, "Failed to marshal callback tasking alias expanded parameters")
		return command, params, fmt.Errorf("failed to parse alias-expanded parameters for %s: %w", command, err)
	}
	return command, string(marshaledParams), nil
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
	if task.IsInteractiveTask {
		task.StatusTimestampSubmitted.Valid = true
		task.StatusTimestampSubmitted.Time = time.Now().UTC()
	}
	transaction, err := database.DB.Beginx()
	if err != nil {
		logging.LogError(err, "Failed to begin transaction")
		return err
	}
	defer transaction.Rollback()
	statement, err := transaction.PrepareNamed(`INSERT INTO task 
	(agent_task_id,command_name,callback_id,operator_id,command_id,token_id,params,
		original_params,display_params,status,tasking_location,parameter_group_name,
		parent_task_id,subtask_callback_function,group_callback_function,subtask_group_name,operation_id,
	    is_interactive_task, interactive_task_type, eventstepinstance_id, status_timestamp_submitted,
	 command_payload_type, mythic_parsed_params, apitokens_id, alias_resolution)
		VALUES (:agent_task_id, :command_name, :callback_id, :operator_id, :command_id, :token_id, :params,
			:original_params, :display_params, :status, :tasking_location, :parameter_group_name,
			:parent_task_id, :subtask_callback_function, :group_callback_function, :subtask_group_name, :operation_id,
		        :is_interactive_task, :interactive_task_type, :eventstepinstance_id, :status_timestamp_submitted,
		        :command_payload_type, :mythic_parsed_params, :apitokens_id, :alias_resolution)
			RETURNING id, display_id`)
	if err != nil {
		logging.LogError(err, "Failed to make a prepared statement for new task creation")
		return err
	}
	defer statement.Close()
	taskIDs := struct {
		ID        int `db:"id"`
		DisplayID int `db:"display_id"`
	}{}
	err = statement.Get(&taskIDs, task)
	if err != nil {
		logging.LogError(err, "Failed to create new task in database")
		return err
	}
	task.ID = taskIDs.ID
	task.DisplayID = taskIDs.DisplayID
	err = transaction.Commit()
	if err != nil {
		logging.LogError(err, "Failed to commit transaction of creating new task")
		return err
	}
	go emitTaskLog(task.ID)
	return nil
}

func handleClearCommand(createTaskInput CreateTaskInput, callback databaseStructs.Callback, task databaseStructs.Task) CreateTaskResponse {
	output := CreateTaskResponse{
		Status: "error",
		Error:  "not implemented",
	}
	task.Status = "processing"
	task.StatusTimestampProcessing.Valid = true
	task.StatusTimestampProcessing.Time = time.Now().UTC()
	task.StatusTimestampProcessed.Valid = true
	task.StatusTimestampProcessed.Time = time.Now().UTC()
	err := addTaskToDatabase(&task)
	if err != nil {
		logging.LogError(err, "Failed to add task to database")
		output.Error = err.Error()
		return output
	}
	_, err = database.DB.NamedExec(`UPDATE task SET
                status_timestamp_processing=:status_timestamp_processing,
                status_timestamp_processed=:status_timestamp_processed
            where id=:id`, task)
	if err != nil {
		logging.LogError(err, "Failed to update task in database")
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
		outputMsg = "No tasks in the 'submitted' state\n"
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
	if _, err := database.DB.Exec(`INSERT INTO response (task_id, response, operation_id, eventstepinstance_id, apitokens_id)
		SELECT id, $2, $3, eventstepinstance_id, apitokens_id
		FROM task
		WHERE id=$1`, taskId, output, operationId); err != nil {
		logging.LogError(err, "Failed to add output to task")
	}
}
func addErrToTask(taskId int, output string) {
	if _, err := database.DB.Exec(`UPDATE task SET stderr=$1 WHERE id=$2`, output, taskId); err != nil {
		logging.LogError(err, "Failed to update stderr for task")
	}
}
func updateTaskStatus(taskId int, status string, completed bool) {
	if _, err := database.DB.Exec(`UPDATE task SET status=$1, 
                completed=$2 WHERE id=$3`,
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
	outputFields := [][]string{}
	err := addTaskToDatabase(&task)
	if err != nil {
		logging.LogError(err, "Failed to add task to database")
		output.Error = err.Error()
		return output
	}
	output.TaskID = task.ID
	output.TaskDisplayID = task.DisplayID
	loadedCommands := []databaseStructs.Loadedcommands{}
	err = database.DB.Select(&loadedCommands, `SELECT
		command.cmd "command.cmd",
		command.id "command.id", 
		command.attributes "command.attributes",
		command.description "command.description",
		command.help_cmd "command.help_cmd",
		payloadtype.name "command.payloadtype.name"
		FROM loadedcommands
		JOIN command ON command_id=command.id
		JOIN payloadtype ON command.payload_type_id = payloadtype.id
		WHERE loadedcommands.callback_id=$1 ORDER BY command.cmd ASC`, callback.ID)
	if err != nil {
		logging.LogError(err, "Failed to fetch loaded commands")
		updateTaskStatus(task.ID, "error", true)
		addErrToTask(task.ID, fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error()))
		output.Error = fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error())
		return output
	}
	if callback.Payload.Payloadtype.CommandHelpFunction != "" {
		commandNames := []string{}
		for _, cmd := range loadedCommands {
			matched, _ := regexp.MatchString(task.Params, cmd.Command.Cmd)
			if !matched {
				continue
			}
			commandNames = append(commandNames, cmd.Command.Cmd)
		}
		resp, err := RabbitMQConnection.SendPtRPCCommandHelp(CommandHelpMessage{
			PayloadType:  callback.Payload.Payloadtype.Name,
			CommandNames: commandNames,
		}, createTaskInput.AuthContext)
		if err == nil {
			if resp.Success {
				updateTaskStatus(task.ID, "success", true)
				go addOutputToTask(task.ID, resp.Output, task.OperationID)
				output.Error = ""
				output.Status = "success"
				return output
			}
			logging.LogError(errors.New(resp.Error), "failed to have container successfully process help command")
		} else {
			logging.LogError(err, "failed to run help command from payload type")
		}
	}
	if task.Params == "" {
		// looking for help about all loaded commands
		addedHelp := false
		addedClear := false
		for i, cmd := range loadedCommands {
			if !addedClear && "clear" > cmd.Command.Cmd && i+1 < len(loadedCommands) && "clear" < loadedCommands[i+1].Command.Cmd {
				outputFields = append(outputFields, []string{
					"clear", "clear { | all | task Num}", "The 'clear' command will mark tasks as 'cleared' so that they can't be picked up by agents",
				})
				addedClear = true
			}
			if !addedHelp && "help" > cmd.Command.Cmd && i+1 < len(loadedCommands) && "help" < loadedCommands[i+1].Command.Cmd {
				outputFields = append(outputFields, []string{
					"help", "help [command]", "The 'help' command gives detailed information about specific commands or general information about all available commands.",
				})
				addedHelp = true
			}
			commandAttributes := CommandAttribute{}
			// for a given command, first check that it's appropriate for our callback.payload.os
			err = mapstructure.Decode(cmd.Command.Attributes.StructValue(), &commandAttributes)
			if err != nil {
				logging.LogError(err, "Failed to parse out command attributes")
			} else if len(commandAttributes.SupportedOS) == 0 || utils.SliceContains(commandAttributes.SupportedOS, callback.Payload.Os) {
				if cmd.Command.Payloadtype.Name != callback.Payload.Payloadtype.Name {
					outputFields = append(outputFields, []string{
						fmt.Sprintf("%s (%s)", cmd.Command.Cmd, cmd.Command.Payloadtype.Name),
						cmd.Command.HelpCmd, cmd.Command.Description,
					})
				} else {
					outputFields = append(outputFields, []string{
						cmd.Command.Cmd, cmd.Command.HelpCmd, cmd.Command.Description,
					})
				}

			}
		}
		if !addedHelp {
			outputFields = append(outputFields, []string{
				"help", "help [command]", "The 'help' command gives detailed information about specific commands or general information about all available commands.",
			})
		}
		if !addedClear {
			outputFields = append(outputFields, []string{
				"clear", "clear { | all | task Num}", "The 'clear' command will mark tasks as 'cleared' so that they can't be picked up by agents",
			})
		}
		var formattedBuilder strings.Builder
		w := tabwriter.NewWriter(&formattedBuilder, 0, 0, 3, ' ', 0)
		fmt.Fprintln(w, "Command\tDescription")
		fmt.Fprintln(w, "=======\t============")
		for _, row := range outputFields {
			fmt.Fprintln(w, row[0]+"\tUsage: "+row[1])
			fmt.Fprintln(w, "\tDescription: "+strings.ReplaceAll(row[2], "\n", ""))
		}
		w.Flush()
		updateTaskStatus(task.ID, "completed", true)
		go addOutputToTask(task.ID, formattedBuilder.String(), task.OperationID)
		output.Error = ""
		output.Status = "success"
		return output
	}
	if task.Params == "help" {
		// looking for detailed help about a specific command
		responseOutput := `The 'help' command gives detailed information about specific commands or general information about all available commands.\n`
		updateTaskStatus(task.ID, "completed", true)
		go addOutputToTask(task.ID, responseOutput, task.OperationID)
		output.Error = ""
		output.Status = "success"
		return output
	}
	if task.Params == "clear" {
		responseOutput := "The 'clear' command will mark tasks as 'cleared' so that they can't be picked up by agents.\n"
		responseOutput += "Clear with no arguments or with the 'all' argument will clear all tasking in the 'submitted' or 'delegating...' state for the current callback.\n"
		responseOutput += "Clear can also take one argument, the task number, to clear just that one task.\n"
		updateTaskStatus(task.ID, "completed", true)
		go addOutputToTask(task.ID, responseOutput, task.OperationID)
		output.Error = ""
		output.Status = "success"
		return output
	}
	command := databaseStructs.Command{}
	commandParameters := []databaseStructs.Commandparameters{}
	responseUserOutput := ""
	for _, cmd := range loadedCommands {
		matched, err := regexp.MatchString(task.Params, cmd.Command.Cmd)
		if err != nil {
			logging.LogError(err, "failed to check for matching command name", "params", task.Params)
			continue
		}
		if !matched {
			continue
		}
		command = cmd.Command
		err = database.DB.Select(&commandParameters, `SELECT
		commandparameters.*
		FROM commandparameters
		JOIN command ON command_id=command.id
		WHERE command.id=$1`, command.ID)
		if err != nil {
			logging.LogError(err, "Failed to fetch loaded commands")
			updateTaskStatus(task.ID, "error", true)
			go addErrToTask(task.ID, fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error()))
			output.Error = fmt.Sprintf("Failed to fetch loaded commands: %v\n", err.Error())
			return output
		}
		commandAttributes := CommandAttribute{}
		// for a given command, first check that it's appropriate for our callback.payload.os
		err = mapstructure.Decode(command.Attributes.StructValue(), &commandAttributes)
		if err != nil {
			logging.LogError(err, "Failed to parse out command attributes")
			continue
		}
		commandName := command.Cmd
		if cmd.Command.Payloadtype.Name != callback.Payload.Payloadtype.Name {
			commandName += " (" + cmd.Command.Payloadtype.Name + ")"
		}
		if attributesJSON, err := json.MarshalIndent(commandAttributes, "\t", "\t"); err != nil {
			responseUserOutput += fmt.Sprintf("\n%s\n\tUsage: %s\n\tDescription: %s\n\tAttributes: %v\n",
				commandName, command.HelpCmd, command.Description, err.Error())
			logging.LogError(err, "Failed to marshal command attributes")
		} else {
			responseUserOutput += fmt.Sprintf("\n%s\n\tUsage: %s\n\tDescription: %s\n\tAttributes: %s\n",
				commandName, command.HelpCmd, command.Description, attributesJSON)
		}
		paramGroupNames := []string{}
		for _, p := range commandParameters {
			if !utils.SliceContains(paramGroupNames, p.ParameterGroupName) {
				paramGroupNames = append(paramGroupNames, p.ParameterGroupName)
			}
		}
		for _, groupName := range paramGroupNames {
			responseUserOutput += fmt.Sprintf("\tParameter Group: %s\n", groupName)
			for _, param := range commandParameters {
				if param.ParameterGroupName == groupName {
					responseUserOutput += fmt.Sprintf("\t\tParameter Name: %s\n\t\t\tCLI Name: %s\n\t\t\tDisplay Name: %s\n\t\t\tDescription: %s\n\t\t\tParameter Type: %s\n",
						param.Name, param.CliName, param.DisplayName, param.Description, param.Type)
					responseUserOutput += fmt.Sprintf("\t\t\tRequired: %v\n", param.Required)
				}
			}
		}
	}

	updateTaskStatus(task.ID, "success", true)
	go addOutputToTask(task.ID, responseUserOutput, task.OperationID)
	output.Error = ""
	output.Status = "success"
	return output

}

func sendTaskToContainerOpsecPre(taskID int, authContext RabbitMQAuthContext) error {
	taskMessage := GetTaskConfigurationForContainer(taskID)
	err := RabbitMQConnection.SendPtTaskOPSECPre(taskMessage, authContext)
	if err != nil {
		logging.LogError(err, "Failed to send task to payload type")
		if _, err := database.DB.Exec(`UPDATE task SET status=$1 WHERE id=$2`,
			TASK_STATUS_CONTAINER_DOWN, taskID); err != nil {
			logging.LogError(err, "Failed to update task status")
		}
		return err
	}
	return nil
}

func sendTaskToContainerCreateTasking(taskID int, authContext RabbitMQAuthContext) error {
	allTaskData := GetTaskConfigurationForContainer(taskID)
	err := RabbitMQConnection.SendPtTaskCreate(allTaskData, authContext)
	if err != nil {
		logging.LogError(err, "In submitTaskToContainerCreateTasking, but failed to sendSendPtTaskCreate ")
		if _, err := database.DB.Exec(`UPDATE task SET status=$1 WHERE id=$2`,
			TASK_STATUS_CONTAINER_DOWN, taskID); err != nil {
			logging.LogError(err, "Failed to update task status")
		}
	}
	return err
}

func ReissueTask(taskID int, authContext RabbitMQAuthContext) error {
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT
		task.id, task.status, task.completed, task.operation_id, task.is_interactive_task,
		command.supported_ui_features "command.supported_ui_features"
		FROM task
		LEFT JOIN command ON task.command_id = command.id
		WHERE task.id=$1`, taskID)
	if err != nil {
		logging.LogError(err, "Failed to find task for reissue", "task_id", taskID)
		return errors.New("failed to find task in current operation")
	}
	if task.Completed {
		return errors.New("task is already completed")
	}
	supportedUIFeatures := task.Command.SupportedUiFeatures.StructStringValue()
	if task.IsInteractiveTask {
		if utils.SliceContains(supportedUIFeatures, PT_TASK_SUPPORTED_UI_FEATURE_TASK_PROCESS_INTERACTIVE_TASKS) {
			if _, err := database.DB.Exec(`UPDATE task SET status=$1 WHERE id=$2`,
				PT_TASK_CREATE_TASKING, task.ID); err != nil {
				logging.LogError(err, "Failed to update task status for reissue")
				return err
			}
			return sendTaskToContainerCreateTasking(task.ID, authContext)
		}
		if _, err := database.DB.Exec(`UPDATE task SET status=$1, status_timestamp_submitted=$2 WHERE id=$3`,
			PT_TASK_FUNCTION_STATUS_SUBMITTED, time.Now().UTC(), task.ID); err != nil {
			logging.LogError(err, "Failed to update interactive task status for reissue")
			return err
		}
		submittedTasksAwaitingFetching.addTaskById(task.ID)
		return nil
	}
	if _, err := database.DB.Exec(`UPDATE task SET status=$1 WHERE id=$2`,
		PT_TASK_FUNCTION_STATUS_OPSEC_PRE, task.ID); err != nil {
		logging.LogError(err, "Failed to update task status for reissue")
		return err
	}
	return sendTaskToContainerOpsecPre(task.ID, authContext)
}
