package databaseStructs

import "database/sql"

type TagType struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	Color       string `db:"color"`
	Description string `db:"description"`
	Operation   int    `db:"operation_id"`
}

type Tag struct {
	ID        int            `db:"id"`
	TagType   int            `db:"tagtype_id"`
	Data      MythicJSONText `db:"data"`
	URL       string         `db:"url"`
	Operation int            `db:"operation_id"`
	Source    string         `db:"source"`
	// various relations
	FileMeta     sql.NullInt64 `db:"filemeta_id"`
	MythicTree   sql.NullInt64 `db:"mythictree_id"`
	Process      sql.NullInt64 `db:"process_id"`
	Credential   sql.NullInt64 `db:"credential_id"`
	Task         sql.NullInt64 `db:"task_id"`
	TaskArtifact sql.NullInt64 `db:"taskartifact_id"`
	Keylog       sql.NullInt64 `db:"keylog_id"`
	Response     sql.NullInt64 `db:"response_id"`
}
