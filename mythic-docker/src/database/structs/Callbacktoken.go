package databaseStructs

import (
	"time"
)

type Callbacktoken struct {
	ID               int       `db:"id" json:"id"`
	TokenID          int       `db:"token_id" json:"token_id" `
	Token            Token     `db:"token" json:"token"`
	CallbackID       int       `db:"callback_id" json:"callback_id"`
	Os               string    `db:"os" json:"-"`
	TaskID           int       `db:"task_id" json:"task_id"`
	TimestampCreated time.Time `db:"timestamp_created" json:"timestamp_created"`
	Deleted          bool      `db:"deleted" json:"deleted"`
	Host             string    `db:"host" json:"host"`
}
