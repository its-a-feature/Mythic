package databaseStructs

import (
	authz "github.com/its-a-feature/Mythic/authorization"
	"time"
)

type Payloadcommand struct {
	ID           int       `db:"id"`
	PayloadID    int       `db:"payload_id"`
	CommandID    int       `db:"command_id"`
	Command      Command   `db:"command"`
	CreationTime time.Time `db:"creation_time"`
	Version      int       `db:"version"`
}

// AuthorizationPolicy keeps payloadcommand permissions beside its database model.
func (Payloadcommand) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "payloadcommand"},
		OperationPath: []string{"payload", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_PAYLOAD_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_PAYLOAD_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "payload", Target: Payload{}},
		},
	}
}
