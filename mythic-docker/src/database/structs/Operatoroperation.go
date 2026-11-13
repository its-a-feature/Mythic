package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Operatoroperation struct {
	ID                      int                     `db:"id"`
	OperatorID              int                     `db:"operator_id"`
	CurrentOperator         Operator                `db:"operator"`
	OperationID             int                     `db:"operation_id"`
	CurrentOperation        Operation               `db:"operation"`
	Timestamp               time.Time               `db:"timestamp"`
	BaseDisabledCommandsID  sql.NullInt64           `db:"base_disabled_commands_id"`
	DisabledCommandsProfile Disabledcommandsprofile `db:"disabledcommandsprofile"`
	ViewMode                string                  `db:"view_mode"`
	APITokensID             structs.NullInt64       `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

// AuthorizationPolicy keeps operatoroperation permissions beside its database model.
func (Operatoroperation) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "operatoroperation"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_OPERATION_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_OPERATION_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
		},
	}
}
