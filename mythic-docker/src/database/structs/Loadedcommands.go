package databaseStructs

import (
	"time"
)

type Loadedcommands struct {
	ID         int       `db:"id"`
	CommandID  int       `db:"command_id"`
	Command    Command   `db:"command"`
	CallbackID int       `db:"callback_id"`
	Callback   Callback  `db:"callback"`
	OperatorID int       `db:"operator_id"`
	Timestamp  time.Time `db:"timestamp"`
	Version    int       `db:"version"`
}
