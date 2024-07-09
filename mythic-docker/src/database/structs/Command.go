package databaseStructs

import (
	"time"
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
