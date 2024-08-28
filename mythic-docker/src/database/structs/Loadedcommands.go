package databaseStructs

import (
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Loadedcommands struct {
	ID          int               `db:"id"`
	CommandID   int               `db:"command_id"`
	Command     Command           `db:"command"`
	CallbackID  int               `db:"callback_id"`
	Callback    Callback          `db:"callback"`
	OperatorID  int               `db:"operator_id"`
	Timestamp   time.Time         `db:"timestamp"`
	Version     int               `db:"version"`
	APITokensID structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}
