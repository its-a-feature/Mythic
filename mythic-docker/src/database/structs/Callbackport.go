package databaseStructs

type Callbackport struct {
	ID          int    `db:"id"`
	CallbackID  int    `db:"callback_id"`
	OperationID int    `db:"operation_id"`
	TaskID      int    `db:"task_id"`
	Port        int    `db:"port"`
	PortType    string `db:"port_type"`
}
