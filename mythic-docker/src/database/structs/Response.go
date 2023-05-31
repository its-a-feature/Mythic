package databaseStructs

import (
	"database/sql"
	"time"
)

type Response struct {
	ID             int           `db:"id"`
	Response       []byte        `db:"response"`
	Timestamp      time.Time     `db:"timestamp"`
	TaskID         int           `db:"task_id"`
	Task           Task          `db:"task"`
	SequenceNumber sql.NullInt64 `db:"sequence_number"`
	OperationID    int           `db:"operation_id"`
	Operation      Operation     `db:"operation"`
}
