package rabbitmq

import (
	"fmt"
	"github.com/its-a-feature/Mythic/utils"
	"time"
)

const EMIT_LOG_ROUTING_KEY_PREFIX = "emit_log"

type LOG_TYPE = string

const (
	LOG_TYPE_CALLBACK   LOG_TYPE = "new_callback"
	LOG_TYPE_CREDENTIAL          = "new_credential"
	LOG_TYPE_FILE                = "new_file"
	LOG_TYPE_ARTIFACT            = "new_artifact"
	LOG_TYPE_TASK                = "new_task"
	LOG_TYPE_PAYLOAD             = "new_payload"
	LOG_TYPE_KEYLOG              = "new_keylog"
	LOG_TYPE_RESPONSE            = "new_response"
)

// LOG CONTAINER MESSAGE FORMAT STRUCTS
type LoggingMessage struct {
	OperationID   int         `json:"operation_id"`
	OperationName string      `json:"operation_name"`
	OperatorName  string      `json:"username"`
	Timestamp     time.Time   `json:"timestamp"`
	Action        LOG_TYPE    `json:"action"`
	Data          interface{} `json:"data"`
	ServerName    string      `json:"server_name"`
}

func GetLoggingRoutingKey(loggingAction LOG_TYPE) string {
	return fmt.Sprintf("%s.%s", EMIT_LOG_ROUTING_KEY_PREFIX, loggingAction)
}

func (r *rabbitMQConnection) EmitSiemMessage(loggingMessage LoggingMessage) error {
	localLoggingMessage := loggingMessage
	localLoggingMessage.ServerName = utils.MythicConfig.GlobalServerName
	if err := r.SendStructMessage(
		MYTHIC_TOPIC_EXCHANGE,
		GetLoggingRoutingKey(loggingMessage.Action),
		"",
		localLoggingMessage,
		true,
	); err != nil {
		//logging.LogError(err, "Failed to emit SIEM Message")
		return err
	} else {
		return nil
	}
}
