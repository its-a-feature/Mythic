package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
	"time"
)

type Payloadonhost struct {
	ID          int           `db:"id"`
	Host        string        `db:"host"`
	PayloadID   int           `db:"payload_id"`
	Deleted     bool          `db:"deleted"`
	OperationID int           `db:"operation_id"`
	Timestamp   time.Time     `db:"timestamp"`
	TaskID      sql.NullInt64 `db:"task_id"`
}

// AuthorizationPolicy keeps payloadonhost permissions beside its database model.
func (Payloadonhost) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "payloadonhost"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_PAYLOAD_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_PAYLOAD_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "operation", Target: Operation{}},
			{Name: "payload", Target: Payload{}},
			{Name: "task", Target: Task{}},
		},
	}
}
