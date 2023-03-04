package databaseStructs

type Disabledcommandsprofile struct {
	ID          int    `db:"id"`
	Name        string `db:"name"`
	CommandID   int    `db:"command_id"`
	OperationID int    `db:"operation_id"`
}
