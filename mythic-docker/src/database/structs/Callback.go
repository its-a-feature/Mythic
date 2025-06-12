package databaseStructs

import (
	"github.com/its-a-feature/Mythic/utils/structs"
	"github.com/lib/pq"
	"time"
)

type Callback struct {
	ID                        int               `db:"id" json:"id" mapstructure:"id"`
	DisplayID                 int               `db:"display_id" json:"display_id" mapstructure:"display_id"`
	AgentCallbackID           string            `db:"agent_callback_id" json:"agent_callback_id" mapstructure:"agent_callback_id"`
	InitCallback              time.Time         `db:"init_callback" json:"init_callback" mapstructure:"init_callback"`
	LastCheckin               time.Time         `db:"last_checkin" json:"last_checkin" mapstructure:"last_checkin"`
	User                      string            `db:"user" json:"user" mapstructure:"user"`
	Host                      string            `db:"host" json:"host" mapstructure:"host"`
	PID                       int               `db:"pid" json:"pid" mapstructure:"pid"`
	IP                        string            `db:"ip" json:"ip" mapstructure:"ip"`
	ExternalIp                string            `db:"external_ip" json:"external_ip" mapstructure:"external_ip"`
	ProcessName               string            `db:"process_name" json:"process_name" mapstructure:"process_name"`
	ProcessShortName          string            `db:"process_short_name" json:"process_short_name" mapstructure:"process_short_name"`
	Description               string            `db:"description" json:"description" mapstructure:"description"`
	OperatorID                int               `db:"operator_id" json:"operator_id" mapstructure:"operator_id"`
	Operator                  Operator          `db:"operator" json:"-"`
	Active                    bool              `db:"active" json:"active" mapstructure:"active"`
	RegisteredPayloadID       int               `db:"registered_payload_id" json:"registered_payload_id" mapstructure:"registered_payload_id"`
	Payload                   Payload           `db:"payload" json:"-"`
	IntegrityLevel            int               `db:"integrity_level" json:"integrity_level" mapstructure:"integrity_level"`
	Locked                    bool              `db:"locked" json:"locked" mapstructure:"locked"`
	LockedOperatorID          structs.NullInt64 `db:"locked_operator_id" json:"locked_operator_id,omitempty"`
	OperationID               int               `db:"operation_id" json:"operation_id" mapstructure:"operation_id"`
	Operation                 Operation         `db:"operation" json:"-"`
	CryptoType                string            `db:"crypto_type" json:"crypto_type" mapstructure:"crypto_type"`
	DecKey                    *[]byte           `db:"dec_key" json:"dec_key" mapstructure:"dec_key"`
	EncKey                    *[]byte           `db:"enc_key" json:"enc_key" mapstructure:"enc_key"`
	Os                        string            `db:"os" json:"os" mapstructure:"os"`
	Architecture              string            `db:"architecture" json:"architecture" mapstructure:"architecture"`
	Domain                    string            `db:"domain" json:"domain" mapstructure:"domain"`
	ExtraInfo                 string            `db:"extra_info" json:"extra_info" mapstructure:"extra_info"`
	SleepInfo                 string            `db:"sleep_info" json:"sleep_info" mapstructure:"sleep_info"`
	Timestamp                 time.Time         `db:"timestamp" json:"timestamp" mapstructure:"timestamp"`
	MythicTreeGroups          pq.StringArray    `db:"mythictree_groups" json:"mythictree_groups" mapstructure:"mythictree_groups"`
	Dead                      bool              `db:"dead" json:"dead" mapstructure:"dead"`
	EventStepInstanceID       structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	Color                     string            `db:"color" json:"color" mapstructure:"color"`
	TriggerOnCheckinAfterTime int               `db:"trigger_on_checkin_after_time" json:"trigger_on_checkin_after_time" mapstructure:"trigger_on_checkin_after_time"`
	ImpersonationContext      string            `db:"impersonation_context" json:"impersonation_context" mapstructure:"impersonation_context"`
	Cwd                       string            `db:"cwd" json:"cwd" mapstructure:"cwd"`
}
