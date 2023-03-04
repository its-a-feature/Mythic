package databaseStructs

import (
	"database/sql"
	"time"
)

type Operatoroperation struct {
	ID                      int                     `db:"id"`
	OperatorID              int                     `db:"operator_id"`
	CurrentOperator         Operator                `db:"operator"`
	OperationID             int                     `db:"operation_id"`
	CurrentOperation        Operation               `db:"operation"`
	Timestamp               time.Time               `db:"timestamp"`
	BaseDisabledCommandsID  sql.NullInt64           `db:"base_disabled_commands_id"`
	DisabledCommandsProfile Disabledcommandsprofile `db:"disabledcommandsprofile"`
	ViewMode                string                  `db:"view_mode"`
}
