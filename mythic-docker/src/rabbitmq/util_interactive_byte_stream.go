package rabbitmq

import (
	"encoding/base64"
	"errors"
	"fmt"
	"io"
	"slices"
	"sync"
	"sync/atomic"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
)

// InteractiveTaskProtocol is immutable task/session metadata. It is never
// accepted from an interactive packet.
type InteractiveTaskProtocol string

const (
	InteractiveTaskProtocolTerminal InteractiveTaskProtocol = "terminal"
	InteractiveTaskProtocolRDP      InteractiveTaskProtocol = "rdp"
	InteractiveTaskProtocolVNC      InteractiveTaskProtocol = "vnc"
)

const (
	interactiveByteStreamBufferSize = 8 * 1024 * 1024
	interactiveByteStreamChunkSize  = 64 * 1024
	interactiveByteStreamBatchSize  = 1024 * 1024
	interactiveByteStreamMaxWindow  = 64 * 1024 * 1024
)

var (
	errInteractiveByteStreamNotFound = errors.New("interactive byte stream not found")
	errInteractiveByteStreamClosed   = errors.New("interactive byte stream is closed")
	errInteractiveByteStreamGap      = errors.New("interactive byte stream data is out of order")
)

// InteractiveByteStreamOptions registers the non-database sink for one task-scoped byte stream. Sink receives the
// bytes sent by the agent. The caller sends bytes in the other direction through the returned stream's Write method.
type InteractiveByteStreamOptions struct {
	CallbackID  int
	OperationID int
	TaskUUID    string
	Protocol    InteractiveTaskProtocol
	Sink        io.WriteCloser
}

type interactiveByteStreamChunk struct {
	offset uint64
	data   []byte
}

type interactiveByteStreamOutbound struct {
	message agentMessagePostResponseInteractive
	size    int
}

type interactiveByteStreamOutboundQueue struct {
	mu       sync.Mutex
	cond     *sync.Cond
	delivery sync.Mutex
	messages []interactiveByteStreamOutbound
	bytes    int
}

func newInteractiveByteStreamOutboundQueue() *interactiveByteStreamOutboundQueue {
	queue := &interactiveByteStreamOutboundQueue{}
	queue.cond = sync.NewCond(&queue.mu)
	return queue
}

// InteractiveByteStream is an opaque, ordered byte stream between an internal Mythic consumer and an agent.
// It implements io.WriteCloser for the consumer-to-agent direction.
type InteractiveByteStream struct {
	manager     *interactiveByteStreamManager
	callbackID  int
	taskUUID    string
	operationID int
	sink        io.WriteCloser

	closed    atomic.Bool
	closeOnce sync.Once
	done      chan struct{}
	sendMu    sync.Mutex

	mu                    sync.Mutex
	cond                  *sync.Cond
	inbound               []interactiveByteStreamChunk
	inboundBytes          int
	expectedInboundOffset uint64
	consumedInboundOffset uint64
	remoteClosing         bool

	nextOutboundOffset uint64
	peerAck            uint64
	peerWindow         uint64
}

type interactiveByteStreamManager struct {
	mu       sync.RWMutex
	streams  map[string]*InteractiveByteStream
	outbound map[int]*interactiveByteStreamOutboundQueue

	bufferSize int
	chunkSize  int
	batchSize  int
	maxWindow  uint64
	deliver    func(callbackID int, proxyType string, message interface{}) error
	bootstrap  func(manager *interactiveByteStreamManager, callbackID int, operationID int,
		message agentMessagePostResponseInteractive) (*InteractiveByteStream, error)
}

func newInteractiveByteStreamManager() *interactiveByteStreamManager {
	return &interactiveByteStreamManager{
		streams:    make(map[string]*InteractiveByteStream),
		outbound:   make(map[int]*interactiveByteStreamOutboundQueue),
		bufferSize: interactiveByteStreamBufferSize,
		chunkSize:  interactiveByteStreamChunkSize,
		batchSize:  interactiveByteStreamBatchSize,
		maxWindow:  interactiveByteStreamMaxWindow,
		deliver:    sendProxyMessageToPushC2,
	}
}

var interactiveByteStreams = func() *interactiveByteStreamManager {
	manager := newInteractiveByteStreamManager()
	manager.bootstrap = bootstrapGuacdByteStream
	return manager
}()

func (message agentMessagePostResponseInteractive) isByteStream() bool {
	return InteractiveTask.IsByteStream(message.MessageType)
}

func validInteractiveByteStreamProtocol(protocol InteractiveTaskProtocol) bool {
	return protocol == InteractiveTaskProtocolRDP || protocol == InteractiveTaskProtocolVNC
}

// OpenInteractiveByteStream attaches a non-database consumer to an agent task. The caller is responsible for
// authorizing the task before opening the stream. Registration advertises the initial receive window to the agent
// immediately or queues it for the agent's next tasking check-in.
func OpenInteractiveByteStream(options InteractiveByteStreamOptions) (*InteractiveByteStream, error) {
	return interactiveByteStreams.open(options)
}

// CloseInteractiveByteStream ends a task-owned stream. Viewer detach must not call this: the stream and its guacd
// consumer intentionally outlive individual browser viewers so recording and later live reattachment can continue.
func CloseInteractiveByteStream(taskUUID string) error {
	interactiveByteStreams.mu.RLock()
	stream := interactiveByteStreams.streams[taskUUID]
	interactiveByteStreams.mu.RUnlock()
	if stream == nil {
		return errInteractiveByteStreamNotFound
	}
	return stream.Close()
}

func (manager *interactiveByteStreamManager) open(options InteractiveByteStreamOptions) (*InteractiveByteStream, error) {
	if options.CallbackID <= 0 || options.OperationID <= 0 || options.TaskUUID == "" {
		return nil, errors.New("interactive byte stream identifiers are required")
	}
	if !validInteractiveByteStreamProtocol(options.Protocol) {
		return nil, fmt.Errorf("unsupported interactive byte stream protocol %q", options.Protocol)
	}
	if options.Sink == nil {
		return nil, errors.New("interactive byte stream sink is required")
	}
	stream := &InteractiveByteStream{
		manager:     manager,
		callbackID:  options.CallbackID,
		taskUUID:    options.TaskUUID,
		operationID: options.OperationID,
		sink:        options.Sink,
		done:        make(chan struct{}),
	}
	stream.cond = sync.NewCond(&stream.mu)

	manager.mu.Lock()
	if _, exists := manager.streams[stream.taskUUID]; exists {
		manager.mu.Unlock()
		return nil, errors.New("interactive byte stream already exists")
	}
	manager.streams[stream.taskUUID] = stream
	manager.mu.Unlock()

	go stream.consumeAgentData()
	if err := manager.enqueue(stream, stream.message(InteractiveTask.StreamWindow, "", 0, 0,
		uint32(manager.bufferSize), ""), 1, false); err != nil {
		stream.finish()
		return nil, err
	}
	return stream, nil
}

// Done closes when the task-owned byte stream ends. Browser viewers joining or leaving do not affect this signal.
func (stream *InteractiveByteStream) Done() <-chan struct{} {
	return stream.done
}

func (stream *InteractiveByteStream) message(messageType InteractiveTask.MessageType, data string, offset uint64,
	ack uint64, window uint32, reason string) agentMessagePostResponseInteractive {
	return agentMessagePostResponseInteractive{
		TaskUUID:    stream.taskUUID,
		MessageType: messageType,
		Data:        data,
		Offset:      offset,
		Ack:         ack,
		Window:      window,
		Reason:      reason,
	}
}

func (manager *interactiveByteStreamManager) getQueue(callbackID int) *interactiveByteStreamOutboundQueue {
	manager.mu.Lock()
	defer manager.mu.Unlock()
	if queue, ok := manager.outbound[callbackID]; ok {
		return queue
	}
	queue := newInteractiveByteStreamOutboundQueue()
	manager.outbound[callbackID] = queue
	return queue
}

func (manager *interactiveByteStreamManager) enqueue(stream *InteractiveByteStream,
	message agentMessagePostResponseInteractive, size int, enforceLimit bool) error {
	queue := manager.getQueue(stream.callbackID)
	queue.mu.Lock()
	for enforceLimit && queue.bytes+size > manager.bufferSize {
		if stream == nil || stream.closed.Load() {
			queue.mu.Unlock()
			return errInteractiveByteStreamClosed
		}
		queue.cond.Wait()
	}
	if stream != nil && stream.closed.Load() {
		queue.mu.Unlock()
		return errInteractiveByteStreamClosed
	}
	queue.messages = append(queue.messages, interactiveByteStreamOutbound{message: message, size: max(size, 1)})
	queue.bytes += max(size, 1)
	queue.mu.Unlock()
	return manager.flushPush(stream.callbackID, queue)
}

func (manager *interactiveByteStreamManager) enqueueForCallback(callbackID int,
	message agentMessagePostResponseInteractive) error {
	queue := manager.getQueue(callbackID)
	queue.mu.Lock()
	queue.messages = append(queue.messages, interactiveByteStreamOutbound{message: message, size: 1})
	queue.bytes++
	queue.mu.Unlock()
	return manager.flushPush(callbackID, queue)
}

func (manager *interactiveByteStreamManager) flushPush(callbackID int,
	queue *interactiveByteStreamOutboundQueue) error {
	queue.delivery.Lock()
	defer queue.delivery.Unlock()
	for {
		queue.mu.Lock()
		if len(queue.messages) == 0 {
			queue.mu.Unlock()
			return nil
		}
		message := queue.messages[0]
		queue.mu.Unlock()

		err := manager.deliver(callbackID, CALLBACK_PORT_TYPE_INTERACTIVE, message.message)
		if errors.Is(err, errNoPushC2Route) {
			return nil
		}
		if err != nil {
			return err
		}
		queue.mu.Lock()
		queue.messages = queue.messages[1:]
		queue.bytes -= message.size
		queue.cond.Broadcast()
		queue.mu.Unlock()
	}
}

func (manager *interactiveByteStreamManager) takeOutbound(callbackID int) []agentMessagePostResponseInteractive {
	manager.mu.RLock()
	queue := manager.outbound[callbackID]
	manager.mu.RUnlock()
	if queue == nil {
		return nil
	}
	queue.delivery.Lock()
	defer queue.delivery.Unlock()
	queue.mu.Lock()
	defer queue.mu.Unlock()
	if len(queue.messages) == 0 {
		return nil
	}
	result := make([]agentMessagePostResponseInteractive, 0, len(queue.messages))
	used := 0
	count := 0
	for _, pending := range queue.messages {
		if count > 0 && used+pending.size > manager.batchSize {
			break
		}
		result = append(result, pending.message)
		used += pending.size
		count++
	}
	queue.messages = queue.messages[count:]
	queue.bytes -= used
	queue.cond.Broadcast()
	return result
}

func (manager *interactiveByteStreamManager) pendingCallbackIDs(exclude int) []int {
	manager.mu.RLock()
	queues := make(map[int]*interactiveByteStreamOutboundQueue, len(manager.outbound))
	for callbackID, queue := range manager.outbound {
		if callbackID != exclude {
			queues[callbackID] = queue
		}
	}
	manager.mu.RUnlock()
	callbackIDs := make([]int, 0, len(queues))
	for callbackID, queue := range queues {
		queue.mu.Lock()
		pending := len(queue.messages) > 0
		queue.mu.Unlock()
		if pending {
			callbackIDs = append(callbackIDs, callbackID)
		}
	}
	slices.Sort(callbackIDs)
	return callbackIDs
}

func (manager *interactiveByteStreamManager) handleAgentMessage(callbackID int, operationID int,
	message agentMessagePostResponseInteractive) error {
	manager.mu.RLock()
	stream := manager.streams[message.TaskUUID]
	manager.mu.RUnlock()
	if stream == nil && manager.bootstrap != nil && message.MessageType == InteractiveTask.StreamWindow {
		var err error
		stream, err = manager.bootstrap(manager, callbackID, operationID, message)
		if err != nil {
			reason := "failed to start interactive desktop session: " + err.Error()
			_ = manager.enqueueForCallback(callbackID, agentMessagePostResponseInteractive{
				TaskUUID: message.TaskUUID, MessageType: InteractiveTask.StreamReset, Reason: reason,
			})
			return err
		}
	}
	if stream == nil {
		// A late close/reset is the acknowledgement for a stream Mythic has already torn down.
		if message.MessageType == InteractiveTask.StreamClose || message.MessageType == InteractiveTask.StreamReset {
			return nil
		}
		reason := "interactive byte stream is no longer active"
		_ = manager.enqueueForCallback(callbackID, agentMessagePostResponseInteractive{
			TaskUUID: message.TaskUUID, MessageType: InteractiveTask.StreamReset, Reason: reason,
		})
		return errInteractiveByteStreamNotFound
	}
	if stream.callbackID != callbackID || stream.operationID != operationID {
		_ = manager.enqueueForCallback(callbackID, agentMessagePostResponseInteractive{
			TaskUUID: message.TaskUUID, MessageType: InteractiveTask.StreamReset,
			Reason: "interactive byte stream ownership mismatch",
		})
		return errors.New("interactive byte stream operation mismatch")
	}
	switch message.MessageType {
	case InteractiveTask.StreamWindow:
		return stream.updatePeerWindow(message.Ack, message.Window)
	case InteractiveTask.StreamData:
		return stream.receive(message)
	case InteractiveTask.StreamClose:
		stream.remoteClose(message.Reason)
		return nil
	case InteractiveTask.StreamReset:
		stream.finish()
		return nil
	default:
		stream.reset("unknown interactive byte stream record type")
		return fmt.Errorf("unknown interactive byte stream message type %d", message.MessageType)
	}
}
func (stream *InteractiveByteStream) updatePeerWindow(ack uint64, window uint32) error {
	stream.mu.Lock()
	defer stream.mu.Unlock()
	if stream.closed.Load() {
		return errInteractiveByteStreamClosed
	}
	if ack < stream.peerAck || ack > stream.nextOutboundOffset {
		go stream.reset("invalid interactive byte stream acknowledgement")
		return errors.New("invalid interactive byte stream acknowledgement")
	}
	stream.peerAck = ack
	stream.peerWindow = min(uint64(window), stream.manager.maxWindow)
	stream.cond.Broadcast()
	return nil
}

func (stream *InteractiveByteStream) receive(message agentMessagePostResponseInteractive) error {
	data, err := base64.StdEncoding.DecodeString(message.Data)
	if err != nil {
		stream.reset("invalid base64 in interactive byte stream")
		return err
	}
	stream.mu.Lock()
	if stream.closed.Load() || stream.remoteClosing {
		stream.mu.Unlock()
		return errInteractiveByteStreamClosed
	}
	end := message.Offset + uint64(len(data))
	if end < message.Offset {
		stream.mu.Unlock()
		stream.reset("interactive byte stream offset overflow")
		return errInteractiveByteStreamGap
	}
	if message.Offset < stream.expectedInboundOffset {
		// Whole-message retries are harmless. Partial overlaps are ambiguous and close the stream.
		if end <= stream.expectedInboundOffset {
			stream.mu.Unlock()
			return nil
		}
		stream.mu.Unlock()
		stream.reset("partially overlapping interactive byte stream data")
		return errInteractiveByteStreamGap
	}
	if message.Offset != stream.expectedInboundOffset {
		stream.mu.Unlock()
		stream.reset("gap in interactive byte stream data")
		return errInteractiveByteStreamGap
	}
	if stream.inboundBytes+len(data) > stream.manager.bufferSize {
		stream.mu.Unlock()
		stream.reset("interactive byte stream receive window exceeded")
		return errors.New("interactive byte stream receive window exceeded")
	}
	if len(data) > 0 {
		stream.inbound = append(stream.inbound, interactiveByteStreamChunk{offset: message.Offset, data: data})
		stream.inboundBytes += len(data)
	}
	stream.expectedInboundOffset = end
	stream.cond.Broadcast()
	stream.mu.Unlock()
	return nil
}

func (stream *InteractiveByteStream) consumeAgentData() {
	for {
		stream.mu.Lock()
		for len(stream.inbound) == 0 && !stream.remoteClosing && !stream.closed.Load() {
			stream.cond.Wait()
		}
		if stream.closed.Load() {
			stream.mu.Unlock()
			return
		}
		if len(stream.inbound) == 0 && stream.remoteClosing {
			stream.mu.Unlock()
			stream.finish()
			return
		}
		chunk := stream.inbound[0]
		stream.inbound = stream.inbound[1:]
		stream.mu.Unlock()

		if err := writeAll(stream.sink, chunk.data); err != nil {
			stream.reset("interactive byte stream consumer failed: " + err.Error())
			return
		}
		stream.mu.Lock()
		stream.inboundBytes -= len(chunk.data)
		stream.consumedInboundOffset = chunk.offset + uint64(len(chunk.data))
		ack := stream.consumedInboundOffset
		closing := stream.remoteClosing && len(stream.inbound) == 0
		stream.mu.Unlock()

		_ = stream.manager.enqueue(stream, stream.message(InteractiveTask.StreamWindow, "", 0, ack,
			uint32(stream.manager.bufferSize), ""), 1, false)
		if closing {
			stream.finish()
			return
		}
	}
}

func writeAll(writer io.Writer, data []byte) error {
	for len(data) > 0 {
		written, err := writer.Write(data)
		if err != nil {
			return err
		}
		if written <= 0 || written > len(data) {
			return io.ErrShortWrite
		}
		data = data[written:]
	}
	return nil
}

// Write sends opaque bytes to the agent. It blocks when the agent's advertised receive window or Mythic's bounded
// outbound queue is full, providing backpressure to the guacd bridge instead of dropping protocol bytes.
func (stream *InteractiveByteStream) Write(data []byte) (int, error) {
	stream.sendMu.Lock()
	defer stream.sendMu.Unlock()
	written := 0
	for len(data) > 0 {
		length := min(len(data), stream.manager.chunkSize)
		stream.mu.Lock()
		end := stream.nextOutboundOffset + uint64(length)
		if end < stream.nextOutboundOffset {
			stream.mu.Unlock()
			stream.reset("interactive byte stream offset overflow")
			return written, errors.New("interactive byte stream offset overflow")
		}
		creditEnd := stream.peerAck + stream.peerWindow
		if creditEnd < stream.peerAck {
			creditEnd = ^uint64(0)
		}
		for !stream.closed.Load() && end > creditEnd {
			stream.cond.Wait()
			creditEnd = stream.peerAck + stream.peerWindow
			if creditEnd < stream.peerAck {
				creditEnd = ^uint64(0)
			}
		}
		if stream.closed.Load() {
			stream.mu.Unlock()
			return written, errInteractiveByteStreamClosed
		}
		offset := stream.nextOutboundOffset
		stream.nextOutboundOffset += uint64(length)
		stream.mu.Unlock()

		encoded := base64.StdEncoding.EncodeToString(data[:length])
		message := stream.message(InteractiveTask.StreamData, encoded, offset, 0, 0, "")
		if err := stream.manager.enqueue(stream, message, length, true); err != nil {
			stream.reset("failed to queue interactive byte stream data: " + err.Error())
			return written, err
		}
		written += length
		data = data[length:]
	}
	return written, nil
}

// Close closes the local side and asks the agent to close its byte-stream endpoint.
func (stream *InteractiveByteStream) Close() error {
	return stream.closeWithReason("local interactive byte stream closed")
}

func (stream *InteractiveByteStream) closeWithReason(reason string) error {
	if stream.closed.Load() {
		return nil
	}
	_ = stream.manager.enqueue(stream, stream.message(InteractiveTask.StreamClose, "", 0, 0, 0,
		reason), 1, false)
	stream.finish()
	return nil
}

func (stream *InteractiveByteStream) remoteClose(_ string) {
	stream.mu.Lock()
	if !stream.closed.Load() {
		stream.remoteClosing = true
		stream.cond.Broadcast()
	}
	stream.mu.Unlock()
}

func (stream *InteractiveByteStream) reset(reason string) {
	if stream.closed.Load() {
		return
	}
	_ = stream.manager.enqueue(stream, stream.message(InteractiveTask.StreamReset, "", 0, 0, 0, reason), 1, false)
	stream.finish()
}

func (stream *InteractiveByteStream) finish() {
	stream.closeOnce.Do(func() {
		stream.closed.Store(true)
		stream.mu.Lock()
		stream.cond.Broadcast()
		stream.mu.Unlock()
		stream.manager.mu.Lock()
		delete(stream.manager.streams, stream.taskUUID)
		queue := stream.manager.outbound[stream.callbackID]
		stream.manager.mu.Unlock()
		if queue != nil {
			queue.mu.Lock()
			queue.cond.Broadcast()
			queue.mu.Unlock()
		}
		_ = stream.sink.Close()
		// A task-owned guacd session has the same lifetime as its underlying
		// agent byte stream. Browser viewers are joined users and never reach
		// this path when they detach.
		_ = CloseGuacdSession(stream.taskUUID)
		close(stream.done)
	})
}
