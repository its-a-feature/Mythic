package rabbitmq

import (
	"encoding/json"
	"testing"
)

func TestCredentialJSONIntegerStrictness(t *testing.T) {
	tests := []struct {
		name  string
		value interface{}
		ok    bool
		id    int
	}{
		{name: "int", value: 123, ok: true, id: 123},
		{name: "json number", value: json.Number("456"), ok: true, id: 456},
		{name: "zero", value: 0, ok: false},
		{name: "negative", value: -1, ok: false},
		{name: "float", value: 1.5, ok: false},
		{name: "numeric string", value: "123", ok: false},
		{name: "expanded object", value: map[string]interface{}{"credential_id": 123}, ok: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			id, ok := credentialJSONInteger(test.value)
			if ok != test.ok {
				t.Fatalf("expected ok=%v got %v", test.ok, ok)
			}
			if id != test.id {
				t.Fatalf("expected id=%d got %d", test.id, id)
			}
		})
	}
}
