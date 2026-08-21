package rabbitmq

import (
	"reflect"
	"strings"
	"testing"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
)

func TestEventStepInputAPITokenScopes(t *testing.T) {
	tests := []struct {
		name       string
		input      interface{}
		wantScopes []string
		wantToken  bool
		wantErr    string
	}{
		{
			name:      "legacy shorthand grants full access",
			input:     "mythic.apitoken",
			wantToken: false,
		},
		{
			name:      "legacy shorthand trims whitespace",
			input:     "  mythic.apitoken  ",
			wantToken: false,
		},
		{
			name:       "scoped object normalizes scopes",
			input:      map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{" Task.Read ", "response.write"}},
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_RESPONSE_WRITE, mythicjwt.SCOPE_TASK_READ},
		},
		{
			name:       "wildcard scope is accepted",
			input:      map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"task.*"}},
			wantToken:  true,
			wantScopes: []string{"task.*"},
		},
		{
			name:       "full access object is accepted",
			input:      map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"*"}},
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_ALL},
		},
		{
			name:       "string slice scopes are accepted",
			input:      map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"file.read"}},
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_FILE_READ},
		},
		{
			name:      "other string is not a token request",
			input:     "env.display_id",
			wantToken: false,
		},
		{
			name:      "other object is not a token request",
			input:     map[string]interface{}{"type": "custom", "value": "mythic.apitoken"},
			wantToken: false,
		},
		{
			name:      "missing scopes errors",
			input:     map[string]interface{}{"type": "mythic.apitoken"},
			wantToken: true,
			wantErr:   "requires scopes",
		},
		{
			name:      "empty scopes errors",
			input:     map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{}},
			wantToken: true,
			wantErr:   "at least one scope",
		},
		{
			name:      "blank scopes errors",
			input:     map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"  "}},
			wantToken: true,
			wantErr:   "at least one scope",
		},
		{
			name:      "unknown scopes error",
			input:     map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"nope.read"}},
			wantToken: true,
			wantErr:   "unknown API token scope",
		},
		{
			name:      "scope list must contain strings",
			input:     map[string]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"task.read", 12}},
			wantToken: true,
			wantErr:   "12 isn't a string",
		},
		{
			name:      "scopes must be a list",
			input:     map[string]interface{}{"type": "mythic.apitoken", "scopes": "task.read"},
			wantToken: true,
			wantErr:   "must be an array",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotScopes, gotToken, err := eventStepTryGetInputAPITokenScopes(tt.input)
			if gotToken != tt.wantToken {
				t.Fatalf("eventStepInputAPITokenScopes() token=%v, want %v", gotToken, tt.wantToken)
			}
			if tt.wantErr != "" {
				if err == nil {
					t.Fatalf("eventStepInputAPITokenScopes() expected error containing %q", tt.wantErr)
				}
				if !strings.Contains(err.Error(), tt.wantErr) {
					t.Fatalf("eventStepInputAPITokenScopes() error=%q, want contains %q", err.Error(), tt.wantErr)
				}
				return
			}
			if err != nil {
				t.Fatalf("eventStepInputAPITokenScopes() unexpected error: %v", err)
			}
			if !reflect.DeepEqual(gotScopes, tt.wantScopes) {
				t.Fatalf("eventStepInputAPITokenScopes() scopes=%v, want %v", gotScopes, tt.wantScopes)
			}
		})
	}
}
