package databaseStructs

import (
	"database/sql"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

var (
	AccountTypeUser = "user"
	AccountTypeBot  = "bot"
)

type Operator struct {
	ID                       int               `db:"id" json:"id,omitempty"`
	Username                 string            `db:"username" json:"username,omitempty"`
	Password                 string            `db:"password" json:"-"`
	Admin                    bool              `db:"admin" json:"admin,omitempty"`
	Salt                     string            `db:"salt" json:"-"`
	CreationTime             time.Time         `db:"creation_time" json:"creation_time,omitempty"`
	LastLogin                sql.NullTime      `db:"last_login" json:"last_login,omitempty"`
	FailedLoginCount         int               `db:"failed_login_count" json:"failed_login_count,omitempty"`
	LastFailedLoginTimestamp sql.NullTime      `db:"last_failed_login_timestamp" json:"last_failed_login_timestamp,omitempty"`
	Active                   bool              `db:"active" json:"active,omitempty"`
	ViewUtcTime              bool              `db:"view_utc_time" json:"view_utc_time,omitempty"`
	Deleted                  bool              `db:"deleted" json:"deleted,omitempty"`
	CurrentOperationID       sql.NullInt64     `db:"current_operation_id" json:"current_operation_id,omitempty"`
	CurrentOperation         Operation         `db:"operation" json:"operation,omitempty"`
	Secrets                  MythicJSONText    `db:"secrets" json:"secrets"`
	Preferences              MythicJSONText    `db:"preferences" json:"preferences"`
	AccountType              string            `db:"account_type" json:"account_type"`
	APITokensID              structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	Email                    sql.NullString    `db:"email" json:"email"`
}
