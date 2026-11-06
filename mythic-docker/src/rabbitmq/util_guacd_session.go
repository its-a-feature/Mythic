package rabbitmq

import (
	"context"
	"crypto/md5"
	"crypto/sha1"
	"errors"
	"fmt"
	"hash"
	"io"
	"net"
	"os"
	"slices"
	"strconv"
	"strings"
	"sync"
	"sync/atomic"
	"time"

	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/guac"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/lib/pq"
)

const guacdViewerInputLimit = 1024 * 1024
const guacdSessionCleanupInterval = 10 * time.Second
const guacdUserKeepaliveInterval = 5 * time.Second

var (
	errGuacdSessionNotFound = errors.New("guacd session not found")
	errGuacdSessionClosed   = errors.New("guacd session is closed")
)

// GuacdSessionOptions starts one task-owned guacd connection. Recorder receives
// the server-to-client Guacamole instruction stream from its beginning and is
// independent of browser viewers. TaskUUID is the Mythic stream identity.
type GuacdSessionOptions struct {
	TaskUUID string
	Protocol string
	Args     map[string]string
	Width    int
	Height   int
	DPI      int
	Timezone string
	Recorder io.WriteCloser
}

// GuacdViewer receives complete Guacamole instructions for one browser join.
// Returning false detaches only this viewer, never the task-owned session.
type GuacdViewer interface {
	GuacdOutput(instruction []byte) bool
}

type guacdViewerClosed interface {
	GuacdClosed(reason string)
}

type guacdSessionManager struct {
	mu                sync.RWMutex
	openMu            sync.Mutex
	sessions          map[string]*GuacdSession
	changed           chan struct{}
	dial              func(context.Context, guac.DialOptions) (*guac.Conn, error)
	address           func() string
	keepaliveInterval time.Duration
}

type GuacdSession struct {
	manager      *guacdSessionManager
	taskUUID     string
	protocol     string
	args         map[string]string
	width        int
	height       int
	dpi          int
	timezone     string
	connectionID string
	primary      *guac.Conn
	recorder     io.WriteCloser

	closed    atomic.Bool
	closeOnce sync.Once
	done      chan struct{}
	mu        sync.Mutex
	endReason string
	viewers   map[*GuacdViewerConnection]struct{}
}

// GuacdViewerConnection is a disposable joined guacd user. Closing it leaves
// the primary task session (and its recording) running.
type GuacdViewerConnection struct {
	session    *GuacdSession
	viewer     GuacdViewer
	connection *guac.Conn
	closed     atomic.Bool
	closeOnce  sync.Once
	done       chan struct{}
}

type guacdTaskRecording struct {
	sync.Mutex
	file       *os.File
	filemetaID int
	md5        hash.Hash
	sha1       hash.Hash
	size       int64
	closeOnce  sync.Once
}

func newGuacdSessionManager() *guacdSessionManager {
	return &guacdSessionManager{
		sessions:          make(map[string]*GuacdSession),
		changed:           make(chan struct{}),
		dial:              guac.Dial,
		keepaliveInterval: guacdUserKeepaliveInterval,
		address: func() string {
			return net.JoinHostPort(utils.MythicConfig.GuacdHost, strconv.Itoa(int(utils.MythicConfig.GuacdPort)))
		},
	}
}

var guacdSessions = newGuacdSessionManager()

// OpenGuacdSession starts, or returns, the durable guacd session for a task.
func OpenGuacdSession(options GuacdSessionOptions) (*GuacdSession, error) {
	return guacdSessions.open(options)
}

// OpenRecordedGuacdSession is the normal task integration entry point. It
// begins recording before guacd emits the first display instruction, so the
// recording continues even when no browser is attached.
func OpenRecordedGuacdSession(taskUUID string, protocol string, args map[string]string) (*GuacdSession, error) {
	guacdSessions.openMu.Lock()
	defer guacdSessions.openMu.Unlock()
	if existing, err := GetGuacdSession(taskUUID); err == nil {
		if existing.protocol != protocol {
			return nil, fmt.Errorf("task already has a %s guacd session", existing.protocol)
		}
		return existing, nil
	}
	recorder, err := newGuacdTaskRecording(taskUUID, protocol)
	if err != nil {
		return nil, err
	}
	return guacdSessions.openLocked(GuacdSessionOptions{
		TaskUUID: taskUUID, Protocol: protocol, Args: args, Recorder: recorder,
	})
}

func GetGuacdSession(taskUUID string) (*GuacdSession, error) {
	guacdSessions.mu.RLock()
	session := guacdSessions.sessions[taskUUID]
	guacdSessions.mu.RUnlock()
	if session == nil || session.closed.Load() {
		return nil, errGuacdSessionNotFound
	}
	return session, nil
}

// WaitForGuacdSession waits until the task's primary guacd connection is
// ready. A browser may subscribe before a sleeping/pull agent emits the first
// StreamWindow; cancelling ends only this wait and never the task session.
func WaitForGuacdSession(taskUUID string, cancelled <-chan struct{}) (*GuacdSession, error) {
	if taskUUID == "" {
		return nil, errors.New("guacd task UUID is required")
	}
	for {
		guacdSessions.mu.RLock()
		session := guacdSessions.sessions[taskUUID]
		changed := guacdSessions.changed
		guacdSessions.mu.RUnlock()
		if session != nil && !session.closed.Load() {
			return session, nil
		}
		select {
		case <-cancelled:
			return nil, errGuacdSessionClosed
		case <-changed:
		}
	}
}

func CloseGuacdSession(taskUUID string) error {
	session, err := GetGuacdSession(taskUUID)
	if err != nil {
		return err
	}
	return session.Close()
}

func (manager *guacdSessionManager) open(options GuacdSessionOptions) (*GuacdSession, error) {
	manager.openMu.Lock()
	defer manager.openMu.Unlock()
	return manager.openLocked(options)
}

func (manager *guacdSessionManager) openLocked(options GuacdSessionOptions) (*GuacdSession, error) {
	if options.TaskUUID == "" || options.Protocol == "" {
		return nil, errors.New("guacd task UUID and protocol are required")
	}
	manager.mu.RLock()
	existing := manager.sessions[options.TaskUUID]
	manager.mu.RUnlock()
	if existing != nil && !existing.closed.Load() {
		if existing.protocol != options.Protocol {
			return nil, fmt.Errorf("task already has a %s guacd session", existing.protocol)
		}
		return existing, nil
	}

	connection, err := manager.dial(context.Background(), guac.DialOptions{
		Address: manager.address(), Protocol: options.Protocol, Width: options.Width, Height: options.Height,
		DPI: options.DPI, Timezone: options.Timezone, Name: "Mythic task " + options.TaskUUID, Args: options.Args,
	})
	if err != nil {
		if options.Recorder != nil {
			_ = options.Recorder.Close()
		}
		return nil, err
	}
	session := &GuacdSession{
		manager: manager, taskUUID: options.TaskUUID, protocol: options.Protocol, args: cloneStringMap(options.Args),
		width: options.Width, height: options.Height, dpi: options.DPI, timezone: options.Timezone,
		connectionID: connection.ConnectionID, primary: connection, recorder: options.Recorder,
		done: make(chan struct{}), viewers: make(map[*GuacdViewerConnection]struct{}),
	}

	manager.mu.Lock()
	if current := manager.sessions[options.TaskUUID]; current != nil && !current.closed.Load() {
		manager.mu.Unlock()
		_ = connection.Close()
		if options.Recorder != nil {
			_ = options.Recorder.Close()
		}
		if current.protocol != options.Protocol {
			return nil, fmt.Errorf("task already has a %s guacd session", current.protocol)
		}
		return current, nil
	}
	manager.sessions[options.TaskUUID] = session
	manager.notifyChangedLocked()
	manager.mu.Unlock()
	go session.runPrimary()
	return session, nil
}

func (manager *guacdSessionManager) notifyChangedLocked() {
	close(manager.changed)
	manager.changed = make(chan struct{})
}

func cloneStringMap(values map[string]string) map[string]string {
	if values == nil {
		return nil
	}
	cloned := make(map[string]string, len(values))
	for key, value := range values {
		cloned[key] = value
	}
	return cloned
}

func newGuacdTaskRecording(taskUUID string, protocol string) (*guacdTaskRecording, error) {
	task := struct {
		ID          int    `db:"id"`
		DisplayID   int    `db:"display_id"`
		OperationID int    `db:"operation_id"`
		OperatorID  int    `db:"operator_id"`
		Host        string `db:"host"`
	}{}
	if err := database.DB.Get(&task, `SELECT task.id, task.display_id, task.operation_id, task.operator_id,
		callback.host FROM task JOIN callback ON task.callback_id=callback.id WHERE task.agent_task_id=$1`, taskUUID); err != nil {
		return nil, err
	}
	agentFileID, path, err := GetSaveFilePath()
	if err != nil {
		return nil, err
	}
	file, err := os.OpenFile(path, os.O_WRONLY|os.O_TRUNC, 0600)
	if err != nil {
		_ = os.Remove(path)
		return nil, err
	}
	recording := &guacdTaskRecording{file: file, md5: md5.New(), sha1: sha1.New()}
	filename := []byte(fmt.Sprintf("task_%d_%s_%s.guac", task.DisplayID, protocol,
		time.Now().UTC().Format("20060102_150405")))
	if err = database.DB.Get(&recording.filemetaID, `INSERT INTO filemeta
		(agent_file_id, path, filename, total_chunks, chunks_received, delete_after_fetch, operation_id,
		operator_id, task_id, host, comment)
		VALUES ($1, $2, $3, 1, 1, false, $4, $5, $6, $7, $8) RETURNING id`,
		agentFileID, path, filename, task.OperationID, task.OperatorID, task.ID, task.Host,
		fmt.Sprintf("Guacamole %s recording from task %d", protocol, task.DisplayID)); err != nil {
		_ = file.Close()
		_ = os.Remove(path)
		return nil, err
	}
	return recording, nil
}

func (recording *guacdTaskRecording) Write(data []byte) (int, error) {
	recording.Lock()
	defer recording.Unlock()
	written, err := recording.file.Write(data)
	if written > 0 {
		_, _ = recording.md5.Write(data[:written])
		_, _ = recording.sha1.Write(data[:written])
		recording.size += int64(written)
	}
	return written, err
}

func (recording *guacdTaskRecording) Close() error {
	var closeErr error
	recording.closeOnce.Do(func() {
		recording.Lock()
		closeErr = recording.file.Close()
		size := recording.size
		chunkSize := min(size, int64(POSTGRES_MAX_INT))
		md5Sum := fmt.Sprintf("%x", recording.md5.Sum(nil))
		sha1Sum := fmt.Sprintf("%x", recording.sha1.Sum(nil))
		recording.Unlock()
		if _, err := database.DB.Exec(`UPDATE filemeta SET complete=true, size=$1, chunk_size=$2, md5=$3, sha1=$4
			WHERE id=$5`, size, chunkSize, md5Sum, sha1Sum, recording.filemetaID); err != nil && closeErr == nil {
			closeErr = err
		}
	})
	return closeErr
}

func (session *GuacdSession) Done() <-chan struct{} {
	return session.done
}

func (session *GuacdSession) Protocol() string {
	return session.protocol
}

func (session *GuacdSession) EndReason() string {
	session.mu.Lock()
	defer session.mu.Unlock()
	if session.endReason == "" {
		return "guacd task session ended"
	}
	return session.endReason
}

func (session *GuacdSession) setEndReason(reason string) {
	if reason == "" {
		return
	}
	session.mu.Lock()
	if session.endReason == "" {
		session.endReason = reason
	}
	session.mu.Unlock()
}

func (session *GuacdSession) Join(viewer GuacdViewer) (*GuacdViewerConnection, error) {
	if viewer == nil {
		return nil, errors.New("guacd viewer is required")
	}
	if session.closed.Load() {
		return nil, errGuacdSessionClosed
	}
	connection, err := session.manager.dial(context.Background(), guac.DialOptions{
		Address: session.manager.address(), Protocol: session.connectionID, Width: session.width, Height: session.height,
		DPI: session.dpi, Timezone: session.timezone, Name: "Mythic viewer", Args: session.args,
	})
	if err != nil {
		return nil, err
	}
	joined := &GuacdViewerConnection{
		session: session, viewer: viewer, connection: connection, done: make(chan struct{}),
	}
	session.mu.Lock()
	if session.closed.Load() {
		session.mu.Unlock()
		_ = connection.Close()
		return nil, errGuacdSessionClosed
	}
	session.viewers[joined] = struct{}{}
	session.mu.Unlock()
	go keepGuacdUserAlive(joined.connection, joined.done, session.manager.keepaliveInterval)
	go joined.read()
	return joined, nil
}

func (viewer *GuacdViewerConnection) Send(data []byte) error {
	if viewer.closed.Load() {
		return errGuacdSessionClosed
	}
	if len(data) == 0 {
		return nil
	}
	if len(data) > guacdViewerInputLimit {
		return errors.New("guacd viewer input exceeds limit")
	}
	return viewer.connection.WriteRaw(data)
}

func (viewer *GuacdViewerConnection) read() {
	reason := "guacd viewer connection closed"
	defer func() {
		_ = viewer.Close()
		if viewer.session.closed.Load() {
			reason = "guacd task session ended"
		}
		if closed, ok := viewer.viewer.(guacdViewerClosed); ok {
			closed.GuacdClosed(reason)
		}
	}()
	for {
		instruction, err := viewer.connection.ReadInstruction()
		if err != nil {
			if !viewer.session.closed.Load() && !viewer.closed.Load() {
				reason = "guacd session connection lost"
			}
			return
		}
		if !viewer.viewer.GuacdOutput(slices.Clone(instruction.Raw)) {
			reason = "guacd viewer fell behind"
			return
		}
	}
}

func (viewer *GuacdViewerConnection) Close() error {
	viewer.closeOnce.Do(func() {
		viewer.closed.Store(true)
		close(viewer.done)
		_ = viewer.connection.Close()
		viewer.session.mu.Lock()
		delete(viewer.session.viewers, viewer)
		viewer.session.mu.Unlock()
	})
	return nil
}

func (session *GuacdSession) runPrimary() {
	reason := "guacd task session ended"
	defer func() {
		session.setEndReason(reason)
		session.finish()
	}()
	go keepGuacdUserAlive(session.primary, session.done, session.manager.keepaliveInterval)
	for {
		instruction, err := session.primary.ReadInstruction()
		if err != nil {
			reason = "guacd primary connection ended: " + err.Error()
			return
		}
		if session.recorder != nil {
			if _, err = session.recorder.Write(instruction.Raw); err != nil {
				reason = "guacd recording failed: " + err.Error()
				return
			}
		}
		switch instruction.Opcode() {
		case "sync":
			// Guacamole 1.6 appends the number of frames represented by this
			// sync instruction. Client acknowledgements still echo only the
			// timestamp, so accept both the legacy and extended forms.
			if len(instruction.Elements) >= 2 {
				if err = session.primary.WriteInstruction("sync", instruction.Elements[1]); err != nil {
					reason = "failed to acknowledge guacd sync: " + err.Error()
					return
				}
			}
		case "ping":
			if len(instruction.Elements) == 2 {
				if err = session.primary.WriteInstruction("pong", instruction.Elements[1]); err != nil {
					reason = "failed to acknowledge guacd ping: " + err.Error()
					return
				}
			}
		case "end":
			if len(instruction.Elements) == 2 {
				if err = session.primary.WriteInstruction("ack", instruction.Elements[1], "", "0"); err != nil {
					reason = "failed to acknowledge guacd stream end: " + err.Error()
					return
				}
			}
		case "disconnect":
			reason = "guacd disconnected the task session"
			return
		case "required":
			reason = "guacd requires connection parameters that Mythic did not supply"
			if len(instruction.Elements) > 1 {
				reason += ": " + strings.Join(instruction.Elements[1:], ", ")
			}
			return
		case "error":
			reason = "guacd reported an error"
			if len(instruction.Elements) >= 2 {
				reason += ": " + instruction.Elements[1]
			}
			if len(instruction.Elements) >= 3 {
				reason += " (status " + instruction.Elements[2] + ")"
			}
			return
		}
	}
}

// guacd disconnects a user which sends no Guacamole instructions for its
// client timeout. RDP negotiation can legitimately produce no display/sync
// instructions for that long, so every server-owned guacd connection sends
// the protocol's nop keepalive independently of display activity.
func keepGuacdUserAlive(connection *guac.Conn, done <-chan struct{}, interval time.Duration) {
	if interval <= 0 {
		return
	}
	ticker := time.NewTicker(interval)
	defer ticker.Stop()
	for {
		select {
		case <-done:
			return
		case <-ticker.C:
			if err := connection.WriteInstruction("nop"); err != nil {
				_ = connection.Close()
				return
			}
		}
	}
}

func (session *GuacdSession) Close() error {
	if !session.closed.Load() {
		session.setEndReason("guacd task session closed by Mythic")
		_ = session.primary.WriteInstruction("disconnect")
	}
	session.finish()
	return nil
}

func (session *GuacdSession) finish() {
	session.closeOnce.Do(func() {
		session.closed.Store(true)
		_ = session.primary.Close()
		session.mu.Lock()
		viewers := make([]*GuacdViewerConnection, 0, len(session.viewers))
		for viewer := range session.viewers {
			viewers = append(viewers, viewer)
		}
		session.mu.Unlock()
		for _, viewer := range viewers {
			_ = viewer.Close()
		}
		if session.recorder != nil {
			_ = session.recorder.Close()
		}
		session.manager.mu.Lock()
		if session.manager.sessions[session.taskUUID] == session {
			delete(session.manager.sessions, session.taskUUID)
			session.manager.notifyChangedLocked()
		}
		session.manager.mu.Unlock()
		close(session.done)
	})
}

// Task completion is persisted before top-level interactive bytes in the same
// callback message are routed. A short database sweep avoids racing those final
// bytes while still cleaning up sessions whose agent never sends a clean close
// envelope.
func startGuacdSessionCleanup() {
	ticker := time.NewTicker(guacdSessionCleanupInterval)
	defer ticker.Stop()
	for range ticker.C {
		guacdSessions.mu.RLock()
		taskUUIDs := make([]string, 0, len(guacdSessions.sessions))
		for taskUUID := range guacdSessions.sessions {
			taskUUIDs = append(taskUUIDs, taskUUID)
		}
		guacdSessions.mu.RUnlock()
		if len(taskUUIDs) == 0 {
			continue
		}
		completed := []string{}
		if err := database.DB.Select(&completed, `SELECT agent_task_id FROM task
			WHERE completed=true AND agent_task_id = ANY($1)`, pq.Array(taskUUIDs)); err != nil {
			continue
		}
		for _, taskUUID := range completed {
			_ = CloseGuacdSession(taskUUID)
		}
	}
}
