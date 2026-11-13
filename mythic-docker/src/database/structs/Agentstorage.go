package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Agentstorage struct {
	ID       int    `db:"id"`
	Data     []byte `db:"data"`
	UniqueID string `db:"unique_id"`
}

// AuthorizationPolicy keeps agentstorage permissions beside its database model.
func (Agentstorage) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "agentstorage"},
		Read:  authz.Rule{Public: true},
	}
}
