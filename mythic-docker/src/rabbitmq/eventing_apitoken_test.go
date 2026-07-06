package rabbitmq

import (
	"reflect"
	"strings"
	"testing"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
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
			name:       "legacy shorthand grants full access",
			input:      "mythic.apitoken",
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_ALL},
		},
		{
			name:       "legacy shorthand trims whitespace",
			input:      "  mythic.apitoken  ",
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_ALL},
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
			input:      map[string]interface{}{"type": "mythic.apitoken", "scopes": []string{"file.read"}},
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_FILE_READ},
		},
		{
			name:       "yaml style map is accepted",
			input:      map[interface{}]interface{}{"type": "mythic.apitoken", "scopes": []interface{}{"task.write"}},
			wantToken:  true,
			wantScopes: []string{mythicjwt.SCOPE_TASK_WRITE},
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
			wantErr:   "scopes[1] must be a string",
		},
		{
			name:      "scopes must be a list",
			input:     map[string]interface{}{"type": "mythic.apitoken", "scopes": "task.read"},
			wantToken: true,
			wantErr:   "must be a list of strings",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotScopes, gotToken, err := eventStepInputAPITokenScopes(tt.input)
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

func TestNewEventStepAPITokenStoresScopes(t *testing.T) {
	stepInstance := databaseStructs.EventStepInstance{
		ID:         42,
		OperatorID: 7,
		EventStep: databaseStructs.EventStep{
			Name: "inspect responses",
		},
	}
	scopes := []string{mythicjwt.SCOPE_RESPONSE_READ, mythicjwt.SCOPE_TASK_READ}

	apiToken := newEventStepAPIToken(stepInstance, scopes)

	if apiToken.TokenType != mythicjwt.AUTH_METHOD_EVENT {
		t.Fatalf("TokenType=%q, want %q", apiToken.TokenType, mythicjwt.AUTH_METHOD_EVENT)
	}
	if !apiToken.Active {
		t.Fatal("event step API token should be active")
	}
	if apiToken.OperatorID != stepInstance.OperatorID || apiToken.CreatedBy != stepInstance.OperatorID {
		t.Fatalf("operator attribution mismatch: operator_id=%d created_by=%d", apiToken.OperatorID, apiToken.CreatedBy)
	}
	if !apiToken.EventStepInstanceID.Valid || apiToken.EventStepInstanceID.Int64 != int64(stepInstance.ID) {
		t.Fatalf("EventStepInstanceID=%#v, want valid %d", apiToken.EventStepInstanceID, stepInstance.ID)
	}
	if !reflect.DeepEqual([]string(apiToken.Scopes), scopes) {
		t.Fatalf("Scopes=%v, want %v", []string(apiToken.Scopes), scopes)
	}
}
