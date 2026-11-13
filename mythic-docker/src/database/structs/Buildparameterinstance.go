package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
)

type Buildparameterinstance struct {
	ID               int            `db:"id"`
	BuildParameterID int            `db:"build_parameter_id"`
	BuildParameter   Buildparameter `db:"buildparameter"`
	PayloadID        sql.NullInt64  `db:"payload_id"`
	Value            string         `db:"value"`
	EncKey           *[]byte        `db:"enc_key"`
	DecKey           *[]byte        `db:"dec_key"`
	InstanceName     sql.NullString `db:"instance_name"`
	OperationID      sql.NullInt64  `db:"operation_id"`
}

// AuthorizationPolicy keeps buildparameterinstance permissions beside its database model.
func (Buildparameterinstance) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "buildparameterinstance"},
		OperationPaths: [][]string{
			{"operation_id"},
			{"payload", "operation_id"},
		},
		Read:  authz.Rule{Permission: authz.SCOPE_PAYLOAD_READ},
		Write: authz.Rule{Permission: authz.SCOPE_PAYLOAD_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "operation", Target: Operation{}},
			{Name: "payload", Target: Payload{}},
		},
	}
}
