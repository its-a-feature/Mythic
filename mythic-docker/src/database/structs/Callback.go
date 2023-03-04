package databaseStructs

import (
	"github.com/its-a-feature/Mythic/utils/structs"
	"time"
)

type Callback struct {
	ID                  int               `db:"id" json:"id"`
	DisplayID           int               `db:"display_id" json:"display_id"`
	AgentCallbackID     string            `db:"agent_callback_id" json:"agent_callback_id"`
	InitCallback        time.Time         `db:"init_callback" json:"init_callback"`
	LastCheckin         time.Time         `db:"last_checkin" json:"last_checkin"`
	User                string            `db:"user" json:"user"`
	Host                string            `db:"host" json:"host"`
	PID                 int               `db:"pid" json:"pid"`
	Ip                  string            `db:"ip" json:"ip"`
	ExternalIp          string            `db:"external_ip" json:"external_ip"`
	ProcessName         string            `db:"process_name" json:"process_name"`
	Description         string            `db:"description" json:"description"`
	OperatorID          int               `db:"operator_id" json:"operator_id"`
	Operator            Operator          `db:"operator" json:"-"`
	Active              bool              `db:"active" json:"active"`
	RegisteredPayloadID int               `db:"registered_payload_id" json:"registered_payload_id"`
	Payload             Payload           `db:"payload" json:"-"`
	IntegrityLevel      int               `db:"integrity_level" json:"integrity_level"`
	Locked              bool              `db:"locked" json:"locked"`
	LockedOperatorID    structs.NullInt64 `db:"locked_operator_id" json:"locked_operator_id"`
	OperationID         int               `db:"operation_id" json:"operation_id"`
	Operation           Operation         `db:"operation" json:"-"`
	CryptoType          string            `db:"crypto_type" json:"crypto_type"`
	DecKey              *[]byte           `db:"dec_key" json:"dec_key"`
	EncKey              *[]byte           `db:"enc_key" json:"enc_key"`
	Os                  string            `db:"os" json:"os"`
	Architecture        string            `db:"architecture" json:"architecture"`
	Domain              string            `db:"domain" json:"domain"`
	ExtraInfo           string            `db:"extra_info" json:"extra_info"`
	SleepInfo           string            `db:"sleep_info" json:"sleep_info"`
	Timestamp           time.Time         `db:"timestamp" json:"timestamp"`
}
