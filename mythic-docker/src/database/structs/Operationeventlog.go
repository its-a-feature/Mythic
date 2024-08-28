package databaseStructs

import (
	"database/sql"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Operationeventlog struct {
	ID          int               `db:"id"`
	OperatorID  sql.NullInt64     `db:"operator_id"`
	Timestamp   time.Time         `db:"timestamp"`
	Message     string            `db:"message"`
	OperationID int               `db:"operation_id"`
	Level       string            `db:"level"`
	Deleted     bool              `db:"deleted"`
	Resolved    bool              `db:"resolved"`
	Source      string            `db:"source"`
	Count       int               `db:"count"`
	APITokensID structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}
