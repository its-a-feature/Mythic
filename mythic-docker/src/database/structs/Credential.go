package databaseStructs

import (
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Credential struct {
	ID          int               `db:"id" json:"id" mapstructure:"id"`
	Type        string            `db:"type" json:"type" mapstructure:"type"`
	TaskID      structs.NullInt64 `db:"task_id" json:"task_id,omitempty" mapstructure:"task_id"`
	Task        Task              `db:"task" json:"-"`
	Account     string            `db:"account" json:"account" mapstructure:"account"`
	Realm       string            `db:"realm" json:"realm" mapstructure:"realm"`
	OperationID int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation   Operation         `db:"operation" json:"-"`
	Timestamp   time.Time         `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	Credential  string            `db:"credential" json:"credential" mapstructure:"credential"`
	OperatorID  int               `db:"operator_id" json:"operator_id" mapstructure:"operator_id"`
	Operator    Operator          `db:"operator" json:"-"`
	Comment     string            `db:"comment" json:"comment" mapstructure:"comment"`
	Deleted     bool              `db:"deleted" json:"deleted" mapstructure:"deleted"`
	Metadata    string            `db:"metadata" json:"metadata" mapstructure:"metadata"`
	APITokensID structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}
