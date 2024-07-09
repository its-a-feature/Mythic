package databaseStructs

import (
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Keylog struct {
	ID          int               `db:"id" json:"id" mapstructure:"id"`
	TaskID      int               `db:"task_id" json:"task_id" mapstructure:"task_id"`
	Task        Task              `db:"task" json:"-"`
	Keystrokes  []byte            `db:"keystrokes" json:"keystrokes" mapstructure:"keystrokes"`
	Window      string            `db:"window" json:"window" mapstructure:"window"`
	Timestamp   time.Time         `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	OperationID int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation   Operation         `db:"operation" json:"-"`
	User        string            `db:"user" json:"user" mapstructure:"user"`
	APITokensID structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}
