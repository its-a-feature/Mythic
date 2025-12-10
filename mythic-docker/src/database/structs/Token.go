package databaseStructs

import "time"

type Token struct {
	// mythic supplied
	ID          int       `db:"id" json:"id"`
	TaskID      int       `db:"task_id" json:"task_id"`
	Deleted     bool      `db:"deleted" json:"deleted"`
	Host        string    `db:"host" json:"host"`
	Description *string   `db:"description" json:"description"`
	OperationID int       `db:"operation_id" json:"operation_id"`
	Timestamp   time.Time `db:"timestamp" json:"timestamp"`
	// agent supplied
	TokenID            int64  `db:"token_id" json:"token_id"`
	User               string `db:"user" json:"user"`
	Groups             string `db:"groups" json:"groups"`
	Privileges         string `db:"privileges" json:"privileges"`
	ThreadID           int    `db:"thread_id" json:"thread_id"`
	ProcessID          int    `db:"process_id" json:"process_id"`
	SessionID          int    `db:"session_id" json:"session_id"`
	LogonSID           string `db:"logon_sid" json:"logon_sid"`
	IntegrityLevelSID  string `db:"integrity_level_sid" json:"integrity_level_sid"`
	AppContainerSID    string `db:"app_container_sid" json:"app_container_sid"`
	AppContainerNumber int    `db:"app_container_number" json:"app_container_number"`
	DefaultDacl        string `db:"default_dacl" json:"default_dacl"`
	Restricted         bool   `db:"restricted" json:"restricted"`
	Handle             int    `db:"handle" json:"handle"`
	Capabilities       string `db:"capabilities" json:"capabilities"`
}
