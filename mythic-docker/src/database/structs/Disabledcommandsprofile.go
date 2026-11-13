package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Disabledcommandsprofile struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	CommandID   int    `db:"command_id"`
	OperationID int    `db:"operation_id"`
}

// AuthorizationPolicy keeps disabledcommandsprofile permissions beside its database model.
func (Disabledcommandsprofile) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "disabledcommandsprofile"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_OPERATION_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_OPERATION_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "command", Target: Command{}},
			{Name: "operation", Target: Operation{}},
		},
	}
}
