package databaseStructs

import (
	"time"

	"github.com/its-a-feature/Mythic/utils/structs"
)

type OperatorAlias struct {
	ID                   int                `db:"id" json:"id"`
	OperatorID           int                `db:"operator_id" json:"operator_id"`
	Operator             Operator           `db:"operator" json:"operator,omitempty"`
	SlashCommand         string             `db:"slash_command" json:"slash_command"`
	ActualCommand        string             `db:"actual_command" json:"actual_command"`
	PayloadTypeID        structs.NullInt64  `db:"payloadtype_id" json:"payloadtype_id"`
	Payloadtype          Payloadtype        `db:"payloadtype" json:"payloadtype,omitempty"`
	ConsumingContainerID structs.NullInt64  `db:"consuming_container_id" json:"consuming_container_id"`
	ConsumingContainer   ConsumingContainer `db:"consuming_container" json:"consuming_container,omitempty"`
	Active               bool               `db:"active" json:"active"`
	CreatedAt            time.Time          `db:"created_at" json:"created_at"`
	UpdatedAt            time.Time          `db:"updated_at" json:"updated_at"`
}
