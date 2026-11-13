package databaseStructs

import (
	"time"

	authz "github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/utils/structs"
)

type Credential struct {
	ID            int               `db:"id" json:"id" mapstructure:"id"`
	Type          string            `db:"type" json:"type" mapstructure:"type"`
	Subtype       string            `db:"subtype" json:"subtype" mapstructure:"subtype"`
	TaskID        structs.NullInt64 `db:"task_id" json:"task_id,omitempty" mapstructure:"task_id"`
	Task          Task              `db:"task" json:"-"`
	Account       string            `db:"account" json:"account" mapstructure:"account"`
	Realm         string            `db:"realm" json:"realm" mapstructure:"realm"`
	OperationID   int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation     Operation         `db:"operation" json:"-"`
	Timestamp     time.Time         `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	Credential    string            `db:"credential" json:"credential" mapstructure:"credential"`
	OperatorID    int               `db:"operator_id" json:"operator_id" mapstructure:"operator_id"`
	Operator      Operator          `db:"operator" json:"-"`
	Comment       string            `db:"comment" json:"comment" mapstructure:"comment"`
	Deleted       bool              `db:"deleted" json:"deleted" mapstructure:"deleted"`
	Metadata      MythicJSONText    `db:"metadata" json:"metadata" mapstructure:"metadata"`
	Identity      MythicJSONText    `db:"credential_identity" json:"credential_identity" mapstructure:"credential_identity"`
	CustomDisplay string            `db:"custom_display" json:"custom_display" mapstructure:"custom_display"`
	APITokensID   structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
}

// AuthorizationPolicy keeps credential permissions beside its database model.
func (Credential) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "credential"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_CREDENTIAL_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_CREDENTIAL_WRITE},
		// Comment/uncomment this block to disable/enable the extra value grant.
		// Then run make build_authorization and rebuild/deploy server + metadata.
		// Read/write grants stay independent of credential.value.read.
		FieldReads: []authz.FieldReadRule{
			//{Fields: CredentialValueFields, Permission: authz.SCOPE_CREDENTIAL_VALUE_READ},
		},
		Relationships: []authz.RelationshipBinding{
			{Name: "apitoken", Target: Apitokens{}},
		},
	}
}

// CredentialValueFields protects the stored value and its computed text form.
// The raw GraphQL alias and direct Go response names come from metadata/tags.
var CredentialValueFields = []authz.FieldRef{
	{Column: "credential"},
	{ComputedField: "credential_text"},
}
