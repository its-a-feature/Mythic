package rabbitmq

import (
	"bytes"
	"context"
	"io"
	"net"
	"sync"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/guac"
)

type testGuacdViewer struct {
	output chan []byte
	closed chan string
}

func (viewer *testGuacdViewer) GuacdOutput(instruction []byte) bool {
	viewer.output <- instruction
	return true
}

func (viewer *testGuacdViewer) GuacdClosed(reason string) {
	if viewer.closed != nil {
		viewer.closed <- reason
	}
}

type testGuacdRecorder struct {
	sync.Mutex
	data   bytes.Buffer
	closed bool
}

func (recorder *testGuacdRecorder) Write(data []byte) (int, error) {
	recorder.Lock()
	defer recorder.Unlock()
	if recorder.closed {
		return 0, io.ErrClosedPipe
	}
	return recorder.data.Write(data)
}

func (recorder *testGuacdRecorder) Close() error {
	recorder.Lock()
	recorder.closed = true
	recorder.Unlock()
	return nil
}

func (recorder *testGuacdRecorder) bytes() []byte {
	recorder.Lock()
	defer recorder.Unlock()
	return bytes.Clone(recorder.data.Bytes())
}

type testGuacdServer struct {
	listener    net.Listener
	required    []string
	primarySync chan struct{}
	primaryNop  chan struct{}
	viewerNop   chan struct{}
	joins       chan struct{}
	done        chan struct{}
}

func newTestGuacdServer(t *testing.T, required ...string) *testGuacdServer {
	t.Helper()
	listener, err := net.Listen("tcp", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	server := &testGuacdServer{
		listener: listener, required: required,
		primarySync: make(chan struct{}, 1), primaryNop: make(chan struct{}, 1),
		viewerNop: make(chan struct{}, 1), joins: make(chan struct{}, 8), done: make(chan struct{}),
	}
	go server.accept()
	t.Cleanup(func() {
		_ = listener.Close()
		<-server.done
	})
	return server
}

func (server *testGuacdServer) accept() {
	defer close(server.done)
	for {
		connection, err := server.listener.Accept()
		if err != nil {
			return
		}
		go server.handle(connection)
	}
}

func (server *testGuacdServer) handle(connection net.Conn) {
	defer connection.Close()
	reader := guac.NewReader(connection)
	selected, err := reader.ReadInstruction()
	if err != nil || len(selected.Elements) != 2 {
		return
	}
	primary := selected.Elements[1] == "rdp"
	if !primary && selected.Elements[1] != "$task-session" {
		return
	}
	if _, err = connection.Write(guac.EncodeInstruction("args", "VERSION_1_5_0")); err != nil {
		return
	}
	for {
		instruction, readErr := reader.ReadInstruction()
		if readErr != nil {
			return
		}
		if instruction.Opcode() == "connect" {
			break
		}
	}
	if _, err = connection.Write(guac.EncodeInstruction("ready", "$task-session")); err != nil {
		return
	}
	if primary {
		if len(server.required) > 0 {
			elements := append([]string{"required"}, server.required...)
			_, _ = connection.Write(guac.EncodeInstruction(elements...))
			for {
				if _, readErr := reader.ReadInstruction(); readErr != nil {
					return
				}
			}
		}
		_, _ = connection.Write(guac.EncodeInstruction("size", "0", "1024", "768"))
		// Guacamole 1.6 adds the represented frame count to server-to-client
		// sync instructions. Mythic must still acknowledge the timestamp.
		_, _ = connection.Write(guac.EncodeInstruction("sync", "100", "1"))
		for {
			instruction, readErr := reader.ReadInstruction()
			if readErr != nil {
				return
			}
			if instruction.Opcode() == "sync" {
				select {
				case server.primarySync <- struct{}{}:
				default:
				}
			}
			if instruction.Opcode() == "nop" {
				select {
				case server.primaryNop <- struct{}{}:
				default:
				}
			}
			if instruction.Opcode() == "disconnect" {
				return
			}
		}
	}
	server.joins <- struct{}{}
	_, _ = connection.Write(guac.EncodeInstruction("size", "0", "1024", "768"))
	_, _ = connection.Write(guac.EncodeInstruction("sync", "101"))
	for {
		instruction, readErr := reader.ReadInstruction()
		if readErr != nil {
			return
		}
		if instruction.Opcode() == "nop" {
			select {
			case server.viewerNop <- struct{}{}:
			default:
			}
		}
	}
}

func TestGuacdSessionSurvivesViewerDetachAndCanBeRejoined(t *testing.T) {
	server := newTestGuacdServer(t)
	manager := newGuacdSessionManager()
	manager.keepaliveInterval = 10 * time.Millisecond
	manager.address = func() string { return server.listener.Addr().String() }
	manager.dial = guac.Dial
	recorder := &testGuacdRecorder{}
	session, err := manager.open(GuacdSessionOptions{TaskUUID: "task-one", Protocol: "rdp", Recorder: recorder})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = session.Close() })

	select {
	case <-server.primarySync:
	case <-time.After(time.Second):
		t.Fatal("primary Mythic guacd user did not acknowledge sync")
	}
	select {
	case <-server.primaryNop:
	case <-time.After(time.Second):
		t.Fatal("primary Mythic guacd user did not send nop keepalive")
	}
	firstViewer := &testGuacdViewer{output: make(chan []byte, 4)}
	firstJoin, err := session.Join(firstViewer)
	if err != nil {
		t.Fatal(err)
	}
	select {
	case output := <-firstViewer.output:
		instruction, readErr := guac.NewReader(bytes.NewReader(output)).ReadInstruction()
		if readErr != nil || instruction.Opcode() != "size" {
			t.Fatalf("first viewer output = %q, err = %v", output, readErr)
		}
	case <-time.After(time.Second):
		t.Fatal("first viewer did not receive current display state")
	}
	select {
	case <-server.viewerNop:
	case <-time.After(time.Second):
		t.Fatal("joined guacd viewer did not send nop keepalive")
	}
	_ = firstJoin.Close()
	select {
	case <-session.Done():
		t.Fatal("detaching the browser ended the task-owned guacd session")
	case <-time.After(20 * time.Millisecond):
	}

	secondViewer := &testGuacdViewer{output: make(chan []byte, 4), closed: make(chan string, 1)}
	secondJoin, err := session.Join(secondViewer)
	if err != nil {
		t.Fatal(err)
	}
	defer secondJoin.Close()
	select {
	case <-secondViewer.output:
	case <-time.After(time.Second):
		t.Fatal("rejoined viewer did not receive current display state")
	}
	if err = session.Close(); err != nil {
		t.Fatal(err)
	}
	select {
	case <-session.Done():
	case <-time.After(time.Second):
		t.Fatal("session did not end after explicit task close")
	}
	select {
	case reason := <-secondViewer.closed:
		if reason != "guacd task session ended" {
			t.Fatalf("viewer close reason = %q", reason)
		}
	case <-time.After(time.Second):
		t.Fatal("viewer was not told that the task session ended")
	}
	if !bytes.Contains(recorder.bytes(), guac.EncodeInstruction("size", "0", "1024", "768")) {
		t.Fatalf("recording did not contain the primary display stream: %q", recorder.bytes())
	}
}

func TestGuacdSessionOpenIsTaskScopedAndIdempotent(t *testing.T) {
	server := newTestGuacdServer(t)
	manager := newGuacdSessionManager()
	manager.address = func() string { return server.listener.Addr().String() }
	manager.dial = func(ctx context.Context, options guac.DialOptions) (*guac.Conn, error) {
		return guac.Dial(ctx, options)
	}
	session, err := manager.open(GuacdSessionOptions{TaskUUID: "task-one", Protocol: "rdp"})
	if err != nil {
		t.Fatal(err)
	}
	defer session.Close()
	again, err := manager.open(GuacdSessionOptions{TaskUUID: "task-one", Protocol: "rdp"})
	if err != nil || again != session {
		t.Fatalf("same task did not reuse session: session=%p again=%p err=%v", session, again, err)
	}
	if _, err = manager.open(GuacdSessionOptions{TaskUUID: "task-one", Protocol: "vnc"}); err == nil {
		t.Fatal("same task was allowed to acquire a second protocol session")
	}
}

func TestGuacdSessionReportsRequiredParametersInsteadOfStalling(t *testing.T) {
	server := newTestGuacdServer(t, "username", "password")
	manager := newGuacdSessionManager()
	manager.address = func() string { return server.listener.Addr().String() }
	manager.dial = guac.Dial

	session, err := manager.open(GuacdSessionOptions{TaskUUID: "missing-credentials", Protocol: "rdp"})
	if err != nil {
		t.Fatal(err)
	}
	select {
	case <-session.Done():
	case <-time.After(time.Second):
		t.Fatal("session stalled after guacd requested missing parameters")
	}
	if reason := session.EndReason(); reason !=
		"guacd requires connection parameters that Mythic did not supply: username, password" {
		t.Fatalf("unexpected end reason: %q", reason)
	}
}
