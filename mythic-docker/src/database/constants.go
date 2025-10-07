package database

import "time"

var (
	RETRY_CONNECT_DELAY        = 5 * time.Second
	DATABASE_ALIVE_CHECK_DELAY = 30 * time.Second
	UndefinedTable             = "42P01"
)

var (
	OPERATOR_OPERATION_VIEW_MODE_LEAD      = "lead"
	OPERATOR_OPERATION_VIEW_MODE_SPECTATOR = "spectator"
	OPERATOR_OPERATION_VIEW_MODE_OPERATOR  = "operator"
)

type MESSAGE_TYPE = string

const (
	MESSAGE_LEVEL_INFO           MESSAGE_TYPE = "info"
	MESSAGE_LEVEL_AUTH                        = "auth"
	MESSAGE_LEVEL_DEBUG                       = "debug"
	MESSAGE_LEVEL_API                         = "api"
	MESSAGE_LEVEL_AGENT_MESSGAGE              = "agent"
	MESSAGE_LEVEL_CHAT                        = "chat"
)
