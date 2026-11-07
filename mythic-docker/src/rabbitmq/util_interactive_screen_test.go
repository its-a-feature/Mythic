package rabbitmq

import (
	"slices"
	"testing"
	"time"
)

func feedInteractiveScreenChunks(chunks ...string) []bool {
	parser := interactiveScreenParser{}
	changes := []bool{}
	for _, chunk := range chunks {
		for _, change := range parser.feed([]byte(chunk)) {
			changes = append(changes, change.Alternate)
		}
	}
	return changes
}

func TestInteractiveScreenParserDetectsSwitches(t *testing.T) {
	tests := []struct {
		name   string
		chunks []string
		want   []bool
	}{
		{name: "plain output", chunks: []string{"$ ls\r\nfile\r\n"}, want: []bool{}},
		{name: "1049 enter and exit", chunks: []string{"\x1b[?1049h\x1b[2Jtop", "\x1b[?1049l$ "}, want: []bool{true, false}},
		{name: "1047", chunks: []string{"\x1b[?1047h", "\x1b[?1047l"}, want: []bool{true, false}},
		{name: "47", chunks: []string{"\x1b[?47h", "\x1b[?47l"}, want: []bool{true, false}},
		{name: "combined params", chunks: []string{"\x1b[?1;1049h"}, want: []bool{true}},
		{name: "enter and exit in one chunk", chunks: []string{"\x1b[?1049hless\x1b[?1049l"}, want: []bool{true, false}},
		{name: "split across chunks", chunks: []string{"\x1b", "[?10", "49", "h"}, want: []bool{true}},
		{name: "repeated enter", chunks: []string{"\x1b[?1049h", "\x1b[?1049h"}, want: []bool{true}},
		{name: "exit without enter", chunks: []string{"\x1b[?1049l"}, want: []bool{}},
		{name: "reset exits", chunks: []string{"\x1b[?1049h", "\x1bc"}, want: []bool{true, false}},
		{name: "not private", chunks: []string{"\x1b[1049h"}, want: []bool{}},
		{name: "other private mode", chunks: []string{"\x1b[?25l\x1b[?2004h"}, want: []bool{}},
		{name: "intermediate byte", chunks: []string{"\x1b[?1049$h"}, want: []bool{}},
		{name: "cancelled", chunks: []string{"\x1b[?10\x1849h"}, want: []bool{}},
		{name: "escape restarts sequence", chunks: []string{"\x1b[?25\x1b[?1049h"}, want: []bool{true}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			if got := feedInteractiveScreenChunks(test.chunks...); !slices.Equal(got, test.want) {
				t.Fatalf("expected %v, got %v", test.want, got)
			}
		})
	}
}

func TestInteractiveScreenParserPositions(t *testing.T) {
	parser := interactiveScreenParser{}
	got := parser.feed([]byte("$ top\r\n\x1b[?1049h\x1b[Hframe\x1b[?1049l$ "))
	want := []interactiveScreenChange{{Alternate: true, Start: 7, End: 15}, {Alternate: false, Start: 23, End: 31}}
	if !slices.Equal(got, want) {
		t.Fatalf("expected %v, got %v", want, got)
	}
	parser.feed([]byte("\x1b[?1049h\x1b[?10"))
	if got := parser.feed([]byte("49l$ ")); !slices.Equal(got, []interactiveScreenChange{{Alternate: false, Start: 0, End: 3}}) {
		t.Fatalf("expected carried over sequence to start at 0, got %v", got)
	}
	if got := parser.feed([]byte("ab\x1b[?1049h\x1bc")); !slices.Equal(got, []interactiveScreenChange{{Alternate: true, Start: 2, End: 10}, {Alternate: false, Start: 10, End: 12}}) {
		t.Fatalf("unexpected reset positions %v", got)
	}
}

func TestStripInteractiveScreen(t *testing.T) {
	tests := []struct {
		name   string
		chunks []string
		want   []string
	}{
		{name: "plain output", chunks: []string{"$ ls\r\n", "file\r\n"}, want: []string{"$ ls\r\n", "file\r\n"}},
		{
			name:   "enter and exit in different chunks",
			chunks: []string{"$ top\r\n\x1b[?1049h\x1b[2J", "frame 1", "frame 2", "\x1b[?1049l$ "},
			want:   []string{"$ top\r\n", "", "", "$ "},
		},
		{name: "enter and exit in one chunk", chunks: []string{"a\x1b[?1049hframe\x1b[?1049lb"}, want: []string{"ab"}},
		{name: "killed app", chunks: []string{"$ top\r\n\x1b[?1049h", "frame"}, want: []string{"$ top\r\n", ""}},
		{
			name:   "later app is left alone",
			chunks: []string{"\x1b[?1049hone\x1b[?1049l$ less\r\n\x1b[?1049htwo", "more two"},
			want:   []string{"$ less\r\n\x1b[?1049htwo", "more two"},
		},
		{name: "sequence split across chunks", chunks: []string{"a\x1b[?10", "49hframe\x1b[?1049", "lb"}, want: []string{"a", "", "b"}},
		{name: "other split sequence is kept", chunks: []string{"a\x1b[3", "1mred", "b\x1b["}, want: []string{"a\x1b[3", "1mred", "b\x1b["}},
		{name: "no enter is left alone", chunks: []string{"49hframe", "\x1b[?1049l$ "}, want: []string{"49hframe", "\x1b[?1049l$ "}},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			chunks := make([][]byte, len(test.chunks))
			for i, chunk := range test.chunks {
				chunks[i] = []byte(chunk)
			}
			got := []string{}
			for _, chunk := range stripInteractiveScreen(chunks) {
				got = append(got, string(chunk))
			}
			if !slices.Equal(got, test.want) {
				t.Fatalf("expected %q, got %q", test.want, got)
			}
		})
	}
}

func TestSplitIncompleteUTF8(t *testing.T) {
	tests := []struct {
		name      string
		data      string
		wantData  string
		wantCarry string
	}{
		{name: "ascii", data: "top", wantData: "top", wantCarry: ""},
		{name: "complete multibyte", data: "a─", wantData: "a─", wantCarry: ""},
		{name: "split three byte", data: "a\xe2\x94", wantData: "a", wantCarry: "\xe2\x94"},
		{name: "split four byte", data: "a\xf0\x9f\x98", wantData: "a", wantCarry: "\xf0\x9f\x98"},
		{name: "lead byte only", data: "a\xe2", wantData: "a", wantCarry: "\xe2"},
		{name: "invalid bytes pass through", data: "a\xff", wantData: "a\xff", wantCarry: ""},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			data, carry := splitIncompleteUTF8([]byte(test.data))
			if string(data) != test.wantData || string(carry) != test.wantCarry {
				t.Fatalf("expected %q/%q, got %q/%q", test.wantData, test.wantCarry, data, carry)
			}
		})
	}
	data, carry := splitIncompleteUTF8([]byte("box \xe2\x94"))
	data2, _ := splitIncompleteUTF8(append(carry, []byte("\x80 end")...))
	if got := string(data) + string(data2); got != "box ─ end" {
		t.Fatalf("expected rejoined character, got %q", got)
	}
}

func TestInteractiveScreenCastEncoding(t *testing.T) {
	start := time.Unix(1792055150, 0).UTC()
	if got := string(interactiveScreenCastHeader(238, 21, start)); got !=
		`{"env":{"TERM":"xterm-256color"},"height":21,"timestamp":1792055150,"version":2,"width":238}`+"\n" {
		t.Fatalf("unexpected header %q", got)
	}
	if got := string(interactiveScreenCastEvent(1500*time.Millisecond, "o", "\x1b[?1049h─")); got !=
		`[1.5,"o","\u001b[?1049h─"]`+"\n" {
		t.Fatalf("unexpected event %q", got)
	}
	if got := string(interactiveScreenCastEvent(2*time.Second, "r", "100x30")); got != `[2,"r","100x30"]`+"\n" {
		t.Fatalf("unexpected resize event %q", got)
	}
}
