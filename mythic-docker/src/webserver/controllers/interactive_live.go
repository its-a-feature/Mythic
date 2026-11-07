package webcontroller

import (
	"encoding/binary"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"strings"
	"sync"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// A browser tab opens one websocket and runs a stream over it for each interactive task it shows.
// Control messages are JSON text; output is binary: a 4 byte big-endian stream id, a 1 byte interactive
// message type, then the data. Only "pty" streams exist so far.
const (
	interactiveLiveProtocol = "mythic.live.v1"
	// browsers can't set headers on a websocket, so the token comes as a second subprotocol
	interactiveLiveTokenProtocolPrefix = "bearer."
	// output a stream can have in flight before the browser hands back credit for it
	interactiveLiveWindow = 1024 * 1024
	// output a stream can have queued before it's closed and the browser has to reload from the database
	interactiveLiveMaxQueued    = 8 * 1024 * 1024
	interactiveLiveMaxStreams   = 64
	interactiveLivePingPeriod   = 30 * time.Second
	interactiveLiveReadTimeout  = 70 * time.Second
	interactiveLiveWriteTimeout = 10 * time.Second
	interactiveLiveCloseExpired = 4001
)

var interactiveLiveUpgrader = websocket.Upgrader{
	Subprotocols:    []string{interactiveLiveProtocol},
	ReadBufferSize:  4096,
	WriteBufferSize: 64 * 1024,
}

type interactiveLiveClientMessage struct {
	Type                string `json:"type"`
	Channel             uint32 `json:"channel"`
	Kind                string `json:"kind"`
	TaskID              int    `json:"task_id"`
	Bytes               int    `json:"bytes"`
	InteractiveTaskType int    `json:"interactive_task_type"`
	Params              string `json:"params"`
	OriginalParams      string `json:"original_params"`
}

type interactiveLiveServerMessage struct {
	Type       string `json:"type"`
	Channel    uint32 `json:"channel"`
	ResponseID int    `json:"response_id,omitempty"`
	CanWrite   bool   `json:"can_write,omitempty"`
	Cols       int    `json:"cols,omitempty"`
	Rows       int    `json:"rows,omitempty"`
	Reason     string `json:"reason,omitempty"`
	Error      string `json:"error,omitempty"`
}

type interactiveLiveFrame struct {
	messageType int
	data        []byte
	// output bytes counted against the stream's window
	size int
}

type interactiveLiveConnection struct {
	conn        *websocket.Conn
	claims      *mythicjwt.CustomClaims
	authContext rabbitmq.RabbitMQAuthContext
	canWrite    bool
	sync.Mutex
	streams map[uint32]*interactiveLiveStream
	// control messages for streams that don't exist
	control []interactiveLiveFrame
	wake    chan struct{}
	done    chan struct{}
}

type interactiveLiveStream struct {
	connection *interactiveLiveConnection
	channel    uint32
	task       interactiveLiveTask
	// guarded by the connection
	queue       []interactiveLiveFrame
	queuedBytes int
	unacked     int
	// output waits until the browser has been told the stream is open
	opening bool
	closed  bool
}

type interactiveLiveTask struct {
	ID                int    `db:"id"`
	OperationID       int    `db:"operation_id"`
	CallbackDisplayID int    `db:"callback_display_id"`
	Command           string `db:"command"`
}

// InteractiveLiveWebsocketTokenMiddleware moves the token from the websocket subprotocols into the Authorization
// header so the usual authentication applies
func InteractiveLiveWebsocketTokenMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		if c.Request.Header.Get("Authorization") == "" {
			for _, protocol := range websocket.Subprotocols(c.Request) {
				if strings.HasPrefix(protocol, interactiveLiveTokenProtocolPrefix) {
					c.Request.Header.Set("Authorization", "Bearer "+strings.TrimPrefix(protocol, interactiveLiveTokenProtocolPrefix))
				}
			}
		}
		c.Next()
	}
}

func InteractiveLiveWebsocket(c *gin.Context) {
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	ginOperatorOperation, ok := c.Get(authentication.ContextKeyOperatorOperationStruct)
	if !ok {
		c.JSON(http.StatusForbidden, gin.H{"error": "Failed to get current operation. Is it set?"})
		return
	}
	conn, err := interactiveLiveUpgrader.Upgrade(c.Writer, c.Request, nil)
	if err != nil {
		logging.LogError(err, "Failed to upgrade interactive live connection")
		return
	}
	connection := &interactiveLiveConnection{
		conn:        conn,
		claims:      claims,
		authContext: authentication.RabbitMQAuthContextFromGin(c),
		canWrite: interactiveLiveCanWrite(ginOperatorOperation.(*databaseStructs.Operatoroperation)) &&
			mythicjwt.AllowsScope(claims.Scopes, mythicjwt.SCOPE_TASK_WRITE),
		streams: make(map[uint32]*interactiveLiveStream),
		wake:    make(chan struct{}, 1),
		done:    make(chan struct{}),
	}
	go connection.write()
	connection.read()
}

func interactiveLiveCanWrite(operatorOperation *databaseStructs.Operatoroperation) bool {
	return operatorOperation.CurrentOperator.Admin || operatorOperation.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR
}

func (connection *interactiveLiveConnection) read() {
	defer func() {
		close(connection.done)
		connection.Lock()
		streams := connection.streams
		connection.streams = map[uint32]*interactiveLiveStream{}
		connection.Unlock()
		for _, stream := range streams {
			stream.leave()
		}
		connection.conn.Close()
	}()
	connection.conn.SetReadLimit(1024 * 1024)
	_ = connection.conn.SetReadDeadline(time.Now().Add(interactiveLiveReadTimeout))
	connection.conn.SetPongHandler(func(string) error {
		return connection.conn.SetReadDeadline(time.Now().Add(interactiveLiveReadTimeout))
	})
	for {
		messageType, data, err := connection.conn.ReadMessage()
		if err != nil {
			return
		}
		_ = connection.conn.SetReadDeadline(time.Now().Add(interactiveLiveReadTimeout))
		message := interactiveLiveClientMessage{}
		if messageType != websocket.TextMessage || json.Unmarshal(data, &message) != nil {
			continue
		}
		switch message.Type {
		case "open":
			connection.open(message)
		case "close":
			connection.closeStream(message.Channel)
		case "credit":
			connection.credit(message.Channel, message.Bytes)
		case "input":
			connection.input(message)
		}
	}
}

func (connection *interactiveLiveConnection) open(message interactiveLiveClientMessage) {
	if message.Kind != "pty" {
		connection.send(message.Channel, interactiveLiveServerMessage{Type: "closed", Reason: "unsupported kind"})
		return
	}
	stream := &interactiveLiveStream{connection: connection, channel: message.Channel, opening: true}
	connection.Lock()
	_, exists := connection.streams[message.Channel]
	tooMany := len(connection.streams) >= interactiveLiveMaxStreams
	if !exists && !tooMany {
		connection.streams[message.Channel] = stream
	}
	connection.Unlock()
	if exists || tooMany {
		connection.send(message.Channel, interactiveLiveServerMessage{Type: "closed", Reason: "stream unavailable"})
		return
	}
	responseID, size, err := stream.watch(message.TaskID)
	if err != nil {
		connection.Lock()
		delete(connection.streams, message.Channel)
		connection.Unlock()
		connection.send(message.Channel, interactiveLiveServerMessage{Type: "closed", Reason: err.Error()})
		return
	}
	// output may already be queued behind it, so this goes first
	opened, _ := json.Marshal(interactiveLiveServerMessage{Type: "opened", Channel: message.Channel,
		ResponseID: responseID, CanWrite: connection.canWrite, Cols: size.Cols, Rows: size.Rows})
	connection.Lock()
	stream.queue = append([]interactiveLiveFrame{{messageType: websocket.TextMessage, data: opened}}, stream.queue...)
	stream.opening = false
	connection.Unlock()
	connection.signal()
}

func (stream *interactiveLiveStream) watch(taskID int) (int, rabbitmq.InteractiveLiveSize, error) {
	operatorOperation, err := database.GetUserCurrentOperation(stream.connection.claims.UserID)
	if err != nil {
		return 0, rabbitmq.InteractiveLiveSize{}, errors.New("failed to get current operation")
	}
	if err = database.DB.Get(&stream.task, `SELECT
		task.id, task.operation_id, callback.display_id "callback_display_id",
		COALESCE(command.cmd, task.command_name) "command"
		FROM task
		JOIN callback ON task.callback_id = callback.id
		LEFT JOIN command ON task.command_id = command.id
		WHERE task.id=$1 AND task.operation_id=$2`, taskID, operatorOperation.CurrentOperation.ID); err != nil {
		return 0, rabbitmq.InteractiveLiveSize{}, errors.New("task not found in current operation")
	}
	return rabbitmq.WatchInteractiveTask(stream.task.ID, stream.task.OperationID, stream)
}

func (connection *interactiveLiveConnection) closeStream(channel uint32) {
	connection.Lock()
	stream, ok := connection.streams[channel]
	if ok {
		stream.closed = true
	}
	delete(connection.streams, channel)
	connection.Unlock()
	if ok {
		stream.leave()
	}
}

func (connection *interactiveLiveConnection) credit(channel uint32, size int) {
	connection.Lock()
	if stream, ok := connection.streams[channel]; ok && size > 0 {
		stream.unacked = max(stream.unacked-size, 0)
	}
	connection.Unlock()
	connection.signal()
}

func (connection *interactiveLiveConnection) input(message interactiveLiveClientMessage) {
	connection.Lock()
	stream, ok := connection.streams[message.Channel]
	connection.Unlock()
	if !ok {
		return
	}
	if InteractiveTask.MessageType(message.InteractiveTaskType) == InteractiveTask.WindowChange {
		stream.resize(message.Params)
		return
	}
	if err := stream.task.createInput(stream, message.InteractiveTaskType, message.Params, message.OriginalParams); err != nil {
		connection.send(message.Channel, interactiveLiveServerMessage{Type: "input_error", Error: err.Error()})
	}
}

// resize records how much of the terminal this viewer can show. Only viewers that can send input size it; the
// rest show it at whatever size it is.
func (stream *interactiveLiveStream) resize(params string) {
	if !stream.connection.canWrite {
		return
	}
	size := rabbitmq.InteractiveLiveSize{}
	if _, err := fmt.Sscanf(params, "%d,%d", &size.Cols, &size.Rows); err != nil || size.Cols <= 0 || size.Rows <= 0 {
		return
	}
	rabbitmq.ResizeInteractiveTask(stream.task.ID, stream, &size, applyInteractiveLiveResize)
}

// applyInteractiveLiveResize resizes the agent's terminal as the viewer whose size it's now using
func applyInteractiveLiveResize(owner rabbitmq.InteractiveLiveViewer, size rabbitmq.InteractiveLiveSize) {
	ownerStream, ok := owner.(*interactiveLiveStream)
	if !ok {
		return
	}
	params := fmt.Sprintf("%d,%d,0,0", size.Cols, size.Rows)
	if err := ownerStream.task.createInput(ownerStream, int(InteractiveTask.WindowChange), params,
		fmt.Sprintf("resize %dx%d", size.Cols, size.Rows)); err != nil {
		logging.LogError(err, "Failed to resize interactive task", "task_id", ownerStream.task.ID)
	}
}

// createInput sends input straight to the agent when it can, and otherwise tasks it the same way as the createTask
// mutation, just without the trip through GraphQL
func (task interactiveLiveTask) createInput(stream *interactiveLiveStream, interactiveTaskType int, params string, originalParams string) error {
	connection := stream.connection
	if !connection.canWrite {
		return errors.New("Not allowed to send input")
	}
	if !InteractiveTask.IsValid(interactiveTaskType) {
		return errors.New("Unknown interactive task type")
	}
	// the user may have changed operation or been removed from it since connecting
	operatorOperation, err := database.GetUserCurrentOperation(connection.claims.UserID)
	if err != nil || !operatorOperation.CurrentOperator.Active || operatorOperation.CurrentOperator.Deleted ||
		!interactiveLiveCanWrite(operatorOperation) || operatorOperation.CurrentOperation.ID != task.OperationID {
		return errors.New("Not allowed to send input to this task")
	}
	var disabledCommandID *int
	if operatorOperation.BaseDisabledCommandsID.Valid {
		baseDisabledCommandsID := int(operatorOperation.BaseDisabledCommandsID.Int64)
		disabledCommandID = &baseDisabledCommandsID
	}
	if connection.claims.EventStepInstanceID == 0 {
		err = rabbitmq.SendInteractiveInput(task.ID, stream, rabbitmq.InteractiveLiveInput{
			OperatorID:        operatorOperation.CurrentOperator.ID,
			IsOperatorAdmin:   operatorOperation.CurrentOperator.Admin,
			DisabledCommandID: disabledCommandID,
			MessageType:       InteractiveTask.MessageType(interactiveTaskType),
			Params:            params,
			OriginalParams:    originalParams,
			APITokensID:       connection.claims.APITokensID,
		})
		if !errors.Is(err, rabbitmq.ErrInteractiveInputNeedsTasking) {
			return err
		}
	}
	taskingLocation := "command_line"
	parameterGroupName := "default"
	resolveTaskReferences := false
	authContext := connection.authContext
	authContext.ContextID = uuid.NewString()
	createTaskInput := rabbitmq.CreateTaskInput{
		CallbackDisplayID:     task.CallbackDisplayID,
		CurrentOperationID:    operatorOperation.CurrentOperation.ID,
		OperatorID:            operatorOperation.CurrentOperator.ID,
		IsOperatorAdmin:       operatorOperation.CurrentOperator.Admin,
		CommandName:           task.Command,
		Params:                params,
		TaskingLocation:       &taskingLocation,
		OriginalParams:        &originalParams,
		ParameterGroupName:    &parameterGroupName,
		ParentTaskID:          &task.ID,
		IsInteractiveTask:     true,
		InteractiveTaskType:   &interactiveTaskType,
		EventStepInstanceID:   connection.claims.EventStepInstanceID,
		APITokensID:           connection.claims.APITokensID,
		ResolveTaskReferences: &resolveTaskReferences,
		AuthContext:           authContext,
	}
	createTaskInput.DisabledCommandID = disabledCommandID
	if response := rabbitmq.CreateTask(createTaskInput); response.Status == "error" {
		return errors.New(response.Error)
	}
	return nil
}

// send queues a control message on a stream, or straight to the browser if the stream doesn't exist
func (connection *interactiveLiveConnection) send(channel uint32, message interactiveLiveServerMessage) {
	message.Channel = channel
	data, _ := json.Marshal(message)
	frame := interactiveLiveFrame{messageType: websocket.TextMessage, data: data}
	connection.Lock()
	if stream, ok := connection.streams[channel]; ok && !stream.closed {
		stream.queue = append(stream.queue, frame)
	} else {
		connection.control = append(connection.control, frame)
	}
	connection.Unlock()
	connection.signal()
}

func (connection *interactiveLiveConnection) signal() {
	select {
	case connection.wake <- struct{}{}:
	default:
	}
}

func (stream *interactiveLiveStream) InteractiveOutput(messageType InteractiveTask.MessageType, data []byte) bool {
	frame := make([]byte, 5+len(data))
	binary.BigEndian.PutUint32(frame, stream.channel)
	frame[4] = byte(messageType)
	copy(frame[5:], data)
	return stream.enqueue(interactiveLiveFrame{messageType: websocket.BinaryMessage, data: frame, size: len(data)})
}

func (stream *interactiveLiveStream) InteractiveSize(size rabbitmq.InteractiveLiveSize) bool {
	data, _ := json.Marshal(interactiveLiveServerMessage{Type: "size", Channel: stream.channel, Cols: size.Cols, Rows: size.Rows})
	return stream.enqueue(interactiveLiveFrame{messageType: websocket.TextMessage, data: data})
}

// leave stops watching the task, and stops this viewer's size counting towards it
func (stream *interactiveLiveStream) leave() {
	rabbitmq.UnwatchInteractiveTask(stream.task.ID, stream)
	rabbitmq.ResizeInteractiveTask(stream.task.ID, stream, nil, applyInteractiveLiveResize)
}

func (stream *interactiveLiveStream) InteractiveSaved(responseID int) bool {
	data, _ := json.Marshal(interactiveLiveServerMessage{Type: "saved", Channel: stream.channel, ResponseID: responseID})
	return stream.enqueue(interactiveLiveFrame{messageType: websocket.TextMessage, data: data})
}

// enqueue never blocks the agent's output. A browser too far behind loses the stream and reloads it instead.
func (stream *interactiveLiveStream) enqueue(frame interactiveLiveFrame) bool {
	connection := stream.connection
	connection.Lock()
	defer connection.signal()
	defer connection.Unlock()
	if stream.closed {
		return false
	}
	if stream.queuedBytes+frame.size > interactiveLiveMaxQueued {
		stream.closed = true
		closed, _ := json.Marshal(interactiveLiveServerMessage{Type: "closed", Channel: stream.channel, Reason: "overflow"})
		stream.queue = []interactiveLiveFrame{{messageType: websocket.TextMessage, data: closed}}
		stream.queuedBytes = 0
		return false
	}
	stream.queue = append(stream.queue, frame)
	stream.queuedBytes += frame.size
	return true
}

func (connection *interactiveLiveConnection) write() {
	ping := time.NewTicker(interactiveLivePingPeriod)
	defer ping.Stop()
	// the browser reconnects with a fresh token
	var expired <-chan time.Time
	if connection.claims.ExpiresAt > 0 {
		expiry := time.NewTimer(time.Until(time.Unix(connection.claims.ExpiresAt, 0)))
		defer expiry.Stop()
		expired = expiry.C
	}
	for {
		select {
		case <-connection.done:
			return
		case <-expired:
			_ = connection.conn.WriteControl(websocket.CloseMessage,
				websocket.FormatCloseMessage(interactiveLiveCloseExpired, "token expired"),
				time.Now().Add(interactiveLiveWriteTimeout))
			connection.conn.Close()
			return
		case <-ping.C:
			if err := connection.conn.WriteControl(websocket.PingMessage, nil, time.Now().Add(interactiveLiveWriteTimeout)); err != nil {
				connection.conn.Close()
				return
			}
		case <-connection.wake:
			if !connection.writeFrames(connection.takeFrames()) {
				connection.conn.Close()
				return
			}
		}
	}
}

// takeFrames removes the frames that can be sent now: control messages, and output while the stream has window left
func (connection *interactiveLiveConnection) takeFrames() []interactiveLiveFrame {
	connection.Lock()
	defer connection.Unlock()
	frames := connection.control
	connection.control = nil
	for channel, stream := range connection.streams {
		if stream.opening {
			continue
		}
		sent := 0
		for _, frame := range stream.queue {
			if frame.size > 0 && stream.unacked >= interactiveLiveWindow {
				break
			}
			frames = append(frames, frame)
			stream.unacked += frame.size
			stream.queuedBytes -= frame.size
			sent++
		}
		stream.queue = stream.queue[sent:]
		if stream.closed && len(stream.queue) == 0 {
			delete(connection.streams, channel)
			// a stream closed for falling behind is replaced by a new one, so its size no longer counts
			go stream.leave()
		}
	}
	return frames
}

func (connection *interactiveLiveConnection) writeFrames(frames []interactiveLiveFrame) bool {
	for _, frame := range frames {
		_ = connection.conn.SetWriteDeadline(time.Now().Add(interactiveLiveWriteTimeout))
		if err := connection.conn.WriteMessage(frame.messageType, frame.data); err != nil {
			return false
		}
	}
	return true
}
