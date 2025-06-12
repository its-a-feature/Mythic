package rabbitmq

// building just an ad-hoc c2 profile for an already existing payload
type PayloadBuildC2ProfileMessage struct {
	PayloadUUID     string                 `json:"uuid"`
	Parameters      map[string]interface{} `json:"parameters"`
	BuildParameters map[string]interface{} `json:"build_parameters"`
	SelectedOS      string                 `json:"selected_os"`
	PayloadType     string                 `json:"payload_type"`
}

type PayloadBuildC2ProfileMessageResponse struct {
	PayloadUUID  string  `json:"uuid"`
	Status       string  `json:"status"`
	Payload      *[]byte `json:"payload,omitempty"`
	BuildStdErr  string  `json:"build_stderr"`
	BuildStdOut  string  `json:"build_stdout"`
	BuildMessage string  `json:"build_message"`
}

// exporting a payload configuration
type PayloadConfiguration struct {
	Description        string                                `json:"description" mapstructure:"description" binding:"required"`
	PayloadType        string                                `json:"payload_type" mapstructure:"payload_type" binding:"required"`
	C2Profiles         *[]PayloadConfigurationC2Profile      `json:"c2_profiles,omitempty" mapstructure:"c2_profiles"`
	BuildParameters    *[]PayloadConfigurationBuildParameter `json:"build_parameters,omitempty" mapstructure:"build_parameters"`
	Commands           []string                              `json:"commands,omitempty" mapstructure:"commands"`
	CommandGroups      []string                              `json:"command_groups,omitempty" mapstructure:"command_groups"`
	SelectedOS         string                                `json:"selected_os" mapstructure:"selected_os" binding:"required"`
	Filename           string                                `json:"filename" mapstructure:"filename" binding:"required"`
	WrappedPayloadUUID string                                `json:"wrapped_payload,omitemtpy" mapstructure:"wrapped_payload"`
	UUID               string                                `json:"uuid,omitempty" mapstructure:"uuid"`
	AgentFileID        string                                `json:"agent_file_id,omitempty" mapstructure:"agent_file_id"`
	BuildPhase         string                                `json:"build_phase,omitempty" mapstructure:"build_phase"`
	EventStepInstance  int                                   `json:"event_step_instance,omitempty" mapstructure:"event_step_instance"`
}
type PayloadConfigurationC2Profile struct {
	Name       string                 `json:"c2_profile" mapstructure:"c2_profile"`
	IsP2P      bool                   `json:"c2_profile_is_p2p" mapstructure:"c2_profile_is_p2p"`
	Parameters map[string]interface{} `json:"c2_profile_parameters" mapstructure:"c2_profile_parameters"`
}
type PayloadConfigurationBuildParameter struct {
	Name  string      `json:"name" binding:"required" mapstructure:"name"`
	Value interface{} `json:"value" binding:"required" mapstructure:"value"`
}

type PTOnNewCallbackAllData struct {
	Callback        PTTaskMessageCallbackData            `json:"callback"`
	BuildParameters []PayloadConfigurationBuildParameter `json:"build_parameters"`
	Commands        []string                             `json:"commands"`
	Payload         PTTaskMessagePayloadData             `json:"payload"`
	C2Profiles      []PayloadConfigurationC2Profile      `json:"c2info"`
	PayloadType     string                               `json:"payload_type"`
	Secrets         map[string]interface{}               `json:"secrets"`
}

// PT_TASK_* structs

type PTTaskMessageAllData struct {
	Task               PTTaskMessageTaskData                `json:"task"`
	Callback           PTTaskMessageCallbackData            `json:"callback"`
	BuildParameters    []PayloadConfigurationBuildParameter `json:"build_parameters"`
	Commands           []string                             `json:"commands"`
	Payload            PTTaskMessagePayloadData             `json:"payload"`
	C2Profiles         []PayloadConfigurationC2Profile      `json:"c2info"`
	PayloadType        string                               `json:"payload_type"`
	CommandPayloadType string                               `json:"command_payload_type"`
	Secrets            map[string]interface{}               `json:"secrets"`
}

type PTTaskMessageTaskData struct {
	ID                                 int    `json:"id"`
	DisplayID                          int    `json:"display_id"`
	AgentTaskID                        string `json:"agent_task_id"`
	CommandName                        string `json:"command_name"`
	Params                             string `json:"params"`
	Timestamp                          string `json:"timestamp"`
	CallbackID                         int    `json:"callback_id"`
	CallbackDisplayID                  int    `json:"callback_display_id"`
	PayloadType                        string `json:"payload_type"`
	Status                             string `json:"status"`
	OriginalParams                     string `json:"original_params"`
	DisplayParams                      string `json:"display_params"`
	Comment                            string `json:"comment"`
	Stdout                             string `json:"stdout"`
	Stderr                             string `json:"stderr"`
	Completed                          bool   `json:"completed"`
	OperatorUsername                   string `json:"operator_username"`
	OperatorID                         int    `json:"operator_id"`
	OpsecPreBlocked                    bool   `json:"opsec_pre_blocked"`
	OpsecPreMessage                    string `json:"opsec_pre_message"`
	OpsecPreBypassed                   bool   `json:"opsec_pre_bypassed"`
	OpsecPreBypassRole                 string `json:"opsec_pre_bypass_role"`
	OpsecPostBlocked                   bool   `json:"opsec_post_blocked"`
	OpsecPostMessage                   string `json:"opsec_post_message"`
	OpsecPostBypassed                  bool   `json:"opsec_post_bypassed"`
	OpsecPostBypassRole                string `json:"opsec_post_bypass_role"`
	ParentTaskID                       int    `json:"parent_task_id"`
	SubtaskCallbackFunction            string `json:"subtask_callback_function"`
	SubtaskCallbackFunctionCompleted   bool   `json:"subtask_callback_function_completed"`
	GroupCallbackFunction              string `json:"group_callback_function"`
	GroupCallbackFunctionCompleted     bool   `json:"group_callback_function_completed"`
	CompletedCallbackFunction          string `json:"completed_callback_function"`
	CompletedCallbackFunctionCompleted bool   `json:"completed_callback_function_completed"`
	SubtaskGroupName                   string `json:"subtask_group_name"`
	TaskingLocation                    string `json:"tasking_location"`
	ParameterGroupName                 string `json:"parameter_group_name"`
	TokenID                            int    `json:"token_id"`
	InteractiveTaskType                int    `json:"interactive_task_type"`
	IsInteractiveTask                  bool   `json:"is_interactive_task"`
	EventStepInstanceId                int    `json:"eventstepinstance_id"`
}

type PTTaskMessageCallbackData struct {
	ID                   int      `json:"id"`
	DisplayID            int      `json:"display_id"`
	AgentCallbackID      string   `json:"agent_callback_id"`
	InitCallback         string   `json:"init_callback"`
	LastCheckin          string   `json:"last_checkin"`
	User                 string   `json:"user"`
	Host                 string   `json:"host"`
	PID                  int      `json:"pid"`
	IP                   string   `json:"ip"`
	IPs                  []string `json:"ips"`
	ExternalIp           string   `json:"external_ip"`
	ProcessName          string   `json:"process_name"`
	Description          string   `json:"description"`
	OperatorID           int      `json:"operator_id"`
	OperatorUsername     string   `json:"operator_username"`
	Active               bool     `json:"active"`
	RegisteredPayloadID  int      `json:"registered_payload_id"`
	IntegrityLevel       int      `json:"integrity_level"`
	Locked               bool     `json:"locked"`
	OperationID          int      `json:"operation_id"`
	OperationName        string   `json:"operation_name"`
	CryptoType           string   `json:"crypto_type"`
	DecKey               []byte   `json:"dec_key"`
	EncKey               []byte   `json:"enc_key"`
	Os                   string   `json:"os"`
	Architecture         string   `json:"architecture"`
	Domain               string   `json:"domain"`
	ExtraInfo            string   `json:"extra_info"`
	SleepInfo            string   `json:"sleep_info"`
	ImpersonationContext string   `json:"impersonation_context"`
	Cwd                  string   `json:"cwd"`
}

type PTTaskMessagePayloadData struct {
	OS          string `json:"os"`
	UUID        string `json:"uuid"`
	PayloadType string `json:"payload_type"`
}

type PT_TASK_FUNCTION_STATUS = string

const (
	PT_TASK_FUNCTION_STATUS_OPSEC_PRE                           PT_TASK_FUNCTION_STATUS = "OPSEC Pre Check Running..."
	PT_TASK_FUNCTION_STATUS_OPSEC_PRE_ERROR                                             = "Error: processing arguments"
	PT_TASK_FUNCTION_STATUS_OPSEC_PRE_BLOCKED                                           = "OPSEC Pre Blocked"
	PT_TASK_FUNCTION_STATUS_PREPROCESSING                                               = "preparing task for agent..."
	PT_TASK_FUNCTION_STATUS_PREPROCESSING_ERROR                                         = "Error: creating task "
	PT_TASK_FUNCTION_STATUS_OPSEC_POST                                                  = "OPSEC Post Check Running..."
	PT_TASK_FUNCTION_STATUS_OPSEC_POST_ERROR                                            = "Error: opsec check failed to run"
	PT_TASK_FUNCTION_STATUS_OPSEC_POST_BLOCKED                                          = "OPSEC Post Blocked"
	PT_TASK_FUNCTION_STATUS_SUBMITTED                                                   = "submitted"
	PT_TASK_FUNCTION_STATUS_PROCESSING                                                  = "agent processing"
	PT_TASK_FUNCTION_STATUS_DELEGATING                                                  = "delegating tasks..."
	PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION                                         = "Completion Function Running..."
	PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION_ERROR                                   = "Error: completion function - click cog to check stderr"
	PT_TASK_FUNCTION_STATUS_SUBTASK_COMPLETED_FUNCTION                                  = "SubTask Completion Function Running..."
	PT_TASK_FUNCTION_STATUS_SUBTASK_COMPLETED_FUNCTION_ERROR                            = "Error: subtask completion function - click cog to check stderr"
	PT_TASK_FUNCTION_STATUS_GROUP_COMPLETED_FUNCTION                                    = "Group Completion Function Running..."
	PT_TASK_FUNCTION_STATUS_GROUP_COMPLETED_FUNCTION_ERROR                              = "Error: group completion function - click cog to check stderr"
	PT_TASK_FUNCTION_STATUS_COMPLETED                                                   = "success"
	PT_TASK_FUNCTION_STATUS_PROCESSED                                                   = "processed, agent sending responses..."
	PT_TASK_FUNCTION_STATUS_INTERCEPTED                                                 = "intercepted for custom checks"
	PT_TASK_FUNCTION_STATUS_INTERCEPTED_ERROR                                           = "Error: Task Interception Failed"
	PT_TASK_SUPPORTED_UI_FEATURE_TASK_PROCESS_INTERACTIVE_TASKS                         = "task:process_interactive_tasks"
)

// Tasking step 1:
// Task message/process before running create_tasking function
//
//	opportunity to run any necessary opsec checks/blocks before the logic in create_tasking runs
//		which can spawn subtasks outside of the opsec checks
type OPSEC_ROLE string

const (
	OPSEC_ROLE_LEAD           OPSEC_ROLE = "lead"
	OPSEC_ROLE_OPERATOR                  = "operator"
	OPSEC_ROLE_OTHER_OPERATOR            = "other_operator"
)

type PtTaskFunctionOPSECPre func(PTTaskMessageAllData) PTTTaskOPSECPreTaskMessageResponse
type PTTTaskOPSECPreTaskMessageResponse struct {
	TaskID             int        `json:"task_id"`
	Success            bool       `json:"success"`
	Error              string     `json:"error"`
	OpsecPreBlocked    bool       `json:"opsec_pre_blocked"`
	OpsecPreMessage    string     `json:"opsec_pre_message"`
	OpsecPreBypassed   *bool      `json:"opsec_pre_bypassed,omitempty"`
	OpsecPreBypassRole OPSEC_ROLE `json:"opsec_pre_bypass_role"`
}

// Tasking step 2:
// Task message/process to run the create_tasking function
//
//	this can start creating subtasks
type PtTaskFunctionCreateTasking func(PTTaskMessageAllData) PTTaskCreateTaskingMessageResponse
type PTTaskCreateTaskingMessageResponse struct {
	TaskID                           int     `json:"task_id"`
	Success                          bool    `json:"success"`
	Error                            string  `json:"error"`
	CommandName                      *string `json:"command_name,omitempty"`
	TaskStatus                       *string `json:"task_status,omitempty"`
	DisplayParams                    *string `json:"display_params,omitempty"`
	Stdout                           *string `json:"stdout,omitempty"`
	Stderr                           *string `json:"stderr,omitempty"`
	Completed                        *bool   `json:"completed,omitempty"`
	TokenID                          *int    `json:"token_id,omitempty"`
	CompletionFunctionName           *string `json:"completion_function_name,omitempty"`
	Params                           *string `json:"params,omitempty"`
	ParameterGroupName               *string `json:"parameter_group_name"`
	ReprocessAtNewCommandPayloadType *string `json:"reprocess_at_new_command_payload_type,omitempty"`
}

// Tasking step 3:
// Task message/process after running create_tasking but before the task can be picked up by an agent
//
//	this is the time to check any artifacts generated from create_tasking
type PtTaskFunctionOPSECPost func(PTTaskMessageAllData) PTTaskOPSECPostTaskMessageResponse
type PTTaskOPSECPostTaskMessageResponse struct {
	TaskID              int        `json:"task_id"`
	Success             bool       `json:"success"`
	Error               string     `json:"error"`
	OpsecPostBlocked    bool       `json:"opsec_post_blocked"`
	OpsecPostMessage    string     `json:"opsec_post_message"`
	OpsecPostBypassed   *bool      `json:"opsec_post_bypassed,omitempty"`
	OpsecPostBypassRole OPSEC_ROLE `json:"opsec_post_bypass_role"`
}

// Tasking step 4:
// Run this when the specified task completes
type SubtaskGroupName = string

type PTTaskCompletionFunctionMessage struct {
	TaskData               PTTaskMessageAllData  `json:"task"`
	SubtaskData            *PTTaskMessageAllData `json:"subtask,omitempty"`
	SubtaskGroup           *SubtaskGroupName     `json:"subtask_group_name,omitempty"`
	CompletionFunctionName string                `json:"function_name"`
}
type PTTaskingCompletionFunction func(PTTaskMessageAllData, *PTTaskMessageAllData, *SubtaskGroupName) PTTaskCompletionFunctionMessageResponse
type PTTaskCompletionFunctionMessageResponse struct {
	TaskID                 int     `json:"task_id"`
	ParentTaskId           int     `json:"parent_task_id"`
	Success                bool    `json:"success"`
	Error                  string  `json:"error"`
	TaskStatus             *string `json:"task_status,omitempty"`
	DisplayParams          *string `json:"display_params,omitempty"`
	Stdout                 *string `json:"stdout,omitempty"`
	Stderr                 *string `json:"stderr,omitempty"`
	Completed              *bool   `json:"completed,omitempty"`
	TokenID                *int    `json:"token_id,omitempty"`
	CompletionFunctionName *string `json:"completion_function_name,omitempty"`
	Params                 *string `json:"params,omitempty"`
	ParameterGroupName     *string `json:"parameter_group_name,omitempty"`
}

// Tasking step 5:
// Task message/process to run for more manual processing of a message's response data
type PtTaskProcessResponseMessage struct {
	TaskData     PTTaskMessageAllData `json:"task"`
	ResponseData interface{}          `json:"response"`
}
type PtTaskProcessResponse func(PtTaskProcessResponseMessage) PTTaskProcessResponseMessageResponse
type PTTaskProcessResponseMessageResponse struct {
	TaskID  int    `json:"task_id"`
	Success bool   `json:"success"`
	Error   string `json:"error"`
}
