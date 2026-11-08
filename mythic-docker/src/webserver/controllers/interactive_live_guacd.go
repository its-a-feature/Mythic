package webcontroller

import (
	"bytes"
	"encoding/binary"
	"fmt"

	"github.com/gorilla/websocket"
	"github.com/its-a-feature/Mythic/guac"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

// watchGuacd joins the task-owned guacd session if it already exists. The
// byte-stream manager creates that session lazily, so a browser may begin
// waiting before the agent opens its stream.
func (stream *interactiveLiveStream) watchGuacd() error {
	stream.done = make(chan struct{})
	session, err := rabbitmq.GetGuacdSession(stream.task.AgentTaskID)
	if err != nil {
		go stream.waitForGuacd(stream.done)
		return nil
	}
	return stream.joinGuacd(session)
}

func (stream *interactiveLiveStream) waitForGuacd(done <-chan struct{}) {
	session, err := rabbitmq.WaitForGuacdSession(stream.task.AgentTaskID, done)
	if err != nil {
		return
	}
	if err = stream.joinGuacd(session); err != nil {
		stream.connection.send(stream.channel, interactiveLiveServerMessage{Type: "closed", Reason: err.Error()})
	}
}

func (stream *interactiveLiveStream) joinGuacd(session *rabbitmq.GuacdSession) error {
	if session.Protocol() != string(stream.protocol) {
		return fmt.Errorf("task protocol %q does not match guacd session protocol %q", stream.protocol, session.Protocol())
	}
	joined, err := session.Join(stream)
	if err != nil {
		return err
	}
	stream.connection.Lock()
	if stream.closed {
		stream.connection.Unlock()
		_ = joined.Close()
		return nil
	}
	stream.guacd = joined
	stream.connection.Unlock()
	return nil
}

func (connection *interactiveLiveConnection) guacdInput(data []byte) {
	if len(data) <= 4 {
		return
	}
	channel := binary.BigEndian.Uint32(data[:4])
	connection.Lock()
	stream, ok := connection.streams[channel]
	canWrite := connection.canWrite
	var guacd *rabbitmq.GuacdViewerConnection
	if ok {
		guacd = stream.guacd
	}
	connection.Unlock()
	payload := data[4:]
	if !ok || guacd == nil || (!canWrite && !guacdViewOnlyInputAllowed(payload)) {
		return
	}
	if err := guacd.Send(payload); err != nil {
		connection.send(channel, interactiveLiveServerMessage{Type: "input_error", Error: err.Error()})
	}
}

// A spectator must still acknowledge display frames and stream data to remain
// a healthy joined guacd user. Instructions which can affect the remote
// desktop or transfer data remain restricted to writable operators.
func guacdViewOnlyInputAllowed(data []byte) bool {
	instruction, err := guac.NewReader(bytes.NewReader(data)).ReadInstruction()
	if err != nil || len(instruction.Raw) != len(data) {
		return false
	}
	switch instruction.Opcode() {
	case "ack", "disconnect", "nop", "pong", "sync":
		return true
	default:
		return false
	}
}

func (stream *interactiveLiveStream) GuacdOutput(instruction []byte) bool {
	frame := make([]byte, 4+len(instruction))
	binary.BigEndian.PutUint32(frame, stream.channel)
	copy(frame[4:], instruction)
	return stream.enqueue(interactiveLiveFrame{messageType: websocket.BinaryMessage, data: frame, size: len(instruction)})
}

func (stream *interactiveLiveStream) GuacdClosed(reason string) {
	stream.connection.send(stream.channel, interactiveLiveServerMessage{Type: "closed", Reason: reason})
}

func (stream *interactiveLiveStream) leaveGuacd() bool {
	if stream.protocol != rabbitmq.InteractiveTaskProtocolRDP &&
		stream.protocol != rabbitmq.InteractiveTaskProtocolVNC {
		return false
	}
	if stream.done != nil {
		close(stream.done)
		stream.done = nil
	}
	stream.connection.Lock()
	guacd := stream.guacd
	stream.guacd = nil
	stream.connection.Unlock()
	if guacd != nil {
		_ = guacd.Close()
	}
	return true
}
