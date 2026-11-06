package rabbitmq

import "testing"

func TestInteractiveTaskProtocolFromFeatures(t *testing.T) {
	tests := []struct {
		name     string
		features []string
		want     InteractiveTaskProtocol
		wantErr  bool
	}{
		{name: "legacy terminal", features: []string{"task_response:interactive"}, want: InteractiveTaskProtocolTerminal},
		{name: "explicit terminal", features: []string{"task_response:interactive:terminal"}, want: InteractiveTaskProtocolTerminal},
		{name: "rdp", features: []string{"task_response:interactive:rdp"}, want: InteractiveTaskProtocolRDP},
		{name: "vnc with unrelated feature", features: []string{"cat", "task_response:interactive:vnc"}, want: InteractiveTaskProtocolVNC},
		{name: "specific overrides legacy default", features: []string{"task_response:interactive", "task_response:interactive:rdp"}, want: InteractiveTaskProtocolRDP},
		{name: "not interactive", features: []string{"cat"}, wantErr: true},
		{name: "unknown", features: []string{"task_response:interactive:rdp2"}, wantErr: true},
		{name: "conflict", features: []string{"task_response:interactive:rdp", "task_response:interactive:vnc"}, wantErr: true},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := InteractiveTaskProtocolFromFeatures(test.features)
			if test.wantErr {
				if err == nil {
					t.Fatalf("protocol = %q, want error", got)
				}
				return
			}
			if err != nil || got != test.want {
				t.Fatalf("protocol = %q, err = %v, want %q", got, err, test.want)
			}
		})
	}
}
