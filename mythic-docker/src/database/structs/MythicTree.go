package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
	"time"

	"github.com/its-a-feature/Mythic/utils/structs"
)

type MythicTree struct {
	ID              int               `db:"id" mapstructure:"id"`
	TaskID          int               `db:"task_id" mapstructure:"task_id"`
	CallbackID      structs.NullInt64 `db:"callback_id" mapstructure:"callback_id"`
	Callback        Callback          `db:"callback" mapstructure:"callback"`
	Timestamp       time.Time         `db:"timestamp" mapstructure:"timestamp"`
	OperationID     int               `db:"operation_id" mapstructure:"operation_id"`
	Host            string            `db:"host" mapstructure:"host"`
	Name            []byte            `db:"name" mapstructure:"name"`
	ParentPath      []byte            `db:"parent_path" mapstructure:"parent_path"`
	FullPath        []byte            `db:"full_path" mapstructure:"full_path"`
	Comment         string            `db:"comment" mapstructure:"comment"`
	CanHaveChildren bool              `db:"can_have_children" mapstructure:"can_have_children"`
	HasChildren     bool              `db:"has_children" mapstructure:"has_children"`
	DisplayPath     []byte            `db:"display_path" mapstructure:"display_path"`
	Success         sql.NullBool      `db:"success"`
	Deleted         bool              `db:"deleted" mapstructure:"deleted"`
	Metadata        MythicJSONText    `db:"metadata"`
	TreeType        string            `db:"tree_type" mapstructure:"tree_type"`
	Os              string            `db:"os" mapstructure:"os"`
	APITokensID     structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

const TREE_TYPE_FILE string = "file"
const TREE_TYPE_PROCESS string = "process"

// AuthorizationPolicy keeps mythictree permissions beside its database model.
func (MythicTree) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "mythictree"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_BROWSER_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_BROWSER_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
			{Name: "operation", Target: Operation{}},
			{Name: "task", Target: Task{}},
		},
	}
}
