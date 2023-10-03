package databaseStructs

import (
	"database/sql"
)

type PayloadBuildStep struct {
	ID              int           `db:"id"`
	PayloadID       sql.NullInt64 `db:"payload_id"`
	Payload         Payload       `db:"payload"`
	PayloadTypeID   sql.NullInt64 `db:"payloadtype_id"`
	StepNumber      int           `db:"step_number"`
	StepStdout      string        `db:"step_stdout"`
	StepStderr      string        `db:"step_stderr"`
	StepName        string        `db:"step_name"`
	StepDescription string        `db:"step_description"`
	StartTime       sql.NullTime  `db:"start_time"`
	EndTime         sql.NullTime  `db:"end_time"`
	Success         bool          `db:"step_success"`
	StepSkip        bool          `db:"step_skip"`
}
