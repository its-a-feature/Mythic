package databaseStructs

import (
	authz "github.com/its-a-feature/Mythic/authorization"
	"time"
)

type Callbacktoken struct {
	ID               int       `db:"id" json:"id"`
	TokenID          int       `db:"token_id" json:"token_id" `
	Token            Token     `db:"token" json:"token"`
	CallbackID       int       `db:"callback_id" json:"callback_id"`
	Os               string    `db:"os" json:"-"`
	TaskID           int       `db:"task_id" json:"task_id"`
	TimestampCreated time.Time `db:"timestamp_created" json:"timestamp_created"`
	Deleted          bool      `db:"deleted" json:"deleted"`
	Host             string    `db:"host" json:"host"`
}

// AuthorizationPolicy keeps callbacktoken permissions beside its database model.
func (Callbacktoken) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "callbacktoken"},
		OperationPath: []string{"callback", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_CALLBACK_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_CALLBACK_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "callback", Target: Callback{}},
			{Name: "task", Target: Task{}},
		},
	}
}
