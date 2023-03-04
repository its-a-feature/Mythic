package databaseStructs

import (
	"database/sql"
	"time"
)

type Browserscript struct {
	ID                     int           `db:"id"`
	OperatorID             sql.NullInt64 `db:"operator_id"`
	Script                 string        `db:"script"`
	CommandID              int           `db:"command_id"`
	PayloadTypeID          int           `db:"payload_type_id"`
	CreationTime           time.Time     `db:"creation_time"`
	Active                 bool          `db:"active"`
	Author                 string        `db:"author"`
	UserModified           bool          `db:"user_modified"`
	ContainerVersion       string        `db:"container_version"`
	ContainerVersionAuthor string        `db:"container_version_author"`
	ForNewUi               bool          `db:"for_new_ui"`
}
