package databaseStructs

import (
	"database/sql/driver"
	"encoding/json"
	"reflect"
	"testing"
)

func TestJSONValuesUseTextParameters(t *testing.T) {
	cases := []struct {
		name    string
		value   driver.Valuer
		want    string
		invalid bool
	}{
		{"object", MythicJSONText(`{"nested":{"enabled":true},"text":"雪\\path","items":[1,null]}`), `{"nested":{"enabled":true},"text":"雪\\path","items":[1,null]}`, false},
		{"empty_object", MythicJSONText(nil), `{}`, false},
		{"array", MythicJSONArray(`["a","雪\\path",null]`), `["a","雪\\path",null]`, false},
		{"empty_array", MythicJSONArray(nil), `[]`, false},
		{"empty_array_brackets", MythicJSONArray(`[]`), `[]`, false},
		{"single_string", MythicJSONArray(`["a"]`), `["a"]`, false},
		{"invalid_object", MythicJSONText(`{"bad":`), "", true},
		{"invalid_array", MythicJSONArray(`["bad"`), "", true},
	}
	for _, tc := range cases {
		t.Run(tc.name, func(t *testing.T) {
			v, err := tc.value.Value()
			if tc.invalid {
				if err == nil {
					t.Fatal("invalid JSON accepted")
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			text, ok := v.(string)
			if !ok {
				t.Fatalf("SQL JSON parameter must be text, got %T", v)
			}
			if text != tc.want {
				t.Fatalf("got %q, want %q", text, tc.want)
			}
			// Changing the SQL parameter format must not change API JSON encoding.
			wire, err := json.Marshal(tc.value)
			if err != nil {
				t.Fatal(err)
			}
			var got, want interface{}
			if err = json.Unmarshal(wire, &got); err != nil {
				t.Fatal(err)
			}
			if err = json.Unmarshal([]byte(tc.want), &want); err != nil {
				t.Fatal(err)
			}
			if !reflect.DeepEqual(got, want) {
				t.Fatalf("API JSON changed: %s", wire)
			}
		})
	}
}

func TestJSONScanAcceptsExistingRepresentations(t *testing.T) {
	for _, source := range []interface{}{`{"value":"雪"}`, []byte(`{"value":"雪"}`)} {
		var value MythicJSONText
		if err := value.Scan(source); err != nil {
			t.Fatal(err)
		}
		if got, err := value.Value(); err != nil || got != `{"value":"雪"}` {
			t.Fatalf("scan/value: %v, %v", got, err)
		}
	}
	for _, source := range []interface{}{`["雪"]`, []byte(`["雪"]`)} {
		var value MythicJSONArray
		if err := value.Scan(source); err != nil {
			t.Fatal(err)
		}
		if got, err := value.Value(); err != nil || got != `["雪"]` {
			t.Fatalf("scan/value: %v, %v", got, err)
		}
	}
}
