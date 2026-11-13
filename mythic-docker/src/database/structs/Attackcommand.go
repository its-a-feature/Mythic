package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Attackcommand struct {
	ID        int `db:"id"`
	AttackID  int `db:"attack_id"`
	Attack    `db:"attack"`
	CommandID int `db:"command_id"`
	Command   `db:"command"`
}

// AuthorizationPolicy keeps attackcommand permissions beside its database model.
func (Attackcommand) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "attackcommand"},
		Read:  authz.Rule{Public: true},
		Relationships: []authz.RelationshipBinding{
			{Name: "attack", Target: Attack{}},
			{Name: "command", Target: Command{}},
		},
	}
}
