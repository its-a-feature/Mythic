package databaseStructs

import (
	"database/sql"
	"github.com/its-a-feature/Mythic/utils/structs"
)

type TagType struct {
	ID                  int               `db:"id"`
	Name                string            `db:"name"`
	Color               string            `db:"color"`
	Description         string            `db:"description"`
	Operation           int               `db:"operation_id"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

type Tag struct {
	ID                  int               `db:"id"`
	TagTypeID           int               `db:"tagtype_id"`
	TagType             TagType           `db:"tagtype"`
	Data                MythicJSONText    `db:"data"`
	URL                 string            `db:"url"`
	Operation           int               `db:"operation_id"`
	Source              string            `db:"source"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	// various relations
	FileMeta     sql.NullInt64 `db:"filemeta_id"`
	MythicTree   sql.NullInt64 `db:"mythictree_id"`
	Credential   sql.NullInt64 `db:"credential_id"`
	Task         sql.NullInt64 `db:"task_id"`
	TaskArtifact sql.NullInt64 `db:"taskartifact_id"`
	Keylog       sql.NullInt64 `db:"keylog_id"`
	Response     sql.NullInt64 `db:"response_id"`
	Callback     sql.NullInt64 `db:"callback_id"`
	Payload      sql.NullInt64 `db:"payload_id"`
}
