package databaseStructs

import (
	"database/sql"
	"time"
)

type EventGroup struct {
	ID               int             `db:"id" json:"id" toml:"id" yaml:"id"`
	OperatorID       int             `db:"operator_id" json:"operator_id" toml:"operator_id" yaml:"operator_id"`
	OperationID      int             `db:"operation_id" json:"operation_id" toml:"operation_id" yaml:"operation_id"`
	FileMetaID       int             `db:"filemeta_id" json:"filemeta_id" toml:"filemeta_id" yaml:"filemeta_id"`
	Filemeta         Filemeta        `db:"filemeta" json:"-" toml:"-" yaml:"-"`
	Name             string          `db:"name" json:"name" toml:"name" yaml:"name"`
	Description      string          `db:"description" json:"description" toml:"description" yaml:"description"`
	Trigger          string          `db:"trigger" json:"trigger" toml:"trigger" yaml:"trigger"`
	TriggerData      MythicJSONText  `db:"trigger_data" json:"trigger_data" toml:"trigger_data" yaml:"trigger_data,flow"`
	Active           bool            `db:"active" json:"active" toml:"active" yaml:"active"`
	Deleted          bool            `db:"deleted" json:"deleted" toml:"deleted" yaml:"deleted"`
	Environment      MythicJSONText  `db:"environment" json:"environment" toml:"environment" yaml:"environment,flow"`
	Keywords         MythicJSONArray `db:"keywords" json:"keywords" toml:"keywords" yaml:"keywords,flow"`
	CreatedAt        time.Time       `db:"created_at" json:"created_at" toml:"created_at" yaml:"created_at"`
	UpdatedAt        time.Time       `db:"updated_at" json:"updated_at" toml:"updated_at" yaml:"updated_at"`
	TotalSteps       int             `db:"total_steps" json:"total_steps"`
	Steps            []EventStep     `db:"eventstep" json:"steps" toml:"steps" yaml:"steps"`
	TotalOrderSteps  int             `db:"total_order_steps" json:"total_order_steps"`
	RunAs            string          `db:"run_as" json:"run_as" toml:"run_as" yaml:"run_as"`
	ApprovedToRun    bool            `db:"approved_to_run" json:"approved_to_run"`
	NextScheduledRun sql.NullTime    `db:"next_scheduled_run" json:"next_scheduled_run"`
}

type EventGroupConsumingContainer struct {
	ID                     int                `db:"id" json:"id" toml:"id" yaml:"id"`
	EventGroupID           int                `db:"eventgroup_id" json:"eventgroup_id" toml:"eventgroup_id" yaml:"eventgroup_id"`
	ConsumingContainerID   sql.NullInt64      `db:"consuming_container_id" json:"consuming_container_id" toml:"consuming_container_id" yaml:"consuming_container_id"`
	ConsumingContainerName string             `db:"consuming_container_name" json:"consuming_container_name" toml:"consuming_container_name" yaml:"consuming_container_name"`
	FunctionNames          MythicJSONArray    `db:"function_names" json:"function_names" toml:"function_names" yaml:"function_names,flow"`
	AllFunctionsAvailable  bool               `db:"all_functions_available" json:"all_functions_available" toml:"functions_available" yaml:"all_functions_available"`
	EventGroup             EventGroup         `db:"eventgroup"`
	ConsumingContainer     ConsumingContainer `db:"consuming_container"`
}

type EventGroupInstance struct {
	ID               int            `db:"id" json:"id" toml:"id" yaml:"id"`
	EventGroupID     int            `db:"eventgroup_id" json:"eventgroup_id" toml:"eventgroup_id" yaml:"eventgroup_id"`
	EventGroup       EventGroup     `db:"eventgroup"`
	OperatorID       int            `db:"operator_id" json:"operator_id" toml:"operator_id" yaml:"operator_id"`
	OperationID      int            `db:"operation_id" json:"operation_id" toml:"operation_id" yaml:"operation_id"`
	Environment      MythicJSONText `db:"environment" json:"environment" toml:"environment" yaml:"environment,flow"`
	Status           string         `db:"status" json:"status" toml:"status" yaml:"status"`
	CreatedAt        time.Time      `db:"created_at" json:"created_at" toml:"created_at" yaml:"created_at"`
	UpdatedAt        time.Time      `db:"updated_at" json:"updated_at" toml:"updated_at" yaml:"updated_at"`
	EndTimestamp     sql.NullTime   `db:"end_timestamp" json:"end_timestamp" toml:"end_timestamp" yaml:"end_timestamp"`
	Trigger          string         `db:"trigger" json:"trigger" toml:"trigger" yaml:"trigger"`
	CurrentOrderStep int            `db:"current_order_step" json:"current_order_step"`
	TotalOrderSteps  int            `db:"total_order_steps" json:"total_order_steps"`
	CancelledBy      sql.NullInt64  `db:"cancelled_by" json:"cancelled_by"`
	TriggerMetadata  MythicJSONText `db:"trigger_metadata" json:"trigger_metadata" toml:"trigger_metadata" yaml:"trigger_metadata,flow"`
}

type EventGroupApproval struct {
	ID           int       `db:"id" json:"id" toml:"id" yaml:"id"`
	EventGroupID int       `db:"eventgroup_id" json:"eventgroup_id" toml:"eventgroup_id" yaml:"eventgroup_id"`
	OperatorID   int       `db:"operator_id" json:"operator_id" toml:"operator_id" yaml:"operator_id"`
	OperationID  int       `db:"operation_id" json:"operation_id" toml:"operation_id" yaml:"operation_id"`
	Approved     bool      `db:"approved" json:"approved" toml:"approved" yaml:"approved"`
	CreatedAt    time.Time `db:"created_at" json:"created_at" toml:"created_at" yaml:"created_at"`
	UpdatedAt    time.Time `db:"updated_at" json:"updated_at" toml:"updated_at" yaml:"updated_at"`
}
