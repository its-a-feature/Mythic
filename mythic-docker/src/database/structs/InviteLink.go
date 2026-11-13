package databaseStructs

import (
	"database/sql"
	"time"

	authz "github.com/its-a-feature/Mythic/authorization"
)

type InviteLink struct {
	ID            int            `db:"id"`
	OperationID   sql.NullInt64  `db:"operation_id"`
	OperationRole sql.NullString `db:"operation_role"`
	TotalUses     int            `db:"total_uses"`
	TotalUsed     int            `db:"total_used"`
	Name          string         `db:"name"`
	ShortCode     string         `db:"short_code"`
	OperatorID    int            `db:"operator_id"`
	CreatedAt     time.Time      `db:"created_at"`
	Operator      Operator       `db:"operator" json:"-"`
}

// AuthorizationPolicy keeps invite_link permissions beside its database model.
func (InviteLink) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "invite_link"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_MYTHIC_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_MYTHIC_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "operation", Target: Operation{}},
		},
	}
}
