package databaseStructs

import (
	"time"

	"github.com/its-a-feature/Mythic/utils/structs"
)

const (
	C2ProfileFileHostStatusActive   = "active"
	C2ProfileFileHostStatusError    = "error"
	C2ProfileFileHostStatusUpdating = "updating"
	C2ProfileFileHostStatusStopped  = "stopped"
)

type C2profileFileHost struct {
	ID                  int               `db:"id" json:"id" mapstructure:"id"`
	OperationID         int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation           Operation         `db:"operation" json:"-"`
	FileMetaID          int               `db:"filemeta_id" json:"filemeta_id" mapstructure:"filemeta_id"`
	FileMeta            Filemeta          `db:"filemeta" json:"filemeta" mapstructure:"filemeta"`
	C2ProfileID         int               `db:"c2_profile_id" json:"c2_profile_id" mapstructure:"c2_profile_id"`
	C2Profile           C2profile         `db:"c2profile" json:"c2profile" mapstructure:"c2profile"`
	HostURL             string            `db:"host_url" json:"host_url" mapstructure:"host_url"`
	AlertOnDownload     bool              `db:"alert_on_download" json:"alert_on_download" mapstructure:"alert_on_download"`
	Status              string            `db:"status" json:"status" mapstructure:"status"`
	Error               string            `db:"error" json:"error" mapstructure:"error"`
	CreatedBy           int               `db:"created_by" json:"created_by" mapstructure:"created_by"`
	CreatedByOperator   Operator          `db:"created_by_operator" json:"created_by_operator" mapstructure:"created_by_operator"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	APIToken            Apitokens         `db:"apitoken" json:"apitoken"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	EventStepInstance   EventStepInstance `db:"eventstepinstance" json:"eventstepinstance"`
	UpdatedAt           time.Time         `db:"updated_at" json:"updated_at" mapstructure:"updated_at"`
}
