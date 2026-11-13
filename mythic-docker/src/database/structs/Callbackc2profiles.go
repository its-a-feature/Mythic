package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Callbackc2profiles struct {
	ID          int       `db:"id"`
	CallbackID  int       `db:"callback_id"`
	C2ProfileID int       `db:"c2_profile_id"`
	C2Profile   C2profile `db:"c2profile"`
}

// AuthorizationPolicy keeps callbackc2profiles permissions beside its database model.
func (Callbackc2profiles) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "callbackc2profiles"},
		OperationPath: []string{"callback", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_CALLBACK_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_CALLBACK_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "callback", Target: Callback{}},
		},
	}
}
