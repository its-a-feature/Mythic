package rabbitmq

import (
	"encoding/base64"
	"errors"
	"regexp"
	"slices"
	"strconv"
	"strings"
	"time"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils/structs"
)

// Input typed into a live session goes straight to the agent the same way data from an interactive port does, keyed
// by the task's agent_task_id. Agents never see the ids of interactive sub-tasks, so the sub-tasks only record what
// was sent, and typing is saved a line at a time rather than a key at a time. A line is saved when it's finished,
// or once it's this old or this big.
const (
	interactiveLiveInputSaveDelay = 10 * time.Second
	interactiveLiveInputSaveSize  = 64 * 1024
)

// control keys are saved as part of the line they're typed in, as the byte they stand for
var interactiveLiveInputControlBytes = map[InteractiveTask.MessageType]string{
	InteractiveTask.Escape:    "\x1b",
	InteractiveTask.CtrlA:     "\x01",
	InteractiveTask.CtrlB:     "\x02",
	InteractiveTask.CtrlC:     "\x03",
	InteractiveTask.CtrlD:     "\x04",
	InteractiveTask.CtrlE:     "\x05",
	InteractiveTask.CtrlF:     "\x06",
	InteractiveTask.CtrlG:     "\x07",
	InteractiveTask.Backspace: "\b",
	InteractiveTask.Tab:       "\t",
	InteractiveTask.CtrlK:     "\x0b",
	InteractiveTask.CtrlL:     "\x0c",
	InteractiveTask.CtrlN:     "\x0e",
	InteractiveTask.CtrlP:     "\x10",
	InteractiveTask.CtrlQ:     "\x11",
	InteractiveTask.CtrlR:     "\x12",
	InteractiveTask.CtrlS:     "\x13",
	InteractiveTask.CtrlU:     "\x15",
	InteractiveTask.CtrlW:     "\x17",
	InteractiveTask.CtrlY:     "\x19",
	InteractiveTask.CtrlZ:     "\x1a",
}

// InteractiveLiveInput is input an operator sends to a task's terminal
type InteractiveLiveInput struct {
	OperatorID        int
	IsOperatorAdmin   bool
	DisabledCommandID *int
	MessageType       InteractiveTask.MessageType
	Params            string
	OriginalParams    string
	APITokensID       int
}

// ErrInteractiveInputNeedsTasking means the input has to be tasked the usual way, such as when the command's
// container processes each input or the agent can only collect it by checking in for tasking
var ErrInteractiveInputNeedsTasking = errors.New("input needs tasking")

// what's needed to send input to the agent, which doesn't change during a session
type interactiveLiveDelivery struct {
	CallbackID          int                             `db:"callback_id"`
	CommandID           structs.NullInt64               `db:"command_id"`
	CommandName         string                          `db:"command_name"`
	CommandPayloadType  string                          `db:"command_payload_type"`
	SupportedUIFeatures databaseStructs.MythicJSONArray `db:"supported_ui_features"`
	processesInput      bool
}

// mouse reports, SGR ones as ESC[<button;col;row then M or m, and X10 ones as ESC[M then three bytes
var interactiveLiveMouseReportRegex = regexp.MustCompile(`\x1b\[<(\d+);\d+;\d+[Mm]|\x1b\[M([\x20-\x7f])[\x20-\x7f]{2}`)

// withoutInteractiveHover removes reports of the pointer moving with no button held. They're still sent to apps
// tracking every movement, which use them to highlight what's under the pointer, but they don't do anything, so
// they're left out of what's saved.
func withoutInteractiveHover(params string) string {
	if !strings.Contains(params, "\x1b[") {
		return params
	}
	return interactiveLiveMouseReportRegex.ReplaceAllStringFunc(params, func(report string) string {
		match := interactiveLiveMouseReportRegex.FindStringSubmatch(report)
		button := 0
		if match[1] != "" {
			button, _ = strconv.Atoi(match[1])
		} else {
			button = int(match[2][0]) - 32
		}
		if button&32 != 0 && button&64 == 0 && button&3 == 3 {
			return ""
		}
		return report
	})
}

type interactiveLiveInputBatch struct {
	input          InteractiveLiveInput
	params         strings.Builder
	originalParams strings.Builder
	start          time.Time
	end            time.Time
	saveTimer      *time.Timer
}

// replaced in tests
var getInteractiveLiveDelivery = func(taskID int) (*interactiveLiveDelivery, error) {
	delivery := interactiveLiveDelivery{}
	if err := database.DB.Get(&delivery, `SELECT
		task.callback_id, task.command_id, task.command_name, task.command_payload_type,
		command.supported_ui_features
		FROM task
		LEFT JOIN command ON task.command_id = command.id
		WHERE task.id=$1`, taskID); err != nil {
		return nil, err
	}
	features := []string{}
	if err := delivery.SupportedUIFeatures.Unmarshal(&features); err == nil {
		delivery.processesInput = slices.Contains(features, PT_TASK_SUPPORTED_UI_FEATURE_TASK_PROCESS_INTERACTIVE_TASKS)
	}
	return &delivery, nil
}
var checkInteractiveLiveInputAllowed = func(delivery *interactiveLiveDelivery, operationID int, input InteractiveLiveInput) error {
	allowed := struct {
		Locked  bool `db:"locked"`
		Blocked bool `db:"blocked"`
	}{}
	if err := database.DB.Get(&allowed, `SELECT
		callback.locked AND callback.locked_operator_id IS DISTINCT FROM $2 "locked",
		EXISTS(SELECT 1 FROM disabledcommandsprofile
			WHERE "name"=(SELECT "name" FROM disabledcommandsprofile WHERE id=$3)
			AND command_id=$4 AND operation_id=$5) "blocked"
		FROM callback WHERE callback.id=$1`,
		delivery.CallbackID, input.OperatorID, input.DisabledCommandID, delivery.CommandID, operationID); err != nil {
		logging.LogError(err, "Failed to check if interactive input is allowed")
		return errors.New("Failed to check if input is allowed")
	}
	if allowed.Locked && !input.IsOperatorAdmin {
		return errors.New("Cannot task callback that's locked!")
	}
	if allowed.Blocked {
		return errors.New("Block list preventing execution")
	}
	return nil
}

// sendInteractiveLiveInputToAgent returns ErrInteractiveInputNeedsTasking if neither push C2 nor an interactive port
// can carry it
var sendInteractiveLiveInputToAgent = func(taskID int, callbackID int, message agentMessagePostResponseInteractive) error {
	// input already tasked goes first
	if submittedTasksAwaitingFetching.hasInteractiveTasksForCallbackId(callbackID) {
		return ErrInteractiveInputNeedsTasking
	}
	err := sendProxyMessageToPushC2(callbackID, CALLBACK_PORT_TYPE_INTERACTIVE, message)
	if !errors.Is(err, errNoPushC2Route) {
		return err
	}
	// an interactive port's data is collected along with tasking
	for _, port := range proxyPorts.getPortsForCallbackAndType(callbackID, CALLBACK_PORT_TYPE_INTERACTIVE) {
		if port.TaskID != taskID {
			continue
		}
		if !port.queueInteractiveDataForAgent(message) {
			return errors.New("Too much input waiting for the agent")
		}
		return nil
	}
	return ErrInteractiveInputNeedsTasking
}
var insertInteractiveLiveInput = func(task *databaseStructs.Task) error {
	statement, err := database.DB.PrepareNamed(`INSERT INTO task
		(agent_task_id, command_name, callback_id, operator_id, command_id, params, original_params, display_params,
		status, completed, tasking_location, parameter_group_name, parent_task_id, operation_id, is_interactive_task,
		interactive_task_type, apitokens_id, command_payload_type, mythic_parsed_params, "timestamp",
		status_timestamp_submitted, status_timestamp_processing, status_timestamp_processed)
		VALUES (:agent_task_id, :command_name, :callback_id, :operator_id, :command_id, :params, :original_params,
		:display_params, :status, :completed, :tasking_location, :parameter_group_name, :parent_task_id, :operation_id,
		:is_interactive_task, :interactive_task_type, :apitokens_id, :command_payload_type, :mythic_parsed_params,
		:timestamp, :status_timestamp_submitted, :status_timestamp_processing, :status_timestamp_processed)
		RETURNING id`)
	if err != nil {
		return err
	}
	defer statement.Close()
	if err = statement.Get(&task.ID, task); err != nil {
		return err
	}
	go emitTaskLog(task.ID)
	return nil
}

// SendInteractiveInput sends input from a viewer straight to the agent, and saves it as an interactive sub-task
// shortly after. It returns ErrInteractiveInputNeedsTasking if the input has to be tasked instead.
func SendInteractiveInput(taskID int, viewer InteractiveLiveViewer, input InteractiveLiveInput) error {
	interactiveLiveTasks.Lock()
	liveTask, ok := interactiveLiveTasks.tasks[taskID]
	interactiveLiveTasks.Unlock()
	if !ok {
		return ErrInteractiveInputNeedsTasking
	}
	// sub-tasks are only saved in order if one viewer's input is sent and batched one at a time
	liveTask.inputLock.Lock()
	defer liveTask.inputLock.Unlock()
	if liveTask.delivery == nil {
		delivery, err := getInteractiveLiveDelivery(liveTask.task.ID)
		if err != nil {
			logging.LogError(err, "Failed to get interactive task delivery information", "task_id", taskID)
			return ErrInteractiveInputNeedsTasking
		}
		liveTask.delivery = delivery
	}
	if liveTask.delivery.processesInput {
		return ErrInteractiveInputNeedsTasking
	}
	if err := checkInteractiveLiveInputAllowed(liveTask.delivery, liveTask.task.OperationID, input); err != nil {
		return err
	}
	if err := sendInteractiveLiveInputToAgent(liveTask.task.ID, liveTask.delivery.CallbackID, agentMessagePostResponseInteractive{
		TaskUUID:    liveTask.task.AgentTaskID,
		Data:        base64.StdEncoding.EncodeToString([]byte(input.Params)),
		MessageType: input.MessageType,
	}); err != nil {
		return err
	}
	if input.MessageType == InteractiveTask.WindowChange {
		recordInteractiveScreenResize(liveTask.task.ID, input.Params)
	}
	liveTask.addInput(viewer, input)
	return nil
}

// addInput adds sent input to the line the viewer's typing, and saves the line once it's finished: by Enter, or by
// Ctrl+C, Ctrl+D or Ctrl+Z, which abandon or end it the same way. Each sub-task has a single type, so lines are saved
// as input with their control keys in them, and anything else, such as a resize, is saved on its own straight away.
// The task's inputLock must be held.
func (liveTask *interactiveLiveTask) addInput(viewer InteractiveLiveViewer, input InteractiveLiveInput) {
	if liveTask.inputs == nil {
		liveTask.inputs = make(map[InteractiveLiveViewer]*interactiveLiveInputBatch)
	}
	controlBytes, isControl := interactiveLiveInputControlBytes[input.MessageType]
	inLine := input.MessageType == InteractiveTask.Input || isControl
	if input.MessageType == InteractiveTask.Input {
		params := withoutInteractiveHover(input.Params)
		if params == "" && input.Params != "" {
			return
		}
		input.Params = params
	}
	batch, ok := liveTask.inputs[viewer]
	if ok && (!inLine || batch.input.OperatorID != input.OperatorID || batch.input.APITokensID != input.APITokensID) {
		liveTask.saveInput(viewer)
		ok = false
	}
	now := time.Now().UTC()
	if !ok {
		batch = &interactiveLiveInputBatch{input: input, start: now}
		if inLine {
			batch.input.MessageType = InteractiveTask.Input
		}
		liveTask.inputs[viewer] = batch
	}
	switch {
	case isControl:
		batch.params.WriteString(controlBytes)
		batch.originalParams.WriteString(input.OriginalParams)
	case !inLine || input.OriginalParams == input.Params:
		batch.params.WriteString(input.Params)
		batch.originalParams.WriteString(input.OriginalParams)
	default:
		// keys like the arrows are sent as escape sequences labelled with their name
		batch.params.WriteString(input.Params)
		batch.originalParams.WriteString("<" + input.OriginalParams + ">")
	}
	batch.end = now
	if !inLine || batch.params.Len() >= interactiveLiveInputSaveSize || strings.ContainsAny(input.Params, "\r\n") ||
		input.MessageType == InteractiveTask.CtrlC || input.MessageType == InteractiveTask.CtrlD ||
		input.MessageType == InteractiveTask.CtrlZ {
		liveTask.saveInput(viewer)
	} else if batch.saveTimer == nil {
		batch.saveTimer = time.AfterFunc(interactiveLiveInputSaveDelay, func() {
			liveTask.inputLock.Lock()
			defer liveTask.inputLock.Unlock()
			if liveTask.inputs[viewer] == batch {
				liveTask.saveInput(viewer)
			}
		})
	}
}

// saveInput saves the viewer's batch as an interactive sub-task that's already been sent to the agent. The task's
// inputLock must be held.
func (liveTask *interactiveLiveTask) saveInput(viewer InteractiveLiveViewer) {
	batch, ok := liveTask.inputs[viewer]
	if !ok {
		return
	}
	delete(liveTask.inputs, viewer)
	if batch.saveTimer != nil {
		batch.saveTimer.Stop()
	}
	task := databaseStructs.Task{
		AgentTaskID:        uuid.New().String(),
		CommandName:        liveTask.delivery.CommandName,
		CallbackID:         liveTask.delivery.CallbackID,
		OperatorID:         batch.input.OperatorID,
		CommandID:          liveTask.delivery.CommandID,
		Params:             batch.params.String(),
		OriginalParams:     batch.originalParams.String(),
		DisplayParams:      batch.params.String(),
		Status:             PT_TASK_FUNCTION_STATUS_COMPLETED,
		Completed:          true,
		TaskingLocation:    "command_line",
		ParameterGroupName: "default",
		OperationID:        liveTask.task.OperationID,
		IsInteractiveTask:  true,
		CommandPayloadType: liveTask.delivery.CommandPayloadType,
		Timestamp:          batch.start,
	}
	task.ParentTaskID.Valid = true
	task.ParentTaskID.Int64 = int64(liveTask.task.ID)
	task.InteractiveTaskType.Valid = true
	task.InteractiveTaskType.Int64 = int64(batch.input.MessageType)
	if batch.input.APITokensID > 0 {
		task.APITokensID.Valid = true
		task.APITokensID.Int64 = int64(batch.input.APITokensID)
	}
	task.StatusTimestampSubmitted.Valid = true
	task.StatusTimestampSubmitted.Time = batch.start
	task.StatusTimestampProcessing.Valid = true
	task.StatusTimestampProcessing.Time = batch.start
	task.StatusTimestampProcessed.Valid = true
	task.StatusTimestampProcessed.Time = batch.end
	if err := insertInteractiveLiveInput(&task); err != nil {
		logging.LogError(err, "Failed to save interactive input", "task_id", liveTask.task.ID)
	}
}

// saveAllInput saves every viewer's batch, such as when the session ends. The task's inputLock must be held.
func (liveTask *interactiveLiveTask) saveAllInput() {
	for viewer := range liveTask.inputs {
		liveTask.saveInput(viewer)
	}
}
