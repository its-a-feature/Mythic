package databaseStructs

import (
	"database/sql"
)

type GlobalSetting struct {
	ID         int            `db:"id"`
	Name       string         `db:"name"`
	Setting    MythicJSONText `db:"setting"`
	OperatorID sql.NullInt64  `db:"operator_id"`
	Operator   Operator       `db:"operator" json:"-"`
}

type GlobalSettingServerConfig struct {
	Name              string `json:"name" mapstructure:"name"`
	Version           string `json:"version" mapstructure:"version"`
	DebugAgentMessage bool   `json:"debug_agent_message" mapstructure:"debug_agent_message"`
	AllowInviteLinks  bool   `json:"allow_invite_links" mapstructure:"allow_invite_links"`
}

var GlobalSettingDefaultsMap = map[string]interface{}{
	"preferences":   map[string]interface{}{},
	"server_config": GlobalSettingServerConfig{},
}
