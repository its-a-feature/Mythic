package databaseStructs

import (
	"database/sql"
	"time"
)

type MythicTree struct {
	ID              int            `db:"id"`
	TaskID          int            `db:"task_id"`
	Timestamp       time.Time      `db:"timestamp"`
	OperationID     int            `db:"operation_id"`
	Host            string         `db:"host"`
	Name            []byte         `db:"name"`
	ParentPath      []byte         `db:"parent_path"`
	FullPath        []byte         `db:"full_path"`
	Comment         string         `db:"comment"`
	CanHaveChildren bool           `db:"can_have_children"`
	Success         sql.NullBool   `db:"success"`
	Deleted         bool           `db:"deleted"`
	Metadata        MythicJSONText `db:"metadata"`
	TreeType        string         `db:"tree_type"`
	Os              string         `db:"os"`
}

const TREE_TYPE_FILE string = "file"
const TREE_TYPE_PROCESS string = "process"
