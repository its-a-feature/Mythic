package databaseStructs

// CustomBrowser is custombrowser table
type CustomBrowser struct {
	ID                     int             `db:"id"`
	Name                   string          `db:"name"`
	Description            string          `db:"description"`
	ContainerRunning       bool            `db:"container_running"`
	Author                 string          `db:"author"`
	Deleted                bool            `db:"deleted"`
	SemVer                 string          `db:"semver"`
	Type                   string          `db:"type"`
	Separator              string          `db:"separator"`
	Columns                MythicJSONArray `db:"columns"`
	DefaultVisibleColumns  MythicJSONArray `db:"default_visible_columns"`
	ExportFunction         string          `db:"export_function"`
	IndicatePartialListing bool            `db:"indicate_partial_listing"`
	ShowCurrentPath        bool            `db:"show_current_path"`
	RowActions             MythicJSONArray `db:"row_actions"`
	ExtraTableInputs       MythicJSONArray `db:"extra_table_inputs"`
}
