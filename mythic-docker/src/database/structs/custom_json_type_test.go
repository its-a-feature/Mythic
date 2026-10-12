package databaseStructs

import (
	"encoding/json"
	"testing"
)

func TestMythicJSONText_Value(t *testing.T) {
	tests := []struct {
		name        string
		input       MythicJSONText
		wantStr     string
		wantErr     bool
		requireJSON bool
	}{
		{
			name:        "valid json object",
			input:       MythicJSONText(`{"key":"value","num":123}`),
			wantStr:     `{"key":"value","num":123}`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:        "valid empty json object",
			input:       MythicJSONText(`{}`),
			wantStr:     `{}`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:        "uninitialized empty MythicJSONText defaults to empty json",
			input:       MythicJSONText{},
			wantStr:     `{}`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:    "invalid json missing quote",
			input:   MythicJSONText(`{"key: 123}`),
			wantErr: true,
		},
		{
			name:    "invalid json unclosed bracket",
			input:   MythicJSONText(`{"key": "val"`),
			wantErr: true,
		},
		{
			name:    "invalid json malformed characters",
			input:   MythicJSONText(`not valid json`),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.input.Value()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Value() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}

			strVal, ok := val.(string)
			if !ok {
				t.Fatalf("Value() did not return string, got %T (%v)", val, val)
			}

			if strVal != tt.wantStr {
				t.Errorf("Value() = %q, want %q", strVal, tt.wantStr)
			}

			if tt.requireJSON && !json.Valid([]byte(strVal)) {
				t.Errorf("Value() returned string %q which is not valid JSON", strVal)
			}
		})
	}
}

func TestMythicJSONArray_Value(t *testing.T) {
	tests := []struct {
		name        string
		input       MythicJSONArray
		wantStr     string
		wantErr     bool
		requireJSON bool
	}{
		{
			name:        "valid json array with elements",
			input:       MythicJSONArray(`["item1","item2"]`),
			wantStr:     `["item1","item2"]`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:        "valid 5-char minimum single element array",
			input:       MythicJSONArray(`["a"]`),
			wantStr:     `["a"]`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:        "empty array brackets normalized to []",
			input:       MythicJSONArray(`[]`),
			wantStr:     `[]`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:        "short array under 5 characters normalized to []",
			input:       MythicJSONArray(`[1]`),
			wantStr:     `[]`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:        "uninitialized empty MythicJSONArray normalized to []",
			input:       MythicJSONArray{},
			wantStr:     `[]`,
			wantErr:     false,
			requireJSON: true,
		},
		{
			name:    "invalid json array unclosed bracket",
			input:   MythicJSONArray(`["unclosed"`),
			wantErr: true,
		},
		{
			name:    "invalid json array malformed tokens",
			input:   MythicJSONArray(`[1, 2, notvalid]`),
			wantErr: true,
		},
		{
			name:    "invalid json array raw string",
			input:   MythicJSONArray(`not an array`),
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			val, err := tt.input.Value()
			if (err != nil) != tt.wantErr {
				t.Fatalf("Value() error = %v, wantErr %v", err, tt.wantErr)
			}
			if tt.wantErr {
				return
			}

			strVal, ok := val.(string)
			if !ok {
				t.Fatalf("Value() did not return string, got %T (%v)", val, val)
			}

			if strVal != tt.wantStr {
				t.Errorf("Value() = %q, want %q", strVal, tt.wantStr)
			}

			if tt.requireJSON && !json.Valid([]byte(strVal)) {
				t.Errorf("Value() returned string %q which is not valid JSON", strVal)
			}
		})
	}
}
