package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Attacktask struct {
	ID       int    `db:"id"`
	Attack   Attack `db:"attack"`
	AttackID int    `db:"attack_id"`
	Task     Task   `db:"task"`
	TaskID   int    `db:"task_id"`
}

// AuthorizationPolicy keeps attacktask permissions beside its database model.
func (Attacktask) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "attacktask"},
		OperationPath: []string{"task", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_TASK_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_TASK_WRITE},
	}
}
