package rabbitmq

import "testing"

func TestGetMythicTreeWorkerID(t *testing.T) {
	if workerID := getMythicTreeWorkerID(10, 8); workerID != 2 {
		t.Fatalf("expected task 10 to shard to worker 2, got %d", workerID)
	}
	if workerID := getMythicTreeWorkerID(-1, 8); workerID != 0 {
		t.Fatalf("expected negative task id to shard to worker 0, got %d", workerID)
	}
	if workerID := getMythicTreeWorkerID(10, 0); workerID != 0 {
		t.Fatalf("expected zero workers to safely shard to worker 0, got %d", workerID)
	}
}
