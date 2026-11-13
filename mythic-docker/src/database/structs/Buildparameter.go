package databaseStructs

import authz "github.com/its-a-feature/Mythic/authorization"

type Buildparameter struct {
	ID                   int             `db:"id"`
	Name                 string          `db:"name"`
	ParameterType        string          `db:"parameter_type"`
	Description          string          `db:"description"`
	PayloadTypeID        int             `db:"payload_type_id"`
	Required             bool            `db:"required"`
	VerifierRegex        string          `db:"verifier_regex"`
	Deleted              bool            `db:"deleted"`
	DefaultValue         string          `db:"default_value"`
	IsCryptoType         bool            `db:"crypto_type"`
	FormatString         string          `db:"format_string"`
	Randomize            bool            `db:"randomize"`
	Choices              MythicJSONArray `db:"choices"`
	GroupName            string          `db:"group_name"`
	SupportedOS          MythicJSONArray `db:"supported_os"`
	HideConditions       MythicJSONArray `db:"hide_conditions"`
	UiPosition           int             `db:"ui_position"`
	DynamicQueryFunction string          `db:"dynamic_query_function"`
	DisplayName          string          `db:"display_name"`
	ChoicesDisplayNames  MythicJSONText  `db:"choices_display_names"`
	JSONStringSchema     MythicJSONText  `db:"json_string_schema"`
}

// AuthorizationPolicy keeps buildparameter permissions beside its database model.
func (Buildparameter) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "buildparameter"},
		Read:  authz.Rule{Public: true},
		Relationships: []authz.RelationshipBinding{
			{Name: "payloadtype", Target: Payloadtype{}},
		},
	}
}
