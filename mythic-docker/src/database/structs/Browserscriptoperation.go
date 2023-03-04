package databaseStructs

type Browserscriptoperation struct {
	ID              int `db:"id"`
	BrowserscriptID int `db:"browserscript_id"`
	OperationID     int `db:"operation_id"`
}
