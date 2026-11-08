package rabbitmq

import (
	"bytes"
	"encoding/base64"
	"errors"
	"io"
	"slices"
	"sync"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

type testInteractiveByteStreamSink struct {
	sync.Mutex
	data      []byte
	closed    bool
	closedNow chan struct{}
	closeOnce sync.Once
}

func newTestInteractiveByteStreamSink() *testInteractiveByteStreamSink {
	return &testInteractiveByteStreamSink{closedNow: make(chan struct{})}
}

func (sink *testInteractiveByteStreamSink) Write(data []byte) (int, error) {
	sink.Lock()
	defer sink.Unlock()
	if sink.closed {
		return 0, io.ErrClosedPipe
	}
	sink.data = append(sink.data, data...)
	return len(data), nil
}

func (sink *testInteractiveByteStreamSink) Close() error {
	sink.Lock()
	sink.closed = true
	sink.Unlock()
	sink.closeOnce.Do(func() { close(sink.closedNow) })
	return nil
}

func (sink *testInteractiveByteStreamSink) bytes() []byte {
	sink.Lock()
	defer sink.Unlock()
	return slices.Clone(sink.data)
}

func newTestInteractiveByteStreamManager() *interactiveByteStreamManager {
	manager := newInteractiveByteStreamManager()
	manager.deliver = func(int, string, interface{}) error { return errNoPushC2Route }
	return manager
}

func openTestInteractiveByteStream(t *testing.T, manager *interactiveByteStreamManager,
	sink io.WriteCloser) *InteractiveByteStream {
	t.Helper()
	stream, err := manager.open(InteractiveByteStreamOptions{
		CallbackID: 10, OperationID: 20, TaskUUID: "task-one", Protocol: InteractiveTaskProtocolRDP, Sink: sink,
	})
	if err != nil {
		t.Fatalf("open byte stream: %v", err)
	}
	t.Cleanup(func() { _ = stream.Close() })
	initialWindow := manager.takeOutbound(10)
	if len(initialWindow) != 1 || initialWindow[0].MessageType != InteractiveTask.StreamWindow ||
		initialWindow[0].TaskUUID != "task-one" || initialWindow[0].Window != uint32(manager.bufferSize) {
		t.Fatalf("initial window messages = %#v", initialWindow)
	}
	return stream
}

func waitForInteractiveBytes(t *testing.T, sink *testInteractiveByteStreamSink, want []byte) {
	t.Helper()
	deadline := time.Now().Add(time.Second)
	for time.Now().Before(deadline) {
		if bytes.Equal(sink.bytes(), want) {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatalf("sink bytes = %x, want %x", sink.bytes(), want)
}

func TestInteractiveByteStreamBootstrapsFromFirstWindow(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	sink := newTestInteractiveByteStreamSink()
	called := false
	manager.bootstrap = func(manager *interactiveByteStreamManager, callbackID int, operationID int,
		message agentMessagePostResponseInteractive) (*InteractiveByteStream, error) {
		called = true
		return manager.open(InteractiveByteStreamOptions{
			CallbackID: callbackID, OperationID: operationID, TaskUUID: message.TaskUUID,
			Protocol: InteractiveTaskProtocolRDP, Sink: sink,
		})
	}
	if err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "lazy-task", MessageType: InteractiveTask.StreamWindow, Window: 4096,
	}); err != nil {
		t.Fatal(err)
	}
	if !called {
		t.Fatal("first stream window did not invoke the task bootstrap")
	}
	manager.mu.RLock()
	stream := manager.streams["lazy-task"]
	manager.mu.RUnlock()
	if stream == nil {
		t.Fatal("bootstrap did not register the task stream")
	}
	t.Cleanup(func() { _ = stream.Close() })
	stream.mu.Lock()
	peerWindow := stream.peerWindow
	stream.mu.Unlock()
	if peerWindow != 4096 {
		t.Fatalf("peer window = %d, want 4096", peerWindow)
	}
}

func TestInteractiveByteStreamRoutesOpaqueOrderedBytes(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	sink := newTestInteractiveByteStreamSink()
	openTestInteractiveByteStream(t, manager, sink)

	first := []byte{0x00, 0xff, 0x80, 'R', 'D', 'P'}
	second := []byte{0x03, 0x00, 0x00, 0x13}
	for _, message := range []agentMessagePostResponseInteractive{
		{TaskUUID: "task-one", MessageType: InteractiveTask.StreamData,
			Offset: 0, Data: base64.StdEncoding.EncodeToString(first)},
		{TaskUUID: "task-one", MessageType: InteractiveTask.StreamData,
			Offset: uint64(len(first)), Data: base64.StdEncoding.EncodeToString(second)},
	} {
		if err := manager.handleAgentMessage(10, 20, message); err != nil {
			t.Fatalf("route byte stream data: %v", err)
		}
	}
	want := append(slices.Clone(first), second...)
	waitForInteractiveBytes(t, sink, want)

	windows := manager.takeOutbound(10)
	if len(windows) == 0 || windows[len(windows)-1].MessageType != InteractiveTask.StreamWindow ||
		windows[len(windows)-1].Ack != uint64(len(want)) {
		t.Fatalf("window messages = %#v", windows)
	}
}

func TestInteractiveByteStreamIgnoresWholeChunkRetries(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	sink := newTestInteractiveByteStreamSink()
	openTestInteractiveByteStream(t, manager, sink)
	message := agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamData,
		Offset: 0, Data: base64.StdEncoding.EncodeToString([]byte("once")),
	}
	if err := manager.handleAgentMessage(10, 20, message); err != nil {
		t.Fatal(err)
	}
	waitForInteractiveBytes(t, sink, []byte("once"))
	if err := manager.handleAgentMessage(10, 20, message); err != nil {
		t.Fatalf("retry: %v", err)
	}
	time.Sleep(10 * time.Millisecond)
	if got := sink.bytes(); !bytes.Equal(got, []byte("once")) {
		t.Fatalf("retried data was written twice: %q", got)
	}
}

func TestInteractiveByteStreamGapResetsWholeTaskStream(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	sink := newTestInteractiveByteStreamSink()
	openTestInteractiveByteStream(t, manager, sink)

	err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamData, Offset: 1,
		Data: base64.StdEncoding.EncodeToString([]byte("gap")),
	})
	if !errors.Is(err, errInteractiveByteStreamGap) {
		t.Fatalf("gap error = %v", err)
	}
	select {
	case <-sink.closedNow:
	case <-time.After(time.Second):
		t.Fatal("sink was not closed after a gap")
	}
	messages := manager.takeOutbound(10)
	if len(messages) != 1 || messages[0].MessageType != InteractiveTask.StreamReset {
		t.Fatalf("reset messages = %#v", messages)
	}
}

func TestInteractiveByteStreamRejectsWrongCallbackWithoutClosingOwner(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	sink := newTestInteractiveByteStreamSink()
	stream := openTestInteractiveByteStream(t, manager, sink)
	err := manager.handleAgentMessage(99, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamData,
		Data: base64.StdEncoding.EncodeToString([]byte("wrong owner")),
	})
	if err == nil {
		t.Fatal("wrong callback was allowed to write to the stream")
	}
	if stream.closed.Load() {
		t.Fatal("wrong callback was able to close the owning callback's stream")
	}
	resets := manager.takeOutbound(99)
	if len(resets) != 1 || resets[0].MessageType != InteractiveTask.StreamReset {
		t.Fatalf("wrong callback reset messages = %#v", resets)
	}
}

func TestInteractiveByteStreamRemoteCloseDrainsQueuedBytes(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	sink := newTestInteractiveByteStreamSink()
	stream := openTestInteractiveByteStream(t, manager, sink)
	data := []byte("final bytes")
	if err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamData,
		Data: base64.StdEncoding.EncodeToString(data),
	}); err != nil {
		t.Fatal(err)
	}
	if err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamClose,
	}); err != nil {
		t.Fatal(err)
	}
	waitForInteractiveBytes(t, sink, data)
	select {
	case <-sink.closedNow:
	case <-time.After(time.Second):
		t.Fatal("remote close did not close the sink after draining")
	}
	select {
	case <-stream.Done():
	case <-time.After(time.Second):
		t.Fatal("remote close did not end the task-owned stream")
	}
}

func TestInteractiveByteStreamWriteHonoursPeerWindow(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	manager.chunkSize = 3
	sink := newTestInteractiveByteStreamSink()
	stream := openTestInteractiveByteStream(t, manager, sink)

	done := make(chan error, 1)
	go func() {
		_, err := stream.Write([]byte("abcdef"))
		done <- err
	}()
	select {
	case err := <-done:
		t.Fatalf("write completed before the peer advertised a window: %v", err)
	case <-time.After(10 * time.Millisecond):
	}
	if err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamWindow, Window: 3,
	}); err != nil {
		t.Fatal(err)
	}

	deadline := time.Now().Add(time.Second)
	var first []agentMessagePostResponseInteractive
	for len(first) == 0 && time.Now().Before(deadline) {
		first = manager.takeOutbound(10)
		time.Sleep(time.Millisecond)
	}
	if len(first) != 1 || first[0].MessageType != InteractiveTask.StreamData || first[0].Offset != 0 ||
		first[0].Data != base64.StdEncoding.EncodeToString([]byte("abc")) {
		t.Fatalf("first window data = %#v", first)
	}
	select {
	case err := <-done:
		t.Fatalf("write completed before window acknowledgement: %v", err)
	case <-time.After(10 * time.Millisecond):
	}
	if err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamWindow, Ack: 3, Window: 3,
	}); err != nil {
		t.Fatal(err)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("write remained blocked after window acknowledgement")
	}
	second := manager.takeOutbound(10)
	if len(second) != 1 || second[0].Offset != 3 ||
		second[0].Data != base64.StdEncoding.EncodeToString([]byte("def")) {
		t.Fatalf("second window data = %#v", second)
	}
}

func TestInteractiveByteStreamOutboundQueueBackpressuresWithoutDropping(t *testing.T) {
	manager := newTestInteractiveByteStreamManager()
	manager.bufferSize = 3
	manager.chunkSize = 3
	manager.batchSize = 3
	stream := openTestInteractiveByteStream(t, manager, newTestInteractiveByteStreamSink())
	if err := manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "task-one", MessageType: InteractiveTask.StreamWindow, Window: 6,
	}); err != nil {
		t.Fatal(err)
	}

	done := make(chan error, 1)
	go func() {
		_, err := stream.Write([]byte("abcdef"))
		done <- err
	}()
	deadline := time.Now().Add(time.Second)
	for {
		manager.mu.RLock()
		queue := manager.outbound[10]
		manager.mu.RUnlock()
		queue.mu.Lock()
		queued := queue.bytes
		queue.mu.Unlock()
		if queued == 3 {
			break
		}
		if time.Now().After(deadline) {
			t.Fatal("first chunk was not queued")
		}
		time.Sleep(time.Millisecond)
	}
	select {
	case err := <-done:
		t.Fatalf("write did not backpressure at the queue limit: %v", err)
	case <-time.After(10 * time.Millisecond):
	}
	first := manager.takeOutbound(10)
	if len(first) != 1 || first[0].Data != base64.StdEncoding.EncodeToString([]byte("abc")) {
		t.Fatalf("first queue batch = %#v", first)
	}
	select {
	case err := <-done:
		if err != nil {
			t.Fatal(err)
		}
	case <-time.After(time.Second):
		t.Fatal("write did not resume after queue space became available")
	}
	second := manager.takeOutbound(10)
	if len(second) != 1 || second[0].Data != base64.StdEncoding.EncodeToString([]byte("def")) {
		t.Fatalf("second queue batch = %#v", second)
	}
}

func TestInteractiveByteStreamPollingNeedsNoCallbackPort(t *testing.T) {
	oldManager := interactiveByteStreams
	manager := newTestInteractiveByteStreamManager()
	interactiveByteStreams = manager
	t.Cleanup(func() { interactiveByteStreams = oldManager })
	sink := newTestInteractiveByteStreamSink()
	openTestInteractiveByteStream(t, manager, sink)

	// Open a second task because the helper consumed the first task's initial window.
	secondStream, err := manager.open(InteractiveByteStreamOptions{
		CallbackID: 30, OperationID: 20, TaskUUID: "task-two", Protocol: InteractiveTaskProtocolVNC,
		Sink: newTestInteractiveByteStreamSink(),
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = secondStream.Close() })
	registry := callbackPortsInUse{}
	replaceSubmittedTasksForProxyTest(t, nil)
	if callbackIDs := registry.GetOtherCallbackIdsWithPendingData(10); !slices.Equal(callbackIDs, []int{30}) {
		t.Fatalf("callbacks with byte stream data = %#v", callbackIDs)
	}
	data, err := registry.GetDataForCallbackIdAllTypes(30)
	if err != nil {
		t.Fatal(err)
	}
	if len(data.Interactive) != 1 || data.Interactive[0].TaskUUID != "task-two" ||
		data.Interactive[0].MessageType != InteractiveTask.StreamWindow {
		t.Fatalf("interactive polling data = %#v", data.Interactive)
	}
}

func TestInteractiveByteStreamOutputBypassesTerminalPersistence(t *testing.T) {
	oldManager := interactiveByteStreams
	manager := newTestInteractiveByteStreamManager()
	interactiveByteStreams = manager
	t.Cleanup(func() { interactiveByteStreams = oldManager })
	sink := newTestInteractiveByteStreamSink()
	openTestInteractiveByteStream(t, manager, sink)

	oldInsert := insertInteractiveLiveResponse
	persisted := false
	insertInteractiveLiveResponse = func(*databaseStructs.Response) error {
		persisted = true
		return nil
	}
	t.Cleanup(func() { insertInteractiveLiveResponse = oldInsert })

	registry := callbackPortsInUse{}
	registry.routeProxyFromAgentMessage(ProxyFromAgentMessageForMythic{
		CallbackID: 10, OperationID: 20, PortType: CALLBACK_PORT_TYPE_INTERACTIVE,
		InteractiveMessages: []agentMessagePostResponseInteractive{{
			TaskUUID: "task-one", MessageType: InteractiveTask.StreamData,
			Data: base64.StdEncoding.EncodeToString([]byte{0x00, 0xff}),
		}},
	})
	waitForInteractiveBytes(t, sink, []byte{0x00, 0xff})
	if persisted {
		t.Fatal("byte stream data was sent through terminal response persistence")
	}
}
