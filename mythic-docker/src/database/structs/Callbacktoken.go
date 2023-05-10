package databaseStructs

import (
	"time"
)

type Callbacktoken struct {
	ID               int       `db:"id"`
	TokenID          int       `db:"token_id"`
	CallbackID       int       `db:"callback_id"`
	Os               string    `db:"os"`
	TaskID           int       `db:"task_id"`
	TimestampCreated time.Time `db:"timestamp_created"`
	Deleted          bool      `db:"deleted"`
	Host             string    `db:"host"`
}
