package databaseStructs

import (
	authz "github.com/its-a-feature/Mythic/authorization"
	"time"
)

type Callbackport struct {
	ID            int       `db:"id"`
	CallbackID    int       `db:"callback_id"`
	Callback      Callback  `db:"callback"`
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

// AuthorizationPolicy keeps callbackport permissions beside its database model.
func (Callbackport) AuthorizationPolicy() authz.ResourcePolicy {
	return authz.ResourcePolicy{
		Table:         authz.TableRef{Schema: "public", Name: "callbackport"},
		OperationPath: []string{"operation_id"},
		Read:          authz.Rule{Permission: authz.SCOPE_CALLBACK_READ},
		Write:         authz.Rule{Permission: authz.SCOPE_CALLBACK_WRITE},
		Relationships: []authz.RelationshipBinding{
			{Name: "operation", Target: Operation{}},
			{Name: "task", Target: Task{}},
		},
	}
}
