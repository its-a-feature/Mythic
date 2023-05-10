package databaseStructs

import (
	"database/sql"
	"time"
)

type Operationeventlog struct {
	ID          int           `db:"id"`
	OperatorID  sql.NullInt64 `db:"operator_id"`
	Timestamp   time.Time     `db:"timestamp"`
	Message     string        `db:"message"`
	OperationID int           `db:"operation_id"`
	Level       string        `db:"level"`
	Deleted     bool          `db:"deleted"`
	Resolved    bool          `db:"resolved"`
	Source      string        `db:"source"`
	Count       int           `db:"count"`
}
