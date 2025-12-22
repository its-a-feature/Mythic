package databaseStructs

import (
	"database/sql"
	"time"
)

type Payloadtype struct {
	ID                                 int                  `db:"id"`
	Name                               string               `db:"name"`
	MythicEncrypts                     bool                 `db:"mythic_encrypts"`
	CreationTime                       time.Time            `db:"creation_time"`
	FileExtension                      string               `db:"file_extension"`
	Wrapper                            bool                 `db:"wrapper"`
	SupportedOs                        MythicJSONArray      `db:"supported_os"`
	ContainerRunning                   bool                 `db:"container_running"`
	Service                            string               `db:"service"`
	Author                             string               `db:"author"`
	Note                               string               `db:"note"`
	SupportsDynamicLoading             bool                 `db:"supports_dynamic_loading"`
	Deleted                            bool                 `db:"deleted"`
	TranslationContainerID             sql.NullInt64        `db:"translation_container_id"`
	Translationcontainer               Translationcontainer `db:"translationcontainer"`
	ContainerCount                     int                  `db:"container_count"`
	MessageFormat                      string               `db:"message_format"`
	AgentType                          string               `db:"agent_type"`
	MessageUUIDLength                  int                  `db:"message_uuid_length"`
	CommandAugmentSupportedAgents      MythicJSONArray      `db:"command_augment_supported_agents"`
	UseDisplayParamsForCLIHistory      bool                 `db:"use_display_params_for_cli_history"`
	SemVer                             string               `db:"semver"`
	SupportsMultipleC2InBuild          bool                 `db:"supports_multiple_c2_in_build"`
	SupportsMultipleC2InstancesInBuild bool                 `db:"supports_multiple_c2_instances_in_build"`
	C2ParameterDeviations              MythicJSONText       `db:"c2_parameter_deviations"`
	SupportedC2                        MythicJSONArray      `db:"supported_c2"`
	CommandHelpFunction                string               `db:"command_help_function"`
	SupportedWrapping                  MythicJSONArray      `db:"supported_wrapping"`
	SupportedTranslationContainer      string               `db:"supported_translation_container"`
}
