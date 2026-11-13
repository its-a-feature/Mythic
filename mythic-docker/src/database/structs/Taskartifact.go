package databaseStructs

import (
	"database/sql"
	"time"

	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
)

type Taskartifact struct {
	ID                  int               `db:"id" json:"id" mapstructure:"id"`
	TaskID              sql.NullInt64     `db:"task_id" json:"task_id" mapstructure:"task_id"`
	Task                Task              `db:"task" json:"-"`
	Timestamp           time.Time         `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	Artifact            []byte            `db:"artifact" json:"artifact" mapstructure:"artifact"`
	BaseArtifact        string            `db:"base_artifact" json:"base_artifact" mapstructure:"base_artifact"`
	OperationID         int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation           Operation         `db:"operation" json:"-"`
	Host                string            `db:"host" json:"host" mapstructure:"host"`
	NeedsCleanup        bool              `db:"needs_cleanup" json:"needs_cleanup" mapstructure:"needs_cleanup"`
	Resolved            bool              `db:"resolved" json:"resolved" mapstructure:"resolved"`
	UpdatedAt           time.Time         `db:"updated_at" json:"updated_at" mapstructure:"updated_at"`
	APITokensID         structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	EventStepInstanceID structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
}

// AuthorizationPolicy keeps taskartifact permissions beside its database model.
func (Taskartifact) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table: authz.TableRef{Schema: "public", Name: "taskartifact"},
		OperationPaths: [][]string{
			{"operation_id"},
			{"task", "operation_id"},
		},
		Read:  authz.Rule{Permission: authz.SCOPE_TASK_READ},
		Write: authz.Rule{Permission: authz.SCOPE_TASK_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
			{Name: "eventstepinstance", Target: EventStepInstance{}},
		},
	}
}
