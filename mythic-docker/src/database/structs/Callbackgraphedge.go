package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Callbackgraphedge struct {
	ID             int               `db:"id"`
	StartTimestamp time.Time         `db:"start_timestamp"`
	EndTimestamp   sql.NullTime      `db:"end_timestamp"`
	OperationID    int               `db:"operation_id"`
	SourceID       int               `db:"source_id"`
	Source         Callback          `db:"source"`
	DestinationID  int               `db:"destination_id"`
	Destination    Callback          `db:"destination"`
	Metadata       string            `db:"metadata"`
	C2ProfileID    int               `db:"c2_profile_id"`
	C2Profile      C2profile         `db:"c2profile"`
	APITokensID    structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	UpdatedAt      time.Time         `db:"updated_at"`
}

// AuthorizationPolicy keeps callbackgraphedge permissions beside its database model.
func (Callbackgraphedge) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "callbackgraphedge"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_CALLBACK_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_CALLBACK_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
			{Name: "operation", Target: Operation{}},
		},
	}
}
