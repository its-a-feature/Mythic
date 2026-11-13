package authorization

import "testing"

func TestAllowsScope(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name     string
		granted  []string
		required string
		want     bool
	}{
		{
			name:     "all grants any scope",
			granted:  []string{SCOPE_ALL},
			required: SCOPE_CREDENTIAL_WRITE,
			want:     true,
		},
		{
			name:     "empty grants no scope",
			granted:  nil,
			required: SCOPE_CREDENTIAL_READ,
			want:     false,
		},
		{
			name:     "stored write does not expand during authorization",
			granted:  []string{SCOPE_CREDENTIAL_WRITE},
			required: SCOPE_CREDENTIAL_READ,
			want:     false,
		},
		{
			name:     "read does not grant write",
			granted:  []string{SCOPE_CREDENTIAL_READ},
			required: SCOPE_CREDENTIAL_WRITE,
			want:     false,
		},
		{
			name:     "stored resource wildcard is not expanded",
			granted:  []string{"file.*"},
			required: SCOPE_FILE_WRITE,
			want:     false,
		},
		{
			name:     "stored AI wildcard is not expanded",
			granted:  []string{"chat-ai.*"},
			required: SCOPE_CHAT_AI_WRITE,
			want:     false,
		},
		{
			name:     "chat write does not grant ai chat write",
			granted:  []string{SCOPE_CHAT_WRITE},
			required: SCOPE_CHAT_AI_WRITE,
			want:     false,
		},
		{
			name:     "file write grants upload",
			granted:  []string{SCOPE_FILE_WRITE},
			required: SCOPE_FILE_WRITE,
			want:     true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			if got := AllowsScope(tt.granted, tt.required); got != tt.want {
				t.Fatalf("AllowsScope(%v, %q) = %v, want %v", tt.granted, tt.required, got, tt.want)
			}
		})
	}
}

func TestCanGrantAPITokenScopes(t *testing.T) {
	t.Parallel()
	tests := []struct {
		name      string
		granted   []string
		requested []string
		wantErr   bool
	}{
		{
			name:      "all can grant all",
			granted:   []string{SCOPE_ALL},
			requested: []string{SCOPE_ALL},
			wantErr:   false,
		},
		{
			name:      "read cannot grant all",
			granted:   []string{SCOPE_FILE_READ},
			requested: []string{SCOPE_ALL},
			wantErr:   true,
		},
		{
			name:      "write can grant included read",
			granted:   []string{SCOPE_FILE_WRITE, SCOPE_FILE_READ},
			requested: []string{SCOPE_FILE_READ},
			wantErr:   false,
		},
		{
			name:      "read cannot grant write",
			granted:   []string{SCOPE_FILE_READ},
			requested: []string{SCOPE_FILE_WRITE},
			wantErr:   true,
		},
		{
			name:      "resource wildcard can grant resource wildcard",
			granted:   []string{"file.*"},
			requested: []string{"file.*"},
			wantErr:   false,
		},
		{
			name:      "write cannot grant future resource wildcard",
			granted:   []string{SCOPE_FILE_WRITE},
			requested: []string{"file.*"},
			wantErr:   true,
		},
		{
			name:      "empty can grant no scopes",
			granted:   []string{},
			requested: []string{},
			wantErr:   false,
		},
		{
			name:      "empty cannot grant read",
			granted:   []string{},
			requested: []string{SCOPE_FILE_READ},
			wantErr:   true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			err := CanGrantAPITokenScopes(tt.granted, tt.requested)
			if tt.wantErr && err == nil {
				t.Fatalf("CanGrantAPITokenScopes(%v, %v) expected error", tt.granted, tt.requested)
			}
			if !tt.wantErr && err != nil {
				t.Fatalf("CanGrantAPITokenScopes(%v, %v) unexpected error: %v", tt.granted, tt.requested, err)
			}
		})
	}
}

func TestHasuraScopeRequirementsDescribeAllowedIDArrays(t *testing.T) {
	expected := map[string]string{
		"file.read/operation":     "x-hasura-file-read-operation-ids",
		"chat-ai.write/operation": "x-hasura-chat-ai-write-operation-ids",
		"apitoken.read/actor":     "x-hasura-apitoken-read-actor-ids",
		"operator.write/actor":    "x-hasura-operator-write-actor-ids",
	}
	for _, definition := range HasuraScopeRequirements() {
		key := definition.Scope + "/" + definition.Anchor
		if name, exists := expected[key]; exists {
			if definition.SessionClaim != name {
				t.Fatalf("%s: got %s, want %s", key, definition.SessionClaim, name)
			}
			delete(expected, key)
		}
	}
	if len(expected) != 0 {
		t.Fatalf("missing claim descriptions: %v", expected)
	}
}

func TestGrantableWildcardsUseConcreteIssuanceGrants(t *testing.T) {
	// A new catalog permission must make the corresponding wildcard unavailable
	// until the parent actually has it; runtime checks never expand the alias.
	if got := GrantableWildcardScopes([]string{SCOPE_FILE_READ}); len(got) != 0 {
		t.Fatalf("partial resource advertised wildcard: %v", got)
	}
	got := GrantableWildcardScopes([]string{SCOPE_FILE_READ, SCOPE_FILE_WRITE})
	if len(got) != 1 || got[0] != "file.*" {
		t.Fatalf("complete concrete resource did not advertise wildcard: %v", got)
	}
	if got := GrantableWildcardScopes([]string{SCOPE_CREDENTIAL_READ, SCOPE_CREDENTIAL_WRITE}); len(got) != 0 {
		t.Fatalf("metadata-only token advertised credential value access: %v", got)
	}
	got = GrantableWildcardScopes([]string{SCOPE_CREDENTIAL_READ, SCOPE_CREDENTIAL_WRITE, SCOPE_CREDENTIAL_VALUE_READ})
	if len(got) != 1 || got[0] != "credential.*" {
		t.Fatalf("full credential grants did not advertise wildcard: %v", got)
	}
}
