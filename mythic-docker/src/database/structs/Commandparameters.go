package databaseStructs

type Commandparameters struct {
	ID                              int             `db:"id"`
	CommandID                       int             `db:"command_id"`
	Command                         Command         `db:"command"`
	Name                            string          `db:"name"`
	DisplayName                     string          `db:"display_name"`
	CliName                         string          `db:"cli_name"`
	Type                            string          `db:"type"`
	DefaultValue                    string          `db:"default_value"`
	Choices                         MythicJSONArray `db:"choices"`
	Description                     string          `db:"description"`
	SupportedAgents                 MythicJSONArray `db:"supported_agents"`
	SupportedAgentBuildParameters   MythicJSONText  `db:"supported_agent_build_parameters"`
	ChoiceFilterByCommandAttributes MythicJSONText  `db:"choice_filter_by_command_attributes"`
	ChoicesAreAllCommands           bool            `db:"choices_are_all_commands"`
	ChoicesAreLoadedCommands        bool            `db:"choices_are_loaded_commands"`
	DynamicQueryFunction            string          `db:"dynamic_query_function"`
	ParameterGroupName              string          `db:"parameter_group_name"`
	Required                        bool            `db:"required"`
	UiPosition                      int             `db:"ui_position"`
	LimitCredentialsByType          MythicJSONArray `db:"limit_credentials_by_type"`
}
