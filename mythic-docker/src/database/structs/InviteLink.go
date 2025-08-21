package databaseStructs

import (
	"database/sql"
	"time"
)

type InviteLink struct {
	ID            int            `db:"id"`
	OperationID   sql.NullInt64  `db:"operation_id"`
	OperationRole sql.NullString `db:"operation_role"`
	TotalUses     int            `db:"total_uses"`
	TotalUsed     int            `db:"total_used"`
	Name          string         `db:"name"`
	ShortCode     string         `db:"short_code"`
	OperatorID    int            `db:"operator_id"`
	CreatedAt     time.Time      `db:"created_at"`
	Operator      Operator       `db:"operator" json:"-"`
}
