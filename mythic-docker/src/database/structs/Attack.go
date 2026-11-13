package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Attack struct {
	ID     int    `db:"id"`
	TNum   string `db:"t_num"`
	Name   string `db:"name"`
	Os     string `db:"os"`
	Tactic string `db:"tactic"`
}

// AuthorizationPolicy keeps attack permissions beside its database model.
func (Attack) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "attack"},
		Read:  authz.Rule{Public: true},
	}
}
