package rabbitmq

type EventActionDataCreatePayload struct {
	PayloadConfiguration
}

type EventActionDataCreateTask struct {
	CallbackDisplayID   int                    `json:"callback_display_id" mapstructure:"callback_display_id"`
	CommandName         string                 `json:"command_name" mapstructure:"command_name"`
	PayloadType         *string                `json:"payload_type,omitempty" mapstructure:"payload_type,omitempty"`
	Params              string                 `json:"params" mapstructure:"params"`
	ParamDictionary     map[string]interface{} `json:"params_dictionary,omitempty" mapstructure:"params_dictionary"`
	ParameterGroupName  *string                `json:"parameter_group_name,omitempty" mapstructure:"parameter_group_name"`
	Token               *int                   `json:"token,omitempty" mapstructure:"token"`
	ParentTaskID        *int                   `json:"parent_task_id,omitempty" mapstructure:"parent_task_id"`
	IsInteractiveTask   bool                   `json:"is_interactive_task" mapstructure:"is_interactive_task"`
	InteractiveTaskType *int                   `json:"interactive_task_type,omitempty" mapstructure:"interactive_task_type"`
}

type TriggerDataFilterPayloadTypes struct {
	// only trigger for certain payload types if you don't want it for all payload types
	PayloadTypes []string `json:"payload_types" mapstructure:"payload_types"`
}
type TriggerDataCron struct {
	Cron string `json:"cron" mapstructure:"cron"`
}

type EventActionDataConditionalCheck struct {
	Steps []string `json:"steps" mapstructure:"steps"`
}
