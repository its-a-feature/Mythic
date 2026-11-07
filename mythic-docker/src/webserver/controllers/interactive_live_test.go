package webcontroller

import (
	"bytes"
	"encoding/json"
	"testing"

	"github.com/its-a-feature/Mythic/database/enums/InteractiveTask"
	"github.com/its-a-feature/Mythic/rabbitmq"
)

func newTestInteractiveLiveStream() (*interactiveLiveConnection, *interactiveLiveStream) {
	connection := &interactiveLiveConnection{
		streams: map[uint32]*interactiveLiveStream{},
		wake:    make(chan struct{}, 1),
	}
	stream := &interactiveLiveStream{connection: connection, channel: 7}
	connection.streams[7] = stream
	return connection, stream
}

func TestInteractiveLiveOutputFrame(t *testing.T) {
	connection, stream := newTestInteractiveLiveStream()
	stream.InteractiveOutput(InteractiveTask.Error, []byte("hi"))
	frames := connection.takeFrames()
	if len(frames) != 1 || !bytes.Equal(frames[0].data, []byte{0, 0, 0, 7, byte(InteractiveTask.Error), 'h', 'i'}) {
		t.Fatalf("frames = %v", frames)
	}
}

func TestInteractiveLiveHoldsOutputUntilCredit(t *testing.T) {
	connection, stream := newTestInteractiveLiveStream()
	chunk := make([]byte, interactiveLiveWindow/2)
	for i := 0; i < 3; i++ {
		stream.InteractiveOutput(InteractiveTask.Output, chunk)
	}
	stream.InteractiveSaved(5)
	if frames := connection.takeFrames(); len(frames) != 2 {
		t.Fatalf("sent %d frames with a full window", len(frames))
	}
	if frames := connection.takeFrames(); len(frames) != 0 {
		t.Fatalf("sent %d frames without credit", len(frames))
	}
	// the save notice stays behind the output it covers
	connection.credit(7, len(chunk))
	frames := connection.takeFrames()
	if len(frames) != 2 || frames[0].size != len(chunk) || !bytes.Contains(frames[1].data, []byte(`"saved"`)) {
		t.Fatalf("frames after credit = %v", len(frames))
	}
}

func TestInteractiveLiveClosesStreamsThatFallTooFarBehind(t *testing.T) {
	connection, stream := newTestInteractiveLiveStream()
	stream.unacked = interactiveLiveWindow
	chunk := make([]byte, 1024*1024)
	for i := 0; i < interactiveLiveMaxQueued/len(chunk); i++ {
		if !stream.InteractiveOutput(InteractiveTask.Output, chunk) {
			t.Fatalf("closed after %d chunks", i)
		}
	}
	if stream.InteractiveOutput(InteractiveTask.Output, []byte("x")) {
		t.Fatal("still open past the queue limit")
	}
	frames := connection.takeFrames()
	message := interactiveLiveServerMessage{}
	if len(frames) != 1 || json.Unmarshal(frames[0].data, &message) != nil || message.Type != "closed" || message.Reason != "overflow" {
		t.Fatalf("frames = %v", frames)
	}
	if _, ok := connection.streams[7]; ok {
		t.Fatal("closed stream wasn't removed")
	}
}

func TestInteractiveLiveSizeMessage(t *testing.T) {
	connection, stream := newTestInteractiveLiveStream()
	stream.InteractiveSize(rabbitmq.InteractiveLiveSize{Cols: 80, Rows: 24})
	frames := connection.takeFrames()
	if len(frames) != 1 || string(frames[0].data) != `{"type":"size","channel":7,"cols":80,"rows":24}` {
		t.Fatalf("frames = %v", frames)
	}
}

func TestInteractiveLiveHoldsOutputWhileOpening(t *testing.T) {
	connection, stream := newTestInteractiveLiveStream()
	stream.opening = true
	stream.InteractiveOutput(InteractiveTask.Output, []byte("a"))
	if frames := connection.takeFrames(); len(frames) != 0 {
		t.Fatalf("sent %d frames before the stream opened", len(frames))
	}
}
