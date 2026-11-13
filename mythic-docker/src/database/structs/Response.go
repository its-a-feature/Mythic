package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Response struct {
	ID                  int               `db:"id"`
	Response            []byte            `db:"response"`
	Timestamp           time.Time         `db:"timestamp"`
	TaskID              int               `db:"task_id"`
	Task                Task              `db:"task"`
	SequenceNumber      sql.NullInt64     `db:"sequence_number"`
	OperationID         int               `db:"operation_id"`
	Operation           Operation         `db:"operation"`
	IsError             bool              `db:"is_error"`
	InteractiveTaskType structs.NullInt64 `db:"interactive_task_type" json:"interactive_task_type" mapstructure:"interactive_task_type"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

// AuthorizationPolicy keeps response permissions beside its database model.
func (Response) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "response"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_RESPONSE_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_RESPONSE_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
			{Name: "eventstepinstance", Target: EventStepInstance{}},
		},
	}
}
