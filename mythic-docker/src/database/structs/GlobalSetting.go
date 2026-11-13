package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
)

type GlobalSetting struct {
	ID         int            `db:"id"`
	Name       string         `db:"name"`
	Setting    MythicJSONText `db:"setting"`
	OperatorID sql.NullInt64  `db:"operator_id"`
	Operator   Operator       `db:"operator" json:"-"`
}

type GlobalSettingServerConfig struct {
	Name                        string `json:"name" mapstructure:"name"`
	Version                     string `json:"version" mapstructure:"version"`
	DebugAgentMessage           bool   `json:"debug_agent_message" mapstructure:"debug_agent_message"`
	AllowInviteLinks            bool   `json:"allow_invite_links" mapstructure:"allow_invite_links"`
	AllowWebhooksOnNewCallbacks bool   `json:"allow_webhooks_on_new_callbacks" mapstructure:"allow_webhooks_on_new_callbacks"`
}

var GlobalSettingDefaultsMap = map[string]interface{}{
	"preferences":   map[string]interface{}{},
	"server_config": GlobalSettingServerConfig{},
}

// AuthorizationPolicy keeps global_setting permissions beside its database model.
func (GlobalSetting) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "global_setting"},
		Read:  authz.Rule{Permission: authz.SCOPE_MYTHIC_READ},
		Write: authz.Rule{Permission: authz.SCOPE_MYTHIC_WRITE},
	}
}
