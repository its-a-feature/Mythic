package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Payloadtypec2profile struct {
	ID            int `db:"id"`
	PayloadTypeID int `db:"payload_type_id"`
	Payloadtype   `db:"payloadtype"`
	C2ProfileID   int `db:"c2_profile_id"`
	C2profile     `db:"c2profile"`
}

// AuthorizationPolicy keeps payloadtypec2profile permissions beside its database model.
func (Payloadtypec2profile) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "payloadtypec2profile"},
		Read:  authz.Rule{Public: true},
		Relationships: []authz.RelationshipBinding{
			{Name: "c2profile", Target: C2profile{}},
			{Name: "payloadtype", Target: Payloadtype{}},
		},
	}
}
