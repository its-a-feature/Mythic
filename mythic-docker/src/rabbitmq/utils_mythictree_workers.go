package rabbitmq

import (
	"sync"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

// mythicTreeIngestMessageKind tells the shared MythicTree worker how to route
// one queued ingest message without needing separate queues for each browser
// type.
type mythicTreeIngestMessageKind int

const (
	mythicTreeIngestFileBrowser mythicTreeIngestMessageKind = iota
	mythicTreeIngestFileBrowserFlush
	mythicTreeIngestProcess
	mythicTreeIngestCustomBrowser
)

// mythicTreeIngestMessage is the bounded-queue payload for all MythicTree write
// paths. Only the field that matches Kind is populated.
type mythicTreeIngestMessage struct {
	Kind          mythicTreeIngestMessageKind
	Task          databaseStructs.Task
	FileBrowser   *agentMessagePostResponseFileBrowser
	Processes     *[]agentMessagePostResponseProcesses
	CustomBrowser *agentMessagePostResponseCustomBrowser
	APITokenID    int
}

var mythicTreeWorkerChannels []chan mythicTreeIngestMessage
var mythicTreeIngestWorkersOnce sync.Once

// listenForMythicTreeData initializes one bounded worker pool for MythicTree
// ingest. File browser, process browser, and custom browser all write the same
// table, so one sharded queue gives us one place to control DB pressure during
// high-rate callback check-ins.
func listenForMythicTreeData() {
	mythicTreeIngestWorkersOnce.Do(initializeMythicTreeIngestWorkers)
}

// initializeMythicTreeIngestWorkers starts the update_deleted coordinator and a
// sharded worker pool sized from the existing post-response worker settings.
func initializeMythicTreeIngestWorkers() {
	go listenForFileBrowserUpdateDeleted()
	workerCount := getAgentMessagePostResponseWorkerCount()
	queueSize := getAgentMessagePostResponseQueueSize()
	mythicTreeWorkerChannels = make([]chan mythicTreeIngestMessage, workerCount)
	for i := 0; i < workerCount; i++ {
		mythicTreeWorkerChannels[i] = make(chan mythicTreeIngestMessage, queueSize)
		go listenForMythicTreeWorker(i, mythicTreeWorkerChannels[i])
	}
}

// enqueueMythicTreeFileBrowserResponse queues a single file browser response so
// agent post-response processing is not blocked on MythicTree DB writes.
func enqueueMythicTreeFileBrowserResponse(task databaseStructs.Task, fileBrowser *agentMessagePostResponseFileBrowser, apitokensId int) {
	enqueueMythicTreeIngestMessage(mythicTreeIngestMessage{
		Kind:        mythicTreeIngestFileBrowser,
		Task:        task,
		FileBrowser: fileBrowser,
		APITokenID:  apitokensId,
	})
}

// enqueueMythicTreeFileBrowserFlush queues the completion marker that tells the
// file-browser update_deleted coordinator it can reconcile cached chunks.
func enqueueMythicTreeFileBrowserFlush(task databaseStructs.Task, apitokensId int) {
	enqueueMythicTreeIngestMessage(mythicTreeIngestMessage{
		Kind:       mythicTreeIngestFileBrowserFlush,
		Task:       task,
		APITokenID: apitokensId,
	})
}

// enqueueMythicTreeProcessResponse queues process MythicTree data on the shared
// ingest pool, preserving the direct RPC path for callers that need it.
func enqueueMythicTreeProcessResponse(task databaseStructs.Task, processes *[]agentMessagePostResponseProcesses, apitokensId int) {
	if processes == nil {
		return
	}
	enqueueMythicTreeIngestMessage(mythicTreeIngestMessage{
		Kind:       mythicTreeIngestProcess,
		Task:       task,
		Processes:  processes,
		APITokenID: apitokensId,
	})
}

// enqueueMythicTreeCustomBrowserResponse queues custom-browser MythicTree data
// on the same bounded pool as file and process browser data.
func enqueueMythicTreeCustomBrowserResponse(task databaseStructs.Task, customBrowser *agentMessagePostResponseCustomBrowser) {
	if customBrowser == nil {
		return
	}
	enqueueMythicTreeIngestMessage(mythicTreeIngestMessage{
		Kind:          mythicTreeIngestCustomBrowser,
		Task:          task,
		CustomBrowser: customBrowser,
	})
}

// enqueueMythicTreeIngestMessage lazily starts the pool and consistently shards
// all MythicTree work for a task to the same worker. That keeps per-task flush
// ordering intact while still allowing unrelated tasks to run in parallel.
func enqueueMythicTreeIngestMessage(msg mythicTreeIngestMessage) {
	mythicTreeIngestWorkersOnce.Do(initializeMythicTreeIngestWorkers)
	workerID := getMythicTreeWorkerID(msg.Task.ID, len(mythicTreeWorkerChannels))
	mythicTreeWorkerChannels[workerID] <- msg
}

// getMythicTreeWorkerID maps task IDs to worker shards. Keeping this tiny and
// deterministic makes it easy to test ordering assumptions.
func getMythicTreeWorkerID(taskID int, workerCount int) int {
	if workerCount <= 1 {
		return 0
	}
	workerID := taskID % workerCount
	if workerID < 0 {
		return 0
	}
	return workerID
}

// listenForMythicTreeWorker serializes MythicTree writes for a shard and
// dispatches to the existing handlers so their request-specific semantics stay
// unchanged.
func listenForMythicTreeWorker(workerID int, input <-chan mythicTreeIngestMessage) {
	for msg := range input {
		switch msg.Kind {
		case mythicTreeIngestFileBrowser:
			if err := HandleAgentMessagePostResponseFileBrowser(msg.Task, msg.FileBrowser, msg.APITokenID); err != nil {
				logging.LogError(err, "Failed to handle file browser MythicTree post response", "worker_id", workerID, "task_id", msg.Task.ID)
			}
		case mythicTreeIngestFileBrowserFlush:
			if err := HandleAgentMessagePostResponseFileBrowser(msg.Task, nil, msg.APITokenID); err != nil {
				logging.LogError(err, "Failed to flush file browser MythicTree post response", "worker_id", workerID, "task_id", msg.Task.ID)
			}
		case mythicTreeIngestProcess:
			if err := HandleAgentMessagePostResponseProcesses(msg.Task, msg.Processes, msg.APITokenID); err != nil {
				logging.LogError(err, "Failed to handle process MythicTree post response", "worker_id", workerID, "task_id", msg.Task.ID)
			}
		case mythicTreeIngestCustomBrowser:
			handleAgentMessagePostResponseCustomBrowser(msg.Task, msg.CustomBrowser)
		default:
			logging.LogError(nil, "Unknown MythicTree ingest message kind", "worker_id", workerID, "task_id", msg.Task.ID, "kind", msg.Kind)
		}
	}
}
