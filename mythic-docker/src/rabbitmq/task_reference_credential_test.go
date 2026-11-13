package rabbitmq

import (
	"strings"
	"testing"

	"github.com/its-a-feature/Mythic/authorization"
)

func TestCredentialTaskReferencesCheckPermissionsBeforeLookup(t *testing.T) {
	for _, test := range []struct {
		name, field, missing string
		scopes               map[string]bool
	}{
		{name: "metadata requires credential read", field: "account", missing: authorization.SCOPE_CREDENTIAL_READ},
		{name: "raw value requires credential read", field: "credential", missing: authorization.SCOPE_CREDENTIAL_READ},
		{name: "structured value requires credential read", missing: authorization.SCOPE_CREDENTIAL_READ},
		{name: "raw value requires field grant", field: "credential", scopes: map[string]bool{authorization.SCOPE_CREDENTIAL_READ: true}, missing: authorization.SCOPE_CREDENTIAL_VALUE_READ},
		{name: "structured value requires field grant", scopes: map[string]bool{authorization.SCOPE_CREDENTIAL_READ: true}, missing: authorization.SCOPE_CREDENTIAL_VALUE_READ},
	} {
		t.Run(test.name, func(t *testing.T) {
			if test.missing == authorization.SCOPE_CREDENTIAL_VALUE_READ && len(authorization.Current.Tables["credential"].Policy.FieldReads) == 0 {
				t.Skip("credential value restriction is disabled in the model")
			}
			_, err := (credentialTaskReferenceProvider{}).BatchResolveTaskReferences(
				taskReferenceResolveContext{OperationID: 7, Scopes: test.scopes},
				[]taskReference{{Keyword: "cred", Selector: "1", Field: test.field}},
			)
			if err == nil || !strings.Contains(err.Error(), test.missing) {
				t.Fatalf("reference did not enforce %s before a database lookup: %v", test.missing, err)
			}
		})
	}
}
