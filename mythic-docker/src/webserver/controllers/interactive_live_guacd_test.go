package webcontroller

import (
	"testing"

	"github.com/its-a-feature/Mythic/guac"
)

func TestGuacdViewOnlyInputAllowsProtocolMaintenance(t *testing.T) {
	for _, opcode := range []string{"ack", "disconnect", "nop", "pong", "sync"} {
		t.Run(opcode, func(t *testing.T) {
			if !guacdViewOnlyInputAllowed(guac.EncodeInstruction(opcode, "value")) {
				t.Fatalf("view-only user was denied %q", opcode)
			}
		})
	}
}

func TestGuacdViewOnlyInputRejectsRemoteControlAndMalformedData(t *testing.T) {
	for name, data := range map[string][]byte{
		"key":       guac.EncodeInstruction("key", "65", "1"),
		"mouse":     guac.EncodeInstruction("mouse", "1", "2", "0"),
		"resize":    guac.EncodeInstruction("size", "1920", "1080", "96"),
		"clipboard": guac.EncodeInstruction("clipboard", "0", "text/plain"),
		"multiple":  append(guac.EncodeInstruction("sync", "1"), guac.EncodeInstruction("key", "65", "1")...),
		"malformed": []byte("not-guacamole"),
	} {
		t.Run(name, func(t *testing.T) {
			if guacdViewOnlyInputAllowed(data) {
				t.Fatalf("view-only user was allowed %q", data)
			}
		})
	}
}
