package databaseStructs

import (
	"database/sql"
	"time"
)

type EventStep struct {
	ID              int             `db:"id" json:"id" toml:"id" yaml:"id"`
	EventGroup      int             `db:"eventgroup_id" json:"eventgroup_id" toml:"eventgroup_id" yaml:"eventgroup_id"`
	OperatorID      int             `db:"operator_id" json:"operator_id" toml:"operator_id" yaml:"operator_id"`
	OperationID     int             `db:"operation_id" json:"operation_id" toml:"operation_id" yaml:"operation_id"`
	Name            string          `db:"name" json:"name" toml:"name" yaml:"name"`
	Description     string          `db:"description" json:"description" toml:"description" yaml:"description"`
	DependsOn       MythicJSONArray `db:"depends_on" json:"depends_on" toml:"depends_on" yaml:"depends_on,flow"`
	Action          string          `db:"action" json:"action" toml:"action" yaml:"action"`
	ActionData      MythicJSONText  `db:"action_data" json:"action_data" toml:"action_data" yaml:"action_data,flow"`
	Environment     MythicJSONText  `db:"environment" json:"environment" toml:"environment" yaml:"environment,flow"`
	Inputs          MythicJSONText  `db:"inputs" json:"inputs" toml:"inputs" yaml:"inputs,flow"`
	Outputs         MythicJSONText  `db:"outputs" json:"outputs" toml:"outputs" yaml:"outputs,flow"`
	Order           int             `db:"order" json:"order" toml:"order" yaml:"order"`
	ContinueOnError bool            `db:"continue_on_error" json:"continue_on_error" toml:"continue_on_error" yaml:"continue_on_error"`
	CreatedAt       time.Time       `db:"created_at" json:"created_at" toml:"created_at" yaml:"created_at"`
}

type EventStepInstance struct {
	ID                   int                `db:"id" json:"id" toml:"id" yaml:"id"`
	EventGroupInstanceID int                `db:"eventgroupinstance_id" json:"eventgroupinstance_id" toml:"eventgroupinstance_id" yaml:"eventgroupinstance_id"`
	EventStepID          int                `db:"eventstep_id" json:"eventstep_id" toml:"eventstep_id" yaml:"eventstep_id"`
	OperatorID           int                `db:"operator_id" json:"operator_id" toml:"operator_id" yaml:"operator_id"`
	OperationID          int                `db:"operation_id" json:"operation_id" toml:"operation_id" yaml:"operation_id"`
	Environment          MythicJSONText     `db:"environment" json:"environment" toml:"environment" yaml:"environment,flow"`
	Inputs               MythicJSONText     `db:"inputs" json:"inputs" toml:"inputs" yaml:"inputs,flow"`
	Outputs              MythicJSONText     `db:"outputs" json:"outputs" toml:"outputs" yaml:"outputs,flow"`
	CreatedAt            time.Time          `db:"created_at" json:"created_at" toml:"created_at" yaml:"created_at"`
	UpdatedAt            time.Time          `db:"updated_at" json:"updated_at" toml:"updated_at" yaml:"updated_at"`
	EndTimestamp         sql.NullTime       `db:"end_timestamp" json:"end_timestamp" toml:"end_timestamp" yaml:"end_timestamp"`
	Status               string             `db:"status" json:"status" toml:"status" yaml:"status"`
	Stdout               string             `db:"stdout" json:"stdout" toml:"stdout" yaml:"stdout"`
	Stderr               string             `db:"stderr" json:"stderr" toml:"stderr" yaml:"stderr"`
	Order                int                `db:"order" json:"order" toml:"order" yaml:"order"`
	ContinueOnError      bool               `db:"continue_on_error" json:"continue_on_error" toml:"continue_on_error" yaml:"continue_on_error"`
	ActionData           MythicJSONText     `db:"action_data" json:"action_data" toml:"action_data" yaml:"action_data,flow"`
	EventStep            EventStep          `db:"eventstep"`
	EventGroupInstance   EventGroupInstance `db:"eventgroupinstance"`
}
