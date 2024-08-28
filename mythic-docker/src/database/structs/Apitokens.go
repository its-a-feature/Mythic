package databaseStructs

import (
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Apitokens struct {
	ID                  int               `db:"id"`
	TokenType           string            `db:"token_type"`
	TokenValue          string            `db:"token_value"`
	Active              bool              `db:"active"`
	CreationTime        time.Time         `db:"creation_time"`
	OperatorID          int               `db:"operator_id"`
	Operator            Operator          `db:"operator"`
	Name                string            `db:"name"`
	CreatedBy           int               `db:"created_by"`
	Deleted             bool              `db:"deleted"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	TaskID              structs.NullInt64 `db:"task_id" json:"task_id" mapstructure:"task_id"`
	CallbackID          structs.NullInt64 `db:"callback_id" json:"callback_id" mapstructure:"callback_id"`
	PayloadID           structs.NullInt64 `db:"payload_id" json:"payload_id" mapstructure:"payload_id"`
}
