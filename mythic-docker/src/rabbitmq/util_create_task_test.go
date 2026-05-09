package rabbitmq

import (
	"slices"
	"testing"
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
