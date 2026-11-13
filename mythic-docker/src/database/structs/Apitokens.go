package databaseStructs

import (
	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
	"github.com/lib/pq"
	"time"
)

type Apitokens struct {
	ID                  int               `db:"id"`
	TokenType           string            `db:"token_type"`
	TokenValue          string            `db:"token_value"`
	Active              bool              `db:"active"`
	CreationTime        time.Time         `db:"creation_time"`
	OperatorID          int               `db:"operator_id"`
	OperationID         int               `db:"operation_id" json:"operation_id"`
	Operator            Operator          `db:"operator"`
	Name                string            `db:"name"`
	Scopes              pq.StringArray    `db:"scopes" json:"scopes" mapstructure:"scopes"`
	CreatedBy           int               `db:"created_by"`
	Deleted             bool              `db:"deleted"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	TaskID              structs.NullInt64 `db:"task_id" json:"task_id" mapstructure:"task_id"`
	CallbackID          structs.NullInt64 `db:"callback_id" json:"callback_id" mapstructure:"callback_id"`
	PayloadID           structs.NullInt64 `db:"payload_id" json:"payload_id" mapstructure:"payload_id"`
	ChatChannelID       structs.NullInt64 `db:"chat_channel_id" json:"chat_channel_id" mapstructure:"chat_channel_id"`
}

// AuthorizationPolicy keeps apitokens permissions beside its database model.
func (Apitokens) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "apitokens"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_APITOKEN_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_APITOKEN_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "created_by_operator", Target: Operator{}},
			{Name: "callback", Target: Callback{}},
			{Name: "chat_channel", Target: ChatChannel{}},
			{Name: "eventstepinstance", Target: EventStepInstance{}},
			{Name: "payload", Target: Payload{}},
			{Name: "task", Target: Task{}},
		},
	}
}
