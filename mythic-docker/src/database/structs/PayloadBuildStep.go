package databaseStructs

import (
	"database/sql"
	authz "github.com/its-a-feature/Mythic/authorization"
)

type PayloadBuildStep struct {
	ID              int           `db:"id"`
	PayloadID       sql.NullInt64 `db:"payload_id"`
	Payload         Payload       `db:"payload"`
	PayloadTypeID   sql.NullInt64 `db:"payloadtype_id"`
	StepNumber      int           `db:"step_number"`
	StepStdout      string        `db:"step_stdout"`
	StepStderr      string        `db:"step_stderr"`
	StepName        string        `db:"step_name"`
	StepDescription string        `db:"step_description"`
	StartTime       sql.NullTime  `db:"start_time"`
	EndTime         sql.NullTime  `db:"end_time"`
	Success         bool          `db:"step_success"`
	StepSkip        bool          `db:"step_skip"`
}

// AuthorizationPolicy keeps payload_build_step permissions beside its database model.
func (PayloadBuildStep) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "payload_build_step"},
		OperationPath: []string{"payload", "operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_PAYLOAD_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_PAYLOAD_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "payloadtype", Target: Payloadtype{}},
		},
	}
}
