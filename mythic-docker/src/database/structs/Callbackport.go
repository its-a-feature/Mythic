package databaseStructs

import "time"

type Callbackport struct {
	ID            int       `db:"id"`
	CallbackID    int       `db:"callback_id"`
	OperationID   int       `db:"operation_id"`
	TaskID        int       `db:"task_id"`
	LocalPort     int       `db:"local_port"`
	PortType      string    `db:"port_type"`
	RemotePort    int       `db:"remote_port"`
	RemoteIP      string    `db:"remote_ip"`
	Deleted       bool      `db:"deleted"`
	BytesReceived int64     `db:"bytes_received"`
	BytesSent     int64     `db:"bytes_sent"`
	Username      string    `db:"username"`
	Password      string    `db:"password"`
	UpdatedAt     time.Time `db:"updated_at"`
}
