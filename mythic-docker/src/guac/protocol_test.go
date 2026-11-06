package guac

import (
	"bufio"
	"context"
	"io"
	"net"
	"slices"
	"strings"
	"testing"
	"time"
)

func TestInstructionRoundTripUsesUnicodeLengths(t *testing.T) {
	want := []string{"name", "Mythic 🥑", "東京"}
	encoded := EncodeInstruction(want...)
	instruction, err := NewReader(strings.NewReader(string(encoded))).ReadInstruction()
	if err != nil {
		t.Fatal(err)
	}
	if !slices.Equal(instruction.Elements, want) {
		t.Fatalf("elements = %#v, want %#v", instruction.Elements, want)
	}
	if string(instruction.Raw) != string(encoded) {
		t.Fatalf("raw = %q, want %q", instruction.Raw, encoded)
	}
}

func TestReaderHandlesFragmentedInstructions(t *testing.T) {
	reader, writer := io.Pipe()
	done := make(chan Instruction, 1)
	go func() {
		instruction, _ := NewReader(reader).ReadInstruction()
		done <- instruction
	}()
	encoded := EncodeInstruction("sync", "12345")
	for _, value := range encoded {
		if _, err := writer.Write([]byte{value}); err != nil {
			t.Fatal(err)
		}
	}
	if instruction := <-done; !slices.Equal(instruction.Elements, []string{"sync", "12345"}) {
		t.Fatalf("instruction = %#v", instruction)
	}
}

func TestDialPerformsHandshakeInArgumentOrder(t *testing.T) {
	server, client := net.Pipe()
	dialed := make(chan net.Conn, 1)
	dialed <- client
	close(dialed)
	oldDial := dialForTest
	dialForTest = func(context.Context, string, string, time.Duration) (net.Conn, error) { return <-dialed, nil }
	t.Cleanup(func() { dialForTest = oldDial })

	serverError := make(chan error, 1)
	go func() {
		defer server.Close()
		reader := NewReader(server)
		selected, err := reader.ReadInstruction()
		if err != nil || !slices.Equal(selected.Elements, []string{"select", "vnc"}) {
			serverError <- err
			return
		}
		if _, err = server.Write(EncodeInstruction("args", "VERSION_1_5_0", "hostname", "port")); err != nil {
			serverError <- err
			return
		}
		for index := 0; index < 6; index++ {
			if _, err = reader.ReadInstruction(); err != nil {
				serverError <- err
				return
			}
		}
		connect, err := reader.ReadInstruction()
		if err != nil || !slices.Equal(connect.Elements,
			[]string{"connect", protocolVersion, "agent-stream", "5900"}) {
			serverError <- err
			return
		}
		_, err = server.Write(EncodeInstruction("ready", "$connection"))
		serverError <- err
	}()

	connection, err := Dial(context.Background(), DialOptions{
		Address: "unused:4822", Protocol: "vnc", Args: map[string]string{"hostname": "agent-stream", "port": "5900"},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer connection.Close()
	if connection.ConnectionID != "$connection" {
		t.Fatalf("connection ID = %q", connection.ConnectionID)
	}
	if err = <-serverError; err != nil {
		t.Fatal(err)
	}
}

func TestReaderRejectsMalformedInstruction(t *testing.T) {
	for _, encoded := range []string{".value;", "x.value;", "4.no;", "2.\xff;"} {
		_, err := NewReader(bufio.NewReader(strings.NewReader(encoded))).ReadInstruction()
		if err == nil {
			t.Fatalf("accepted malformed instruction %q", encoded)
		}
	}
}
