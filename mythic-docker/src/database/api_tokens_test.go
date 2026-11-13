package database_test

import (
	"strings"
	"testing"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestTokenIssuanceRejectsInvalidGrantsBeforeStorage(t *testing.T) {
	for _, test := range []struct {
		name                       string
		operation, sourceOperation int
		scopes, ceiling            []string
		message                    string
	}{
		{name: "operation required", scopes: []string{"task.read"}, ceiling: []string{"*"}, message: "operation_id"},
		{name: "parent operation enforced", operation: 7, sourceOperation: 8, scopes: []string{"task.read"}, ceiling: []string{"*"}, message: "operation_id"},
		{name: "empty scopes", operation: 7, ceiling: []string{"*"}, message: "nonempty"},
		{name: "whitespace is not a grant", operation: 7, scopes: []string{"  "}, ceiling: []string{"*"}, message: "nonempty"},
		{name: "unknown names", operation: 7, scopes: []string{"Nope.Read"}, ceiling: []string{"*"}, message: "unknown API token scope"},
		{name: "wildcard cannot exceed parent", operation: 7, scopes: []string{"task.*"}, ceiling: []string{"task.read"}, message: "cannot grant"},
		{name: "parent has no implicit read", operation: 7, scopes: []string{"task.read"}, ceiling: []string{"task.write"}, message: "cannot grant"},
	} {
		t.Run(test.name, func(t *testing.T) {
			token := databaseStructs.Apitokens{OperationID: test.operation}
			ceiling := map[string]bool{}
			for _, scope := range test.ceiling {
				ceiling[scope] = true
			}
			_, err := database.CreateAPIToken(&token, test.scopes, ceiling, test.sourceOperation)
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected %q, got %v", test.message, err)
			}
		})
	}
}
