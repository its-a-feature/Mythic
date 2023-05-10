package databaseStructs

import "time"

type Token struct {
	// mythic supplied
	ID          int       `db:"id"`
	TaskID      int       `db:"task_id"`
	Deleted     bool      `db:"deleted"`
	Host        string    `db:"host"`
	Description string    `db:"description"`
	OperationID int       `db:"operation_id"`
	Timestamp   time.Time `db:"timestamp"`
	// agent supplied
	TokenID            uint64 `db:"token_id"`
	User               string `db:"user"`
	Groups             string `db:"groups"`
	Privileges         string `db:"privileges"`
	ThreadID           int    `db:"thread_id"`
	ProcessID          int    `db:"process_id"`
	SessionID          int    `db:"session_id"`
	LogonSID           string `db:"logon_sid"`
	IntegrityLevelSID  string `db:"integrity_level_sid"`
	AppContainerSID    string `db:"app_container_sid"`
	AppContainerNumber int    `db:"app_container_number"`
	DefaultDacl        string `db:"default_dacl"`
	Restricted         bool   `db:"restricted"`
	Handle             int    `db:"handle"`
	Capabilities       string `db:"capabilities"`
}
