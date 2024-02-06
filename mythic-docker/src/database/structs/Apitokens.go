package databaseStructs

import (
	"time"
)

type Apitokens struct {
	ID           int       `db:"id"`
	TokenType    string    `db:"token_type"`
	TokenValue   string    `db:"token_value"`
	Active       bool      `db:"active"`
	CreationTime time.Time `db:"creation_time"`
	OperatorID   int       `db:"operator_id"`
	Operator     Operator  `db:"operator"`
}
