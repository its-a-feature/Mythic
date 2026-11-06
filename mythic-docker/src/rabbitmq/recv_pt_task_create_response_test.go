package rabbitmq

import "testing"

func TestPtTaskCreateErrorStatusIncludesHandlerError(t *testing.T) {
	want := "Error: creating task Failed to find BOF file 'rto-rdp.windows.x64.o' in Mythic"
	got := ptTaskCreateErrorStatus("Failed to find BOF file 'rto-rdp.windows.x64.o' in Mythic")
	if got != want {
		t.Fatalf("task status = %q, want %q", got, want)
	}
}
