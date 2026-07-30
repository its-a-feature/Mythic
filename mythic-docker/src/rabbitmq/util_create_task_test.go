package rabbitmq

import (
	"database/sql"
	"slices"
	"testing"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	mythicStructs "github.com/its-a-feature/Mythic/utils/structs"
)

func drainEventingChannelForTest() {
	for {
		select {
		case <-EventingChannel:
		default:
			return
		}
	}
}

func addSubmittedTaskForTest(taskStore *submittedTasksForAgents, task submittedTask) {
	taskStore.Lock()
	defer taskStore.Unlock()
	taskStore.addTaskLocked(task)
}

func TestSubmittedTasksForAgentsUsesCallbackIndexes(t *testing.T) {
	taskStore := submittedTasksForAgents{}
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 1, CallbackID: 10, OperationID: 100})
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 2, CallbackID: 10, OperationID: 100, IsInteractiveTask: true})
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 3, CallbackID: 20, OperationID: 100})

	if taskIDs := taskStore.getTasksForCallbackId(10); !slices.Equal(taskIDs, []int{1}) {
		t.Fatalf("expected callback 10 non-interactive task IDs [1], got %#v", taskIDs)
	}
	if taskIDs := taskStore.getInteractiveTasksForCallbackId(10); !slices.Equal(taskIDs, []int{2}) {
		t.Fatalf("expected callback 10 interactive task IDs [2], got %#v", taskIDs)
	}
	if callbackIDs := taskStore.getOtherCallbackIds(10); !slices.Equal(callbackIDs, []int{20}) {
		t.Fatalf("expected other callback IDs [20], got %#v", callbackIDs)
	}

	tasksByCallbackID := taskStore.getTasksForCallbackIds([]int{10, 20})
	if !slices.Equal(tasksByCallbackID[10], []int{1}) {
		t.Fatalf("expected callback 10 task IDs [1], got %#v", tasksByCallbackID[10])
	}
	if !slices.Equal(tasksByCallbackID[20], []int{3}) {
		t.Fatalf("expected callback 20 task IDs [3], got %#v", tasksByCallbackID[20])
	}

	taskIDs := taskStore.getTasksForCallbackId(10)
	taskIDs[0] = 99
	if taskIDs = taskStore.getTasksForCallbackId(10); !slices.Equal(taskIDs, []int{1}) {
		t.Fatalf("expected returned task ID slice to be a copy, got %#v", taskIDs)
	}
}

func TestSubmittedTasksForAgentsBatchRemoveUpdatesIndexes(t *testing.T) {
	drainEventingChannelForTest()
	t.Cleanup(drainEventingChannelForTest)

	taskStore := submittedTasksForAgents{}
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 1, CallbackID: 10, OperationID: 100})
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 2, CallbackID: 10, OperationID: 100})
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 3, CallbackID: 10, OperationID: 100, IsInteractiveTask: true})
	addSubmittedTaskForTest(&taskStore, submittedTask{TaskID: 4, CallbackID: 20, OperationID: 200})

	taskStore.removeTasksAfterProcessingUpdate([]int{1, 4})

	if taskIDs := taskStore.getTasksForCallbackId(10); !slices.Equal(taskIDs, []int{2}) {
		t.Fatalf("expected callback 10 non-interactive task IDs [2], got %#v", taskIDs)
	}
	if taskIDs := taskStore.getInteractiveTasksForCallbackId(10); !slices.Equal(taskIDs, []int{3}) {
		t.Fatalf("expected callback 10 interactive task IDs [3], got %#v", taskIDs)
	}
	if callbackIDs := taskStore.getOtherCallbackIds(10); len(callbackIDs) != 0 {
		t.Fatalf("expected no other non-interactive callback IDs, got %#v", callbackIDs)
	}

	taskStore.RLock()
	if len(*taskStore.Tasks) != 2 {
		t.Fatalf("expected 2 tasks left in backing store, got %d", len(*taskStore.Tasks))
	}
	taskStore.RUnlock()

	taskStartEvents := []EventNotification{<-EventingChannel, <-EventingChannel}
	if taskStartEvents[0].TaskID != 1 || taskStartEvents[1].TaskID != 4 {
		t.Fatalf("expected task start events for task IDs 1 and 4, got %#v", taskStartEvents)
	}
}

func TestEnsureCreateTaskOriginalParamsDefaultsToParams(t *testing.T) {
	createTaskInput := CreateTaskInput{
		Params: `{"cred": 123}`,
	}

	ensureCreateTaskOriginalParams(&createTaskInput)
	createTaskInput.Params = `{"cred":{"credential_id":123}}`

	if createTaskInput.OriginalParams == nil {
		t.Fatal("expected original params to be set")
	}
	if *createTaskInput.OriginalParams != `{"cred": 123}` {
		t.Fatalf("expected original params snapshot to be preserved, got %q", *createTaskInput.OriginalParams)
	}
}

func TestEnsureCreateTaskOriginalParamsPreservesProvidedValue(t *testing.T) {
	originalParams := `{"already":"set"}`
	createTaskInput := CreateTaskInput{
		Params:         `{"cred": 123}`,
		OriginalParams: &originalParams,
	}

	ensureCreateTaskOriginalParams(&createTaskInput)

	if createTaskInput.OriginalParams == nil {
		t.Fatal("expected original params to remain set")
	}
	if *createTaskInput.OriginalParams != originalParams {
		t.Fatalf("expected provided original params to be preserved, got %q", *createTaskInput.OriginalParams)
	}
}

func TestUploadedFileAssociationTaskID(t *testing.T) {
	parentTaskID := mythicStructs.NullInt64{
		NullInt64: sql.NullInt64{Int64: 41, Valid: true},
	}
	tests := []struct {
		name string
		task databaseStructs.Task
		want int64
	}{
		{
			name: "normal task uses itself",
			task: databaseStructs.Task{ID: 42, ParentTaskID: parentTaskID},
			want: 42,
		},
		{
			name: "file editor request uses its parent",
			task: databaseStructs.Task{
				ID:                42,
				IsInteractiveTask: true,
				InteractiveTaskType: mythicStructs.NullInt64{
					NullInt64: sql.NullInt64{
						Int64: int64(InteractiveTask.FileEditorRequest),
						Valid: true,
					},
				},
				ParentTaskID: parentTaskID,
			},
			want: 41,
		},
		{
			name: "terminal interactive input uses itself",
			task: databaseStructs.Task{
				ID:                42,
				IsInteractiveTask: true,
				InteractiveTaskType: mythicStructs.NullInt64{
					NullInt64: sql.NullInt64{
						Int64: int64(InteractiveTask.Input),
						Valid: true,
					},
				},
				ParentTaskID: parentTaskID,
			},
			want: 42,
		},
		{
			name: "file editor request without parent uses itself",
			task: databaseStructs.Task{
				ID:                42,
				IsInteractiveTask: true,
				InteractiveTaskType: mythicStructs.NullInt64{
					NullInt64: sql.NullInt64{
						Int64: int64(InteractiveTask.FileEditorRequest),
						Valid: true,
					},
				},
			},
			want: 42,
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := uploadedFileAssociationTaskID(&test.task); got != test.want {
				t.Fatalf("expected association task ID %d, got %d", test.want, got)
			}
		})
	}
}
