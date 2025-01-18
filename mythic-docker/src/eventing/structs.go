package eventing

type EventGroup struct {
	Name        string                 `db:"name" json:"name" toml:"name" yaml:"name"`
	Description string                 `db:"description" json:"description" toml:"description" yaml:"description"`
	Trigger     string                 `db:"trigger" json:"trigger" toml:"trigger" yaml:"trigger"`
	TriggerData map[string]interface{} `db:"trigger_data" json:"trigger_data" toml:"trigger_data" yaml:"trigger_data"`
	Environment map[string]interface{} `db:"environment" json:"environment" toml:"environment" yaml:"environment"`
	Keywords    []string               `db:"keywords" json:"keywords" toml:"keywords" yaml:"keywords"`
	RunAs       string                 `db:"run_as" json:"run_as" toml:"run_as" yaml:"run_as"`
	Steps       []EventStep            `db:"eventstep" json:"steps" toml:"steps" yaml:"steps"`
}

type EventStep struct {
	Name            string                 `db:"name" json:"name" toml:"name" yaml:"name"`
	Description     string                 `db:"description" json:"description" toml:"description" yaml:"description"`
	DependsOn       []string               `db:"depends_on" json:"depends_on" toml:"depends_on" yaml:"depends_on"`
	Action          string                 `db:"action" json:"action" toml:"action" yaml:"action"`
	ActionData      map[string]interface{} `db:"action_data" json:"action_data" toml:"action_data" yaml:"action_data"`
	Environment     map[string]interface{} `db:"environment" json:"environment" toml:"environment" yaml:"environment"`
	Inputs          map[string]interface{} `db:"inputs" json:"inputs" toml:"inputs" yaml:"inputs"`
	Outputs         map[string]interface{} `db:"outputs" json:"outputs" toml:"outputs" yaml:"outputs"`
	Order           int                    `db:"order" json:"order" toml:"order" yaml:"order"`
	ContinueOnError bool                   `db:"continue_on_error" json:"continue_on_error" toml:"continue_on_error" yaml:"continue_on_error"`
}
