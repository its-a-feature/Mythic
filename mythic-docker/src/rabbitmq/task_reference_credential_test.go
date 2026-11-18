package rabbitmq

import (
	"database/sql"
	"strings"
	"testing"

	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	"github.com/jmoiron/sqlx"
)

func TestCredentialTaskReferencesReachLookupWithoutScopeChecks(t *testing.T) {
	// Credential reference scope checks are currently disabled. A closed database
	// verifies that resolution reaches the lookup without requiring a live server.
	db, err := sql.Open("postgres", "")
	if err != nil {
		t.Fatal(err)
	}
	if err = db.Close(); err != nil {
		t.Fatal(err)
	}
	previousDB := database.DB
	database.DB = sqlx.NewDb(db, "postgres")
	t.Cleanup(func() { database.DB = previousDB })

	for _, test := range []struct {
		name, field string
		scopes      map[string]bool
	}{
		{name: "metadata without scopes", field: "account"},
		{name: "raw value without scopes", field: "credential"},
		{name: "structured value without scopes"},
		{name: "raw value with read scope", field: "credential", scopes: map[string]bool{authorization.SCOPE_CREDENTIAL_READ: true}},
		{name: "structured value with read scope", scopes: map[string]bool{authorization.SCOPE_CREDENTIAL_READ: true}},
	} {
		t.Run(test.name, func(t *testing.T) {
			_, err := (credentialTaskReferenceProvider{}).BatchResolveTaskReferences(
				taskReferenceResolveContext{OperationID: 7, Scopes: test.scopes},
				[]taskReference{{Keyword: "cred", Selector: "1", Field: test.field}},
			)
			if err == nil || !strings.Contains(err.Error(), "failed to resolve credential references: sql: database is closed") {
				t.Fatalf("expected a database lookup without scope checks, got %v", err)
			}
		})
	}
}
