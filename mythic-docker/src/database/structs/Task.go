package databaseStructs

import (
	"database/sql"
	"time"

	"github.com/its-a-feature/Mythic/utils/structs"
)

type Task struct {
	ID                                 int               `db:"id" json:"id"`
	DisplayID                          int               `db:"display_id" json:"display_id"`
	AgentTaskID                        string            `db:"agent_task_id" json:"agent_task_id"`
	OperationID                        int               `db:"operation_id" json:"operation_id"`
	Operation                          Operation         `db:"operation" json:"-"`
	CommandID                          structs.NullInt64 `db:"command_id" json:"command_id"`
	Command                            Command           `db:"command" json:"-"`
	CommandName                        string            `db:"command_name" json:"command_name"`
	Params                             string            `db:"params" json:"params"`
	StatusTimestampPreprocessing       time.Time         `db:"status_timestamp_preprocessing" json:"status_timestamp_preprocessing"`
	StatusTimestampSubmitted           sql.NullTime      `db:"status_timestamp_submitted" json:"status_timestamp_submitted"`
	StatusTimestampProcessing          sql.NullTime      `db:"status_timestamp_processing" json:"status_timestamp_processing"`
	StatusTimestampProcessed           sql.NullTime      `db:"status_timestamp_processed" json:"status_timestamp_processed"`
	Timestamp                          time.Time         `db:"timestamp" json:"timestamp"`
	CallbackID                         int               `db:"callback_id" json:"callback_id"`
	Callback                           Callback          `db:"callback" json:"-"`
	OperatorID                         int               `db:"operator_id" json:"operator_id"`
	Operator                           Operator          `db:"operator" json:"-"`
	Status                             string            `db:"status" json:"status"`
	OriginalParams                     string            `db:"original_params" json:"original_params"`
	DisplayParams                      string            `db:"display_params" json:"display_params"`
	Comment                            string            `db:"comment" json:"comment"`
	CommentOperatorID                  structs.NullInt64 `db:"comment_operator_id" json:"comment_operator_id"`
	Stdout                             string            `db:"stdout" json:"stdout"`
	Stderr                             string            `db:"stderr" json:"stderr"`
	Completed                          bool              `db:"completed" json:"completed"`
	OpsecPreBlocked                    structs.NullBool  `db:"opsec_pre_blocked" json:"opsec_pre_blocked"`
	OpsecPreMessage                    string            `db:"opsec_pre_message" json:"opsec_pre_message"`
	OpsecPreBypassed                   bool              `db:"opsec_pre_bypassed" json:"opsec_pre_bypassed"`
	OpsecPreBypassRole                 string            `db:"opsec_pre_bypass_role" json:"opsec_pre_bypass_role"`
	OpsecPreBypassUserID               structs.NullInt64 `db:"opsec_pre_bypass_user_id" json:"opsec_pre_bypass_user_id"`
	OpsecPostBlocked                   structs.NullBool  `db:"opsec_post_blocked" json:"opsec_post_blocked"`
	OpsecPostMessage                   string            `db:"opsec_post_message" json:"opsec_post_message"`
	OpsecPostBypassed                  bool              `db:"opsec_post_bypassed" json:"opsec_post_bypassed"`
	OpsecPostBypassRole                string            `db:"opsec_post_bypass_role" json:"opsec_post_bypass_role"`
	OpsecPostBypassUserID              structs.NullInt64 `db:"opsec_post_bypass_user_id" json:"opsec_post_bypass_user_id"`
	ParentTaskID                       structs.NullInt64 `db:"parent_task_id" json:"parent_task_id"`
	SubtaskCallbackFunction            string            `db:"subtask_callback_function" json:"subtask_callback_function"`
	SubtaskCallbackFunctionCompleted   bool              `db:"subtask_callback_function_completed" json:"subtask_callback_function_completed"`
	GroupCallbackFunction              string            `db:"group_callback_function" json:"group_callback_function"`
	GroupCallbackFunctionCompleted     bool              `db:"group_callback_function_completed" json:"group_callback_function_completed"`
	CompletedCallbackFunction          string            `db:"completed_callback_function" json:"completed_callback_function"`
	CompletedCallbackFunctionCompleted bool              `db:"completed_callback_function_completed" json:"completed_callback_function_completed"`
	SubtaskGroupName                   string            `db:"subtask_group_name" json:"subtask_group_name"`
	TaskingLocation                    string            `db:"tasking_location" json:"tasking_location"`
	ParameterGroupName                 string            `db:"parameter_group_name" json:"parameter_group_name"`
	TokenID                            structs.NullInt64 `db:"token_id" json:"token_id"`
	ResponseCount                      int               `db:"response_count" json:"response_count"`
	IsInteractiveTask                  bool              `db:"is_interactive_task" json:"is_interactive_task"`
	InteractiveTaskType                structs.NullInt64 `db:"interactive_task_type" json:"interactive_task_type"`
	EventStepInstanceID                structs.NullInt64 `db:"eventstepinstance_id" json:"event_step_instance_id" mapstructure:"event_step_instance_id"`
	APITokensID                        structs.NullInt64 `db:"apitokens_id" json:"api_tokens_id" mapstructure:"apitokens_id"`
	HasInterceptedResponse             bool              `db:"has_intercepted_response" json:"has_intercepted_response"`
	CommandPayloadType                 string            `db:"command_payload_type" json:"command_payload_type" mapstructure:"command_payload_type"`
	ProcessAtOriginalCommand           bool              `db:"process_at_original_command" json:"process_at_original_command" mapstructure:"process_at_original_command"`
}
