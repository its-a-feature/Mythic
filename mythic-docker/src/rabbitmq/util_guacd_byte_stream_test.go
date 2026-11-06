package rabbitmq

import (
	"encoding/base64"
	"io"
	"net"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
)

func TestGuacdByteStreamArgsCarryCredentialsOnlyToGuacd(t *testing.T) {
	parameters := guacdByteStreamParameters{Username: "alice", Password: "secret", Domain: "EXAMPLE"}
	rdp := guacdByteStreamArgs(InteractiveTaskProtocolRDP, "10.0.0.4", 41234, parameters)
	if rdp["hostname"] != "10.0.0.4" || rdp["port"] != "41234" {
		t.Fatalf("unexpected relay address: %#v", rdp)
	}
	if rdp["username"] != "alice" || rdp["password"] != "secret" {
		t.Fatalf("credentials missing from guacd arguments: %#v", rdp)
	}
	if rdp["domain"] != "EXAMPLE" {
		t.Fatalf("domain missing from guacd arguments: %#v", rdp)
	}
	if rdp["security"] != "any" || rdp["ignore-cert"] != "true" {
		t.Fatalf("RDP defaults missing from guacd arguments: %#v", rdp)
	}
	if rdp["enable-font-smoothing"] != "true" || rdp["force-lossless"] != "true" {
		t.Fatalf("RDP clarity options missing from guacd arguments: %#v", rdp)
	}
	if rdp["resize-method"] != "display-update" {
		t.Fatalf("RDP display-update resizing missing from guacd arguments: %#v", rdp)
	}
	if rdp["timeout"] != "30" {
		t.Fatalf("RDP server response timeout missing from guacd arguments: %#v", rdp)
	}

	vnc := guacdByteStreamArgs(InteractiveTaskProtocolVNC, "10.0.0.4", 41235, parameters)
	if _, ok := vnc["security"]; ok {
		t.Fatalf("RDP security option leaked into VNC arguments: %#v", vnc)
	}
	if _, ok := vnc["ignore-cert"]; ok {
		t.Fatalf("RDP certificate option leaked into VNC arguments: %#v", vnc)
	}
	if _, ok := vnc["domain"]; ok {
		t.Fatalf("RDP domain option leaked into VNC arguments: %#v", vnc)
	}
	if _, ok := vnc["timeout"]; ok {
		t.Fatalf("RDP server response timeout leaked into VNC arguments: %#v", vnc)
	}
	if _, ok := vnc["resize-method"]; ok {
		t.Fatalf("RDP resize method leaked into VNC arguments: %#v", vnc)
	}
	if _, ok := vnc["enable-font-smoothing"]; ok {
		t.Fatalf("RDP font smoothing option leaked into VNC arguments: %#v", vnc)
	}
	if _, ok := vnc["force-lossless"]; ok {
		t.Fatalf("RDP lossless option leaked into VNC arguments: %#v", vnc)
	}
}

func TestGuacdTCPRelayBridgesBothDirections(t *testing.T) {
	listener, err := net.Listen("tcp4", "127.0.0.1:0")
	if err != nil {
		t.Fatal(err)
	}
	relay := &guacdTCPRelay{
		listener: listener, ready: make(chan struct{}), done: make(chan struct{}),
	}
	manager := newTestInteractiveByteStreamManager()
	stream, err := manager.open(InteractiveByteStreamOptions{
		CallbackID: 10, OperationID: 20, TaskUUID: "relay-task",
		Protocol: InteractiveTaskProtocolRDP, Sink: relay,
	})
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { _ = stream.Close() })
	manager.takeOutbound(10) // discard Mythic's initial receive window
	relay.attach(stream)

	if err = manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "relay-task", MessageType: InteractiveTask.StreamWindow,
		Window: uint32(manager.bufferSize),
	}); err != nil {
		t.Fatal(err)
	}
	connection, err := net.Dial("tcp4", listener.Addr().String())
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()

	fromGuacd := []byte{0x03, 0x00, 0x00, 0x13}
	if _, err = connection.Write(fromGuacd); err != nil {
		t.Fatal(err)
	}
	deadline := time.Now().Add(time.Second)
	var outbound []agentMessagePostResponseInteractive
	for time.Now().Before(deadline) {
		outbound = append(outbound, manager.takeOutbound(10)...)
		for _, message := range outbound {
			if message.MessageType != InteractiveTask.StreamData {
				continue
			}
			data, decodeErr := base64.StdEncoding.DecodeString(message.Data)
			if decodeErr != nil {
				t.Fatal(decodeErr)
			}
			if string(data) != string(fromGuacd) {
				t.Fatalf("agent-bound relay bytes = %x, want %x", data, fromGuacd)
			}
			goto agentToGuacd
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("timed out waiting for agent-bound relay bytes")

agentToGuacd:
	fromAgent := []byte{0x16, 0x03, 0x01, 0x00, 0x2a}
	if err = manager.handleAgentMessage(10, 20, agentMessagePostResponseInteractive{
		TaskUUID: "relay-task", MessageType: InteractiveTask.StreamData,
		Offset: 0, Data: base64.StdEncoding.EncodeToString(fromAgent),
	}); err != nil {
		t.Fatal(err)
	}
	if err = connection.SetReadDeadline(time.Now().Add(time.Second)); err != nil {
		t.Fatal(err)
	}
	received := make([]byte, len(fromAgent))
	if _, err = io.ReadFull(connection, received); err != nil {
		t.Fatal(err)
	}
	if string(received) != string(fromAgent) {
		t.Fatalf("guacd-bound relay bytes = %x, want %x", received, fromAgent)
	}
	if err = connection.Close(); err != nil {
		t.Fatal(err)
	}
	time.Sleep(20 * time.Millisecond)
	if stream.closed.Load() {
		t.Fatal("guacd relay EOF closed the byte stream before the control session supplied its reason")
	}
}
