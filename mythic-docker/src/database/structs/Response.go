package databaseStructs

import (
	"database/sql"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Response struct {
	ID                  int               `db:"id"`
	Response            []byte            `db:"response"`
	Timestamp           time.Time         `db:"timestamp"`
	TaskID              int               `db:"task_id"`
	Task                Task              `db:"task"`
	SequenceNumber      sql.NullInt64     `db:"sequence_number"`
	OperationID         int               `db:"operation_id"`
	Operation           Operation         `db:"operation"`
	IsError             bool              `db:"is_error"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}
