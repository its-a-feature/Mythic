package rabbitmq

import (
	"encoding/base64"
	"fmt"
	"slices"
	"strings"
	"sync"
	"testing"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

// newTestInteractiveLiveInput replaces finding, checking, sending and saving input for the test, and returns what
// was sent to the agent and what was saved as sub-tasks
func newTestInteractiveLiveInput(t *testing.T, delivery interactiveLiveDelivery, sendErr error) (*interactiveLiveTask, *fakeInteractiveLiveViewer, func() []string, func() []string) {
	liveTask, viewer, _, _ := newTestInteractiveLiveTask(t)
	liveTask.task.AgentTaskID = "parent-uuid"
	var lock sync.Mutex
	sent, saved := []string{}, []string{}
	originalDelivery, originalAllowed := getInteractiveLiveDelivery, checkInteractiveLiveInputAllowed
	originalSend, originalInsert := sendInteractiveLiveInputToAgent, insertInteractiveLiveInput
	getInteractiveLiveDelivery = func(taskID int) (*interactiveLiveDelivery, error) {
		return &delivery, nil
	}
	checkInteractiveLiveInputAllowed = func(*interactiveLiveDelivery, int, InteractiveLiveInput) error {
		return nil
	}
	sendInteractiveLiveInputToAgent = func(taskID int, callbackID int, message agentMessagePostResponseInteractive) error {
		if sendErr != nil {
			return sendErr
		}
		data, _ := base64.StdEncoding.DecodeString(message.Data)
		lock.Lock()
		defer lock.Unlock()
		sent = append(sent, fmt.Sprintf("%s %d:%s", message.TaskUUID, message.MessageType, data))
		return nil
	}
	insertInteractiveLiveInput = func(task *databaseStructs.Task) error {
		lock.Lock()
		defer lock.Unlock()
		saved = append(saved, fmt.Sprintf("%d %d:%s (%s) parent %d completed %v", task.OperatorID,
			task.InteractiveTaskType.Int64, task.Params, task.OriginalParams, task.ParentTaskID.Int64, task.Completed))
		return nil
	}
	interactiveLiveTasks.Lock()
	interactiveLiveTasks.tasks[liveTask.task.ID] = liveTask
	interactiveLiveTasks.Unlock()
	t.Cleanup(func() {
		getInteractiveLiveDelivery, checkInteractiveLiveInputAllowed = originalDelivery, originalAllowed
		sendInteractiveLiveInputToAgent, insertInteractiveLiveInput = originalSend, originalInsert
		interactiveLiveTasks.Lock()
		delete(interactiveLiveTasks.tasks, liveTask.task.ID)
		interactiveLiveTasks.Unlock()
	})
	return liveTask, viewer, func() []string {
			lock.Lock()
			defer lock.Unlock()
			return slices.Clone(sent)
		}, func() []string {
			lock.Lock()
			defer lock.Unlock()
			return slices.Clone(saved)
		}
}

func typed(params string) InteractiveLiveInput {
	return InteractiveLiveInput{OperatorID: 2, MessageType: InteractiveTask.Input, Params: params, OriginalParams: params}
}

func control(messageType InteractiveTask.MessageType, label string) InteractiveLiveInput {
	return InteractiveLiveInput{OperatorID: 2, MessageType: messageType, OriginalParams: label}
}

func TestInteractiveLiveInputIsSentStraightAwayAndSavedALineAtATime(t *testing.T) {
	liveTask, viewer, sent, saved := newTestInteractiveLiveInput(t, interactiveLiveDelivery{CallbackID: 3}, nil)
	for _, input := range []InteractiveLiveInput{typed("ls -la"), control(InteractiveTask.Tab, "^I"),
		control(InteractiveTask.Backspace, "^H"), {OperatorID: 2, MessageType: InteractiveTask.Input, Params: "\x1b[A", OriginalParams: "Up"},
		typed("\r"), typed("sleep 9"), control(InteractiveTask.CtrlC, "^C"),
		{OperatorID: 2, MessageType: InteractiveTask.WindowChange, Params: "80,24,0,0", OriginalParams: "resize 80x24"}, typed("v"), typed("i")} {
		if err := SendInteractiveInput(liveTask.task.ID, viewer, input); err != nil {
			t.Fatal(err)
		}
	}
	// the agent gets every key as it's typed, with its own type
	want := []string{"parent-uuid 0:ls -la", "parent-uuid 13:", "parent-uuid 12:", "parent-uuid 0:\x1b[A", "parent-uuid 0:\r",
		"parent-uuid 0:sleep 9", "parent-uuid 7:", "parent-uuid 25:80,24,0,0", "parent-uuid 0:v", "parent-uuid 0:i"}
	if got := sent(); !slices.Equal(got, want) {
		t.Fatalf("sent = %q", got)
	}
	// lines are saved when they're finished, with their control keys in them, and resizes on their own
	wantSaved := []string{
		"2 0:ls -la\t\b\x1b[A\r (ls -la^I^H<Up>\r) parent 1 completed true",
		"2 0:sleep 9\x03 (sleep 9^C) parent 1 completed true",
		"2 25:80,24,0,0 (resize 80x24) parent 1 completed true",
	}
	if got := saved(); !slices.Equal(got, wantSaved) {
		t.Fatalf("saved = %q", got)
	}
	// an unfinished line waits until the viewer leaves, or it's been typed for a while
	UnwatchInteractiveTask(liveTask.task.ID, viewer)
	if got := saved(); !slices.Equal(got, append(wantSaved, "2 0:vi (vi) parent 1 completed true")) {
		t.Fatalf("saved = %q", got)
	}
}

func TestInteractiveLiveInputSavesLongLines(t *testing.T) {
	liveTask, viewer, _, saved := newTestInteractiveLiveInput(t, interactiveLiveDelivery{CallbackID: 3}, nil)
	if err := SendInteractiveInput(liveTask.task.ID, viewer, typed(strings.Repeat("x", interactiveLiveInputSaveSize))); err != nil {
		t.Fatal(err)
	}
	if len(saved()) != 1 {
		t.Fatalf("saved %d sub-tasks", len(saved()))
	}
}

func TestInteractiveLiveInputIsSavedWhenTheViewerLeaves(t *testing.T) {
	liveTask, viewer, _, saved := newTestInteractiveLiveInput(t, interactiveLiveDelivery{CallbackID: 3}, nil)
	if err := SendInteractiveInput(liveTask.task.ID, viewer, typed("ls")); err != nil {
		t.Fatal(err)
	}
	UnwatchInteractiveTask(liveTask.task.ID, viewer)
	if got := saved(); !slices.Equal(got, []string{"2 0:ls (ls) parent 1 completed true"}) {
		t.Fatalf("saved = %q", got)
	}
}

func TestInteractiveLiveInputNeedsTaskingWhenTheContainerProcessesIt(t *testing.T) {
	liveTask, viewer, sent, saved := newTestInteractiveLiveInput(t, interactiveLiveDelivery{CallbackID: 3, processesInput: true}, nil)
	if err := SendInteractiveInput(liveTask.task.ID, viewer, typed("a")); err != ErrInteractiveInputNeedsTasking {
		t.Fatalf("err = %v", err)
	}
	if len(sent()) != 0 || len(saved()) != 0 {
		t.Fatalf("sent %q, saved %q", sent(), saved())
	}
}

func TestInteractiveLiveInputIsOnlySavedOnceSent(t *testing.T) {
	liveTask, viewer, _, saved := newTestInteractiveLiveInput(t, interactiveLiveDelivery{CallbackID: 3}, ErrInteractiveInputNeedsTasking)
	if err := SendInteractiveInput(liveTask.task.ID, viewer, typed("a")); err != ErrInteractiveInputNeedsTasking {
		t.Fatalf("err = %v", err)
	}
	UnwatchInteractiveTask(liveTask.task.ID, viewer)
	if len(saved()) != 0 {
		t.Fatalf("saved %q", saved())
	}
}

func TestInteractiveLiveInputLeavesOutHover(t *testing.T) {
	liveTask, viewer, sent, saved := newTestInteractiveLiveInput(t, interactiveLiveDelivery{CallbackID: 3}, nil)
	for _, input := range []InteractiveLiveInput{
		{OperatorID: 2, MessageType: InteractiveTask.Input, Params: "\x1b[<35;4;2M\x1b[<35;5;2M"},
		{OperatorID: 2, MessageType: InteractiveTask.Input, Params: "\x1b[<35;5;3M\x1b[<0;5;3M", OriginalParams: "Click 5,3"},
		{OperatorID: 2, MessageType: InteractiveTask.Input, Params: "\x1b[<32;6;3M\x1b[<0;6;3m\x1b[MC%%", OriginalParams: "Drag 6,3 Release 6,3"},
		typed("\r"),
	} {
		if err := SendInteractiveInput(liveTask.task.ID, viewer, input); err != nil {
			t.Fatal(err)
		}
	}
	// the agent still gets the pointer moving
	if got := sent(); len(got) != 4 || got[0] != "parent-uuid 0:\x1b[<35;4;2M\x1b[<35;5;2M" {
		t.Fatalf("sent = %q", got)
	}
	want := []string{"2 0:\x1b[<0;5;3M\x1b[<32;6;3M\x1b[<0;6;3m\r (<Click 5,3><Drag 6,3 Release 6,3>\r) parent 1 completed true"}
	if got := saved(); !slices.Equal(got, want) {
		t.Fatalf("saved = %q", got)
	}
}
