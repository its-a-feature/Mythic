package databaseStructs

import (
	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Loadedcommands struct {
	ID          int               `db:"id"`
	CommandID   int               `db:"command_id"`
	Command     Command           `db:"command"`
	CallbackID  int               `db:"callback_id"`
	Callback    Callback          `db:"callback"`
	OperatorID  int               `db:"operator_id"`
	Timestamp   time.Time         `db:"timestamp"`
	Version     int               `db:"version"`
	APITokensID structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

// AuthorizationPolicy keeps loadedcommands permissions beside its database model.
func (Loadedcommands) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "loadedcommands"},
		OperationPath: []string{"callback", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_CALLBACK_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_CALLBACK_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
			{Name: "operator", Target: Operator{}},
		},
	}
}
