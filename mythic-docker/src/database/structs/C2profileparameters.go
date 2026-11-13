package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type C2profileparameters struct {
	ID                   int             `db:"id"`
	C2ProfileID          int             `db:"c2_profile_id"`
	Description          string          `db:"description"`
	Name                 string          `db:"name"`
	DefaultValue         string          `db:"default_value"`
	Randomize            bool            `db:"randomize"`
	FormatString         string          `db:"format_string"`
	ParameterType        string          `db:"parameter_type"`
	Required             bool            `db:"required"`
	VerifierRegex        string          `db:"verifier_regex"`
	Deleted              bool            `db:"deleted"`
	IsCryptoType         bool            `db:"crypto_type"`
	Choices              MythicJSONArray `db:"choices"`
	UiPosition           int             `db:"ui_position"`
	GroupName            string          `db:"group_name"`
	HideConditions       MythicJSONArray `db:"hide_conditions"`
	DynamicQueryFunction string          `db:"dynamic_query_function"`
	DisplayName          string          `db:"display_name"`
	ChoicesDisplayNames  MythicJSONText  `db:"choices_display_names"`
	JSONStringSchema     MythicJSONText  `db:"json_string_schema"`
}

// AuthorizationPolicy keeps c2profileparameters permissions beside its database model.
func (C2profileparameters) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "c2profileparameters"},
		Read:  authz.Rule{Public: true},
		Relationships: []authz.RelationshipBinding{
			{Name: "c2profile", Target: C2profile{}},
		},
	}
}
