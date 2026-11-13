package databaseStructs

import (
	"time"

	authz "github.com/its-a-feature/Mythic/authorization"
)

type Command struct {
	ID                  int             `db:"id"`
	NeedsAdmin          bool            `db:"needs_admin"`
	HelpCmd             string          `db:"help_cmd"`
	Description         string          `db:"description"`
	Cmd                 string          `db:"cmd"`
	PayloadTypeID       int             `db:"payload_type_id"`
	Payloadtype         Payloadtype     `db:"payloadtype" json:"-"`
	CreationTime        time.Time       `db:"creation_time"`
	Version             int             `db:"version"`
	SupportedUiFeatures MythicJSONArray `db:"supported_ui_features"`
	Author              string          `db:"author"`
	Deleted             bool            `db:"deleted"`
	Attributes          MythicJSONText  `db:"attributes"`
	ScriptOnly          bool            `db:"script_only"`
}

// AuthorizationPolicy keeps command permissions beside its database model.
func (Command) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "command"},
		Read:  authz.Rule{Public: true},
	}
}
