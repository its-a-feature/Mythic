package mythicjwt

import "testing"

func TestNormalizeAPITokenScopes(t *testing.T) {
	t.Parallel()

	tests := []struct {
		name    string
		scopes  []string
		want    []string
		wantErr bool
	}{
		{
			name:   "empty normalizes to no scopes",
			scopes: nil,
			want:   []string{},
		},
		{
			name:   "blank entries normalize to no scopes",
			scopes: []string{"", "  "},
			want:   []string{},
		},
		{
			name:   "normalizes wildcard alias",
			scopes: []string{" File.* ", "task.write"},
			want:   []string{"file.*", "task.write"},
		},
		{
			name:    "rejects colon wildcard alias",
			scopes:  []string{"file:*"},
			wantErr: true,
		},
		{
			name:    "rejects unknown scope",
			scopes:  []string{"nope.read"},
			wantErr: true,
		},
	}

	for _, tt := range tests {
		tt := tt
		t.Run(tt.name, func(t *testing.T) {
			t.Parallel()
			got, err := NormalizeAPITokenScopes(tt.scopes)
			if tt.wantErr {
				if err == nil {
					t.Fatalf("NormalizeAPITokenScopes() expected error")
				}
				return
			}
			if err != nil {
				t.Fatalf("NormalizeAPITokenScopes() unexpected error: %v", err)
			}
			if len(got) != len(tt.want) {
				t.Fatalf("NormalizeAPITokenScopes() = %v, want %v", got, tt.want)
			}
			for i := range got {
				if got[i] != tt.want[i] {
					t.Fatalf("NormalizeAPITokenScopes() = %v, want %v", got, tt.want)
				}
			}
		})
	}
}

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
			name:     "write grants read",
			granted:  []string{SCOPE_CREDENTIAL_WRITE},
			required: SCOPE_CREDENTIAL_READ,
			want:     true,
		},
		{
			name:     "read does not grant write",
			granted:  []string{SCOPE_CREDENTIAL_READ},
			required: SCOPE_CREDENTIAL_WRITE,
			want:     false,
		},
		{
			name:     "resource wildcard grants resource scope",
			granted:  []string{"file.*"},
			required: SCOPE_FILE_WRITE,
			want:     true,
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
			granted:   []string{SCOPE_FILE_WRITE},
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
