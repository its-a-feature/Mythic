package databaseStructs

import (
	"time"
)

type Payloadcommand struct {
	ID           int       `db:"id"`
	PayloadID    int       `db:"payload_id"`
	CommandID    int       `db:"command_id"`
	Command      Command   `db:"command"`
	CreationTime time.Time `db:"creation_time"`
	Version      int       `db:"version"`
}
