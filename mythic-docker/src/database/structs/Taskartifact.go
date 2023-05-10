package databaseStructs

import (
	"time"
)

type Taskartifact struct {
	ID           int       `db:"id" json:"id" mapstructure:"id"`
	TaskID       int       `db:"task_id" json:"task_id" mapstructure:"task_id"`
	Task         Task      `db:"task" json:"-"`
	Timestamp    time.Time `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	Artifact     []byte    `db:"artifact" json:"artifact" mapstructure:"artifact"`
	BaseArtifact string    `db:"base_artifact" json:"base_artifact" mapstructure:"base_artifact"`
	OperationID  int       `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation    Operation `db:"operation" json:"-"`
	Host         string    `db:"host" json:"host" mapstructure:"host"`
}
