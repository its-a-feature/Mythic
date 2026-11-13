package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Payloadc2profiles struct {
	ID          int       `db:"id"`
	PayloadID   int       `db:"payload_id"`
	C2ProfileID int       `db:"c2_profile_id"`
	C2profile   C2profile `db:"c2profile"`
}

// AuthorizationPolicy keeps payloadc2profiles permissions beside its database model.
func (Payloadc2profiles) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "payloadc2profiles"},
		OperationPath: []string{"payload", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_PAYLOAD_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_PAYLOAD_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "payload", Target: Payload{}},
		},
	}
}
