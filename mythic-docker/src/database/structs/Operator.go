package databaseStructs

import (
	"database/sql"
	"time"
)

type Operator struct {
	ID                       int           `db:"id"`
	Username                 string        `db:"username"`
	Password                 string        `db:"password" json:"-"`
	Admin                    bool          `db:"admin"`
	Salt                     string        `db:"salt" json:"-"`
	CreationTime             time.Time     `db:"creation_time"`
	LastLogin                sql.NullTime  `db:"last_login"`
	FailedLoginCount         int           `db:"failed_login_count"`
	LastFailedLoginTimestamp sql.NullTime  `db:"last_failed_login_timestamp"`
	Active                   bool          `db:"active"`
	ViewUtcTime              bool          `db:"view_utc_time"`
	Deleted                  bool          `db:"deleted"`
	CurrentOperationID       sql.NullInt64 `db:"current_operation_id"`
	CurrentOperation         Operation     `db:"operation"`
}
