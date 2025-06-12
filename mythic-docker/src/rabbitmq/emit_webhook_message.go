package rabbitmq

import (
	"fmt"
	"github.com/its-a-feature/Mythic/utils"
	"time"
)

type WEBHOOK_TYPE = string

const EMIT_WEBHOOK_ROUTING_KEY_PREFIX = "emit_webhook"

const (
	WEBHOOK_TYPE_NEW_CALLBACK WEBHOOK_TYPE = "new_callback"
	WEBHOOK_TYPE_NEW_FEEDBACK              = "new_feedback"
	WEBHOOK_TYPE_NEW_STARTUP               = "new_startup"
	WEBHOOK_TYPE_ALERT                     = "new_alert"
	WEBHOOK_TYPE_CUSTOM                    = "new_custom"
)

// WEBHOOK CONTAINER MESSAGE FORMAT STRUCTS
type WebhookMessage struct {
	OperationID      int                    `json:"operation_id"`
	OperationName    string                 `json:"operation_name"`
	OperationWebhook string                 `json:"operation_webhook"`
	OperationChannel string                 `json:"operation_channel"`
	OperatorUsername string                 `json:"operator_username,omitempty"`
	Action           WEBHOOK_TYPE           `json:"action"`
	Data             map[string]interface{} `json:"data"`
	ServerName       string                 `json:"server_name"`
}

type NewCallbackWebhookData struct {
	User                 string `json:"user" mapstructure:"user"`
	Host                 string `json:"host" mapstructure:"host"`
	IPs                  string `json:"ips" mapstructure:"ips"`
	Domain               string `json:"domain" mapstructure:"domain"`
	ExternalIP           string `json:"external_ip" mapstructure:"external_ip"`
	ProcessName          string `json:"process_name" mapstructure:"process_name"`
	PID                  int    `json:"pid" mapstructure:"pid"`
	Os                   string `json:"os" mapstructure:"os"`
	Architecture         string `json:"architecture" mapstructure:"architecture"`
	AgentType            string `json:"agent_type" mapstructure:"agent_type"`
	Description          string `json:"description" mapstructure:"description"`
	ExtraInfo            string `json:"extra_info" mapstructure:"extra_info"`
	SleepInfo            string `json:"sleep_info" mapstructure:"sleep_info"`
	DisplayID            int    `json:"display_id" mapstructure:"display_id"`
	ID                   int    `json:"id" mapstructure:"id"`
	IntegrityLevel       int    `json:"integrity_level" mapstructure:"integrity_level"`
	Cwd                  string `json:"cwd" mapstructure:"cwd"`
	ImpersonationContext string `json:"impersonation_context" mapstructure:"impersonation_context"`
}

type NewAlertMessageWebhookData struct {
	OperatorID *int      `json:"operator_id" mapstructure:"operator_id"`
	Message    string    `json:"message" mapstructure:"message"`
	Source     string    `json:"source" mapstructure:"source"`
	Count      int       `json:"count" mapstructure:"count"`
	Timestamp  time.Time `json:"timestamp" mapstructure:"timestamp"`
}

type NewCustomWebhookData struct {
	Timestamp time.Time `json:"timestamp" mapstructure:"timestamp"`
	Message   string    `json:"message" mapstructure:"message"`
}

func GetWebhookRoutingKey(webhookAction WEBHOOK_TYPE) string {
	return fmt.Sprintf("%s.%s", EMIT_WEBHOOK_ROUTING_KEY_PREFIX, webhookAction)
}

func (r *rabbitMQConnection) EmitWebhookMessage(webhookMessage WebhookMessage) error {
	localWebhookMessage := webhookMessage
	localWebhookMessage.ServerName = utils.MythicConfig.GlobalServerName
	if err := r.SendStructMessage(
		MYTHIC_TOPIC_EXCHANGE,
		GetWebhookRoutingKey(webhookMessage.Action),
		"",
		localWebhookMessage,
		true,
	); err != nil {
		//logging.LogError(err, "Failed to emit webhook Message")
		return err
	} else {
		return nil
	}
}
