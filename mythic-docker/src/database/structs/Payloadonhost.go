package databaseStructs

import (
	"database/sql"
	"time"
)

type Payloadonhost struct {
	ID          int           `db:"id"`
	Host        string        `db:"host"`
	PayloadID   int           `db:"payload_id"`
	Deleted     bool          `db:"deleted"`
	OperationID int           `db:"operation_id"`
	Timestamp   time.Time     `db:"timestamp"`
	TaskID      sql.NullInt64 `db:"task_id"`
}
