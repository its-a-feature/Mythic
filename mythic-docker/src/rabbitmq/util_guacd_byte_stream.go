package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net"
	"strconv"
	"sync"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

const (
	guacdRelayBufferSize                 = 64 * 1024
	guacdRDPServerResponseTimeoutSeconds = 30
)

var guacdByteStreamBootstrapMu sync.Mutex

type guacdByteStreamTask struct {
	CallbackID          int                             `db:"callback_id"`
	OperationID         int                             `db:"operation_id"`
	AgentTaskID         string                          `db:"agent_task_id"`
	MythicParsedParams  string                          `db:"mythic_parsed_params"`
	Completed           bool                            `db:"completed"`
	SupportedUIFeatures databaseStructs.MythicJSONArray `db:"supported_ui_features"`
}

type guacdByteStreamParameters struct {
	Username string `json:"Username"`
	Password string `json:"Password"`
	Domain   string `json:"Domain"`
}

// guacdTCPRelay is a private, one-connection TCP endpoint. guacd connects to
// this endpoint as though it were the RDP/VNC server. Bytes are then bridged
// verbatim to the agent-owned InteractiveByteStream.
type guacdTCPRelay struct {
	listener net.Listener
	stream   *InteractiveByteStream

	mu         sync.RWMutex
	writeMu    sync.Mutex
	connection net.Conn
	ready      chan struct{}
	done       chan struct{}
	closeOnce  sync.Once
}

func bootstrapGuacdByteStream(manager *interactiveByteStreamManager, callbackID int, operationID int,
	message agentMessagePostResponseInteractive) (*InteractiveByteStream, error) {
	if message.MessageType != InteractiveTask.StreamWindow {
		return nil, errInteractiveByteStreamNotFound
	}
	guacdByteStreamBootstrapMu.Lock()
	defer guacdByteStreamBootstrapMu.Unlock()

	manager.mu.RLock()
	existing := manager.streams[message.TaskUUID]
	manager.mu.RUnlock()
	if existing != nil {
		return existing, nil
	}
	logging.LogInfo("Bootstrapping task-owned guacd byte stream", "task_id", message.TaskUUID)

	task := guacdByteStreamTask{}
	if err := database.DB.Get(&task, `SELECT task.callback_id, task.operation_id, task.agent_task_id,
		task.mythic_parsed_params, task.completed,
		COALESCE(command.supported_ui_features, '[]'::jsonb) AS supported_ui_features
		FROM task
		LEFT JOIN command ON task.command_id=command.id
		WHERE task.agent_task_id=$1`, message.TaskUUID); err != nil {
		return nil, errors.New("interactive task was not found")
	}
	if task.CallbackID != callbackID || task.OperationID != operationID {
		return nil, errors.New("interactive task ownership mismatch")
	}
	if task.Completed {
		return nil, errors.New("interactive task is already complete")
	}
	features := []string{}
	if err := task.SupportedUIFeatures.Unmarshal(&features); err != nil {
		return nil, errors.New("interactive task has invalid protocol metadata")
	}
	protocol, err := InteractiveTaskProtocolFromFeatures(features)
	if err != nil {
		return nil, err
	}
	if !validInteractiveByteStreamProtocol(protocol) {
		return nil, fmt.Errorf("unsupported interactive desktop protocol %q", protocol)
	}
	parameters := guacdByteStreamParameters{}
	if task.MythicParsedParams != "" {
		if err = json.Unmarshal([]byte(task.MythicParsedParams), &parameters); err != nil {
			return nil, errors.New("interactive task has invalid connection parameters")
		}
	}

	relay, relayHost, relayPort, err := newGuacdTCPRelay()
	if err != nil {
		return nil, err
	}
	stream, err := manager.open(InteractiveByteStreamOptions{
		CallbackID: callbackID, OperationID: operationID, TaskUUID: task.AgentTaskID,
		Protocol: protocol, Sink: relay,
	})
	if err != nil {
		_ = relay.Close()
		return nil, err
	}
	relay.attach(stream)
	args := guacdByteStreamArgs(protocol, relayHost, relayPort, parameters)
	logging.LogInfo("Opened private task-owned guacd relay", "task_id", task.AgentTaskID,
		"protocol", protocol, "relay_host", relayHost, "relay_port", relayPort,
		"username_supplied", parameters.Username != "",
		"password_supplied", parameters.Password != "",
		"domain_supplied", parameters.Domain != "")
	go startGuacdByteStreamSession(stream, relay, protocol, args)
	return stream, nil
}

func newGuacdTCPRelay() (*guacdTCPRelay, string, int, error) {
	guacdAddress := net.JoinHostPort(utils.MythicConfig.GuacdHost,
		strconv.Itoa(int(utils.MythicConfig.GuacdPort)))
	route, err := net.Dial("udp4", guacdAddress)
	if err != nil {
		return nil, "", 0, fmt.Errorf("failed to determine guacd relay route: %w", err)
	}
	localAddress, ok := route.LocalAddr().(*net.UDPAddr)
	_ = route.Close()
	if !ok || localAddress.IP == nil {
		return nil, "", 0, errors.New("failed to determine guacd relay address")
	}
	relayHost := localAddress.IP.String()
	listener, err := net.Listen("tcp4", net.JoinHostPort(relayHost, "0"))
	if err != nil {
		return nil, "", 0, fmt.Errorf("failed to open guacd relay: %w", err)
	}
	tcpAddress, ok := listener.Addr().(*net.TCPAddr)
	if !ok || tcpAddress.Port <= 0 {
		_ = listener.Close()
		return nil, "", 0, errors.New("failed to determine guacd relay port")
	}
	return &guacdTCPRelay{
		listener: listener, ready: make(chan struct{}), done: make(chan struct{}),
	}, relayHost, tcpAddress.Port, nil
}

func guacdByteStreamArgs(protocol InteractiveTaskProtocol, relayHost string, relayPort int,
	parameters guacdByteStreamParameters) map[string]string {
	args := map[string]string{
		"hostname": relayHost,
		"port":     strconv.Itoa(relayPort),
		"username": parameters.Username,
		"password": parameters.Password,
	}
	if protocol == InteractiveTaskProtocolRDP {
		args["domain"] = parameters.Domain
		args["security"] = "any"
		args["ignore-cert"] = "true"
		// Prefer legible desktop text over Guacamole's bandwidth-saving RDP
		// defaults. Lossless updates also avoid compression artefacts around
		// small glyphs and other high-contrast UI details.
		args["enable-font-smoothing"] = "true"
		args["force-lossless"] = "true"
		// Resize the existing RDP connection through the Display Update channel.
		// Reconnect-based resizing cannot be used because this relay intentionally
		// accepts exactly one target connection for the lifetime of the task.
		args["resize-method"] = "display-update"
		// Guacamole defaults this to 10 seconds. A cold RDP/NLA session can
		// legitimately take longer to reach activation even though the relay is
		// moving negotiation bytes immediately.
		args["timeout"] = strconv.Itoa(guacdRDPServerResponseTimeoutSeconds)
	}
	return args
}

func startGuacdByteStreamSession(stream *InteractiveByteStream, relay *guacdTCPRelay,
	protocol InteractiveTaskProtocol, args map[string]string) {
	// The first agent StreamWindow is handled immediately after bootstrap
	// returns. Waiting for that credit prevents guacd's first protocol packet
	// from blocking the message router which must apply the window.
	stream.mu.Lock()
	for stream.peerWindow == 0 && !stream.closed.Load() {
		stream.cond.Wait()
	}
	closed := stream.closed.Load()
	stream.mu.Unlock()
	if closed {
		return
	}

	logging.LogInfo("Opening task-owned guacd session", "task_id", stream.taskUUID, "protocol", protocol)
	session, err := OpenRecordedGuacdSession(stream.taskUUID, string(protocol), args)
	if err != nil {
		logging.LogError(err, "Failed to open task-owned guacd session", "task_id", stream.taskUUID,
			"protocol", protocol)
		stream.reset("failed to open task-owned guacd session: " + err.Error())
		return
	}
	select {
	case <-session.Done():
		reason := session.EndReason()
		logging.LogInfo("Task-owned guacd session ended", "task_id", stream.taskUUID,
			"protocol", protocol, "reason", reason)
		_ = stream.closeWithReason(reason)
	case <-stream.Done():
	}
	_ = relay.Close()
}

func (relay *guacdTCPRelay) attach(stream *InteractiveByteStream) {
	relay.mu.Lock()
	relay.stream = stream
	relay.mu.Unlock()
	go relay.accept()
}

func (relay *guacdTCPRelay) accept() {
	connection, err := relay.listener.Accept()
	_ = relay.listener.Close()
	if err != nil {
		select {
		case <-relay.done:
			return
		default:
		}
		relay.fail("guacd relay failed to accept its connection", err)
		return
	}
	relay.mu.Lock()
	select {
	case <-relay.done:
		relay.mu.Unlock()
		_ = connection.Close()
		return
	default:
	}
	relay.connection = connection
	close(relay.ready)
	stream := relay.stream
	relay.mu.Unlock()
	if stream == nil {
		_ = relay.Close()
		return
	}

	buffer := make([]byte, guacdRelayBufferSize)
	for {
		length, readErr := connection.Read(buffer)
		if length > 0 {
			if _, writeErr := stream.Write(buffer[:length]); writeErr != nil {
				return
			}
		}
		if readErr != nil {
			if errors.Is(readErr, io.EOF) {
				// The guacd plugin closes this private upstream socket before
				// reporting its terminal error over the Guacamole control
				// connection. Let the owning GuacdSession close the stream so
				// that exact reason reaches the agent instead of racing it with
				// a generic local close.
				return
			} else {
				relay.fail("guacd relay connection failed", readErr)
			}
			return
		}
	}
}

func (relay *guacdTCPRelay) Write(data []byte) (int, error) {
	select {
	case <-relay.ready:
	case <-relay.done:
		return 0, net.ErrClosed
	}
	relay.mu.RLock()
	connection := relay.connection
	relay.mu.RUnlock()
	if connection == nil {
		return 0, net.ErrClosed
	}
	relay.writeMu.Lock()
	defer relay.writeMu.Unlock()
	return connection.Write(data)
}

func (relay *guacdTCPRelay) Close() error {
	var closeErr error
	relay.closeOnce.Do(func() {
		close(relay.done)
		if relay.listener != nil {
			if err := relay.listener.Close(); err != nil && !errors.Is(err, net.ErrClosed) {
				closeErr = err
			}
		}
		relay.mu.RLock()
		connection := relay.connection
		relay.mu.RUnlock()
		if connection != nil {
			if err := connection.Close(); err != nil && !errors.Is(err, net.ErrClosed) && closeErr == nil {
				closeErr = err
			}
		}
	})
	return closeErr
}

func (relay *guacdTCPRelay) fail(reason string, err error) {
	relay.mu.RLock()
	stream := relay.stream
	relay.mu.RUnlock()
	if stream == nil || stream.closed.Load() {
		return
	}
	logging.LogError(err, reason, "task_id", stream.taskUUID)
	stream.reset(reason)
}
