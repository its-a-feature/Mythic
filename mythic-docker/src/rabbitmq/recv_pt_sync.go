package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"os"
	"path/filepath"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
)

// PAYLOAD_SYNC STRUCTS
type PayloadTypeSyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type PayloadTypeSyncMessage struct {
	PayloadType      PayloadType `json:"payload_type"`
	CommandList      []Command   `json:"commands"`
	ContainerVersion string      `json:"container_version"`
	ForcedSync       bool        `json:"forced_resync"`
}
type BuildParameterType = string

const (
	BUILD_PARAMETER_TYPE_STRING            BuildParameterType = "String"
	BUILD_PARAMETER_TYPE_BOOLEAN                              = "Boolean"
	BUILD_PARAMETER_TYPE_CHOOSE_ONE                           = "ChooseOne"
	BUILD_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM                    = "ChooseOneCustom"
	BUILD_PARAMETER_TYPE_CHOOSE_MULTIPLE                      = "ChooseMultiple"
	BUILD_PARAMETER_TYPE_DATE                                 = "Date"
	BUILD_PARAMETER_TYPE_DICTIONARY                           = "Dictionary"
	BUILD_PARAMETER_TYPE_ARRAY                                = "Array"
	BUILD_PARAMETER_TYPE_NUMBER                               = "Number"
	BUILD_PARAMETER_TYPE_FILE                                 = "File"
	BUILD_PARAMETER_TYPE_FILE_MULTIPLE                        = "FileMultiple"
	BUILD_PARAMETER_TYPE_TYPED_ARRAY                          = "TypedArray"
)

type BuildParameter struct {
	Name              string                `json:"name"`
	Description       string                `json:"description"`
	Required          bool                  `json:"required"`
	VerifierRegex     string                `json:"verifier_regex"`
	DefaultValue      interface{}           `json:"default_value"`
	ParameterType     BuildParameterType    `json:"parameter_type"`
	FormatString      string                `json:"format_string"`
	Randomize         bool                  `json:"randomize"`
	IsCryptoType      bool                  `json:"crypto_type"`
	Choices           []string              `json:"choices"`
	DictionaryChoices []ParameterDictionary `json:"dictionary_choices"`
}
type BuildStep struct {
	StepName        string `json:"step_name"`
	StepDescription string `json:"step_description"`
}

type PayloadType struct {
	Name                          string           `json:"name"`
	FileExtension                 string           `json:"file_extension"`
	Author                        string           `json:"author"`
	SupportedOS                   []string         `json:"supported_os"`
	Wrapper                       bool             `json:"wrapper"`
	SupportedWrapperPayloadTypes  []string         `json:"supported_wrapper_payload_types"`
	SupportsDynamicLoading        bool             `json:"supports_dynamic_load"`
	Description                   string           `json:"description"`
	SupportedC2Profiles           []string         `json:"supported_c2_profiles"`
	TranslationContainerName      string           `json:"translation_container_name"`
	MythicEncryptsData            bool             `json:"mythic_encrypts"`
	BuildParameters               []BuildParameter `json:"build_parameters"`
	BuildSteps                    []BuildStep      `json:"build_steps"`
	AgentIcon                     *[]byte          `json:"agent_icon,omitempty"`
	DarkModeAgentIcon             *[]byte          `json:"dark_mode_agent_icon,omitempty"`
	MessageFormat                 string           `json:"message_format"`
	AgentType                     string           `json:"agent_type"`
	MessageUUIDLength             int              `json:"message_uuid_length"`
	CommandAugmentSupportedAgents []string         `json:"command_augment_supported_agents"`
	UseDisplayParamsForCLIHistory bool             `json:"use_display_params_for_cli_history"`
}

type Command struct {
	Name                      string                      `json:"name"`
	NeedsAdminPermissions     bool                        `json:"needs_admin_permissions"`
	HelpString                string                      `json:"help_string"`
	Description               string                      `json:"description"`
	Version                   uint32                      `json:"version"`
	SupportedUIFeatures       []string                    `json:"supported_ui_features"`
	Author                    string                      `json:"author"`
	MitreAttackMappings       []string                    `json:"attack"`
	ScriptOnlyCommand         bool                        `json:"script_only"`
	CommandAttributes         CommandAttribute            `json:"attributes"`
	CommandParameters         []CommandParameter          `json:"parameters"`
	AssociatedBrowserScript   *BrowserScript              `json:"browserscript,omitempty"`
	TaskFunctionOPSECPre      PtTaskFunctionOPSECPre      `json:"-"`
	TaskFunctionCreateTasking PtTaskFunctionCreateTasking `json:"-"`
	TaskFunctionOPSECPost     PtTaskFunctionOPSECPost     `json:"-"`
}
type CommandParameterType = string

const (
	COMMAND_PARAMETER_TYPE_STRING            CommandParameterType = "String"
	COMMAND_PARAMETER_TYPE_BOOLEAN                                = "Boolean"
	COMMAND_PARAMETER_TYPE_CHOOSE_ONE                             = "ChooseOne"
	COMMAND_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM                      = "ChooseOneCustom"
	COMMAND_PARAMETER_TYPE_CHOOSE_MULTIPLE                        = "ChooseMultiple"
	COMMAND_PARAMETER_TYPE_FILE                                   = "File"
	COMMAND_PARAMETER_TYPE_FILE_MULTIPLE                          = "FileMultiple"
	COMMAND_PARAMETER_TYPE_ARRAY                                  = "Array"
	COMMAND_PARAMETER_TYPE_CREDENTIAL                             = "CredentialJson"
	COMMAND_PARAMETER_TYPE_NUMBER                                 = "Number"
	COMMAND_PARAMETER_TYPE_PAYLOAD_LIST                           = "PayloadList"
	COMMAND_PARAMETER_TYPE_CONNECTION_INFO                        = "AgentConnect"
	COMMAND_PARAMETER_TYPE_LINK_INFO                              = "LinkInfo"
	COMMAND_PARAMETER_TYPE_TYPED_ARRAY                            = "TypedArray"
)

type CommandParameter struct {
	Name                                    string                 `json:"name"`
	ModalDisplayName                        string                 `json:"display_name"`
	CLIName                                 string                 `json:"cli_name"`
	ParameterType                           CommandParameterType   `json:"parameter_type"`
	Description                             string                 `json:"description"`
	Choices                                 []string               `json:"choices"`
	DefaultValue                            interface{}            `json:"default_value"`
	SupportedAgents                         []string               `json:"supported_agents"`
	SupportedAgentBuildParameters           map[string]interface{} `json:"supported_agent_build_parameters"`
	ChoicesAreAllCommands                   bool                   `json:"choices_are_all_commands"`
	ChoicesAreLoadedCommands                bool                   `json:"choices_are_loaded_commands"`
	FilterCommandChoicesByCommandAttributes map[string]string      `json:"choice_filter_by_command_attributes"`
	DynamicQueryFunctionName                string                 `json:"dynamic_query_function"`
	ParameterGroupInformation               []ParameterGroupInfo   `json:"parameter_group_info"`
	LimitCredentialsByType                  []string               `json:"limit_credentials_by_type"`
}

type CommandAttribute struct {
	SupportedOS                                     []string               `json:"supported_os" mapstructure:"supported_os"`
	CommandIsBuiltin                                bool                   `json:"builtin" mapstructure:"builtin"`
	CommandIsSuggested                              bool                   `json:"suggested_command" mapstructure:"suggested_command"`
	CommandCanOnlyBeLoadedLater                     bool                   `json:"load_only" mapstructure:"load_only"`
	FilterCommandAvailabilityByAgentBuildParameters map[string]string      `json:"filter_by_build_parameter" mapstructure:"filter_by_build_parameter"`
	Dependencies                                    []string               `json:"dependencies" mapstructure:"dependencies"`
	Groups                                          []string               `json:"groups" mapstructure:"groups"`
	AdditionalAttributes                            map[string]interface{} `json:"additional_items" mapstructure:",remain"`
}

type ParameterGroupInfo struct {
	ParameterIsRequired   bool                   `json:"required"`
	GroupName             string                 `json:"group_name"`
	UIModalPosition       uint32                 `json:"ui_position"`
	AdditionalInformation map[string]interface{} `json:"additional_info"`
}

type BrowserScript struct {
	Script string `json:"script"`
	Author string `json:"author"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      PT_SYNC_ROUTING_KEY,
		RoutingKey: PT_SYNC_ROUTING_KEY,
		Handler:    processPayloadSyncMessages,
	})
}

func processPayloadSyncMessages(msg amqp.Delivery) interface{} {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "message", msg)
	response := PayloadTypeSyncMessageResponse{Success: false}
	payloadSyncMsg := PayloadTypeSyncMessage{}
	if err := json.Unmarshal(msg.Body, &payloadSyncMsg); err != nil {
		logging.LogError(err, "Failed to process payload sync message")
		response.Error = err.Error()
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync payload type container - %s", err.Error()), 0, "", database.MESSAGE_LEVEL_WARNING)
	} else {

		if err := payloadTypeSync(payloadSyncMsg); err != nil {
			// failed to sync message
			logging.LogError(err, "Failed to fully sync payload type")
			response.Success = false
			response.Error = fmt.Sprintf("Error: %v", err)
			go SendAllOperationsMessage(response.Error, 0, payloadSyncMsg.PayloadType.Name, database.MESSAGE_LEVEL_WARNING)
		} else {
			// successfully synced
			response.Success = true
		}
		//RabbitMQConnection.ReplyToMessageWithStruct(msg, response)
		logging.LogDebug("Finished processing payload sync message")

	}
	return response
}

var messageFormats = []string{"xml", "json"}
var agentTypes = []string{"agent", "wrapper", "service", "command_augment"}
var messageUUIDLengths = []int{16, 36}

func payloadTypeSync(in PayloadTypeSyncMessage) error {
	//logging.LogDebug("Received connection to PayloadTypeSync", "syncMessage", in)
	payloadtype := databaseStructs.Payloadtype{}
	if in.PayloadType.Name == "" {
		logging.LogError(nil, "Can't have payload container with empty name - bad sync")
		return errors.New("Can't have payload container with empty name - bad sync")
	}
	if !isValidContainerVersion(in.ContainerVersion) {
		logging.LogError(nil, "attempting to sync bad payload container version")
		return errors.New(fmt.Sprintf("Version, %s, isn't supported. The max supported version is %s. \nThis likely means your PyPi or Golang library is out of date and should be updated.", in.ContainerVersion, validContainerVersionMax))
	}
	if err := database.DB.Get(&payloadtype, `SELECT * FROM payloadtype WHERE "name"=$1`, in.PayloadType.Name); err != nil {
		// this means we don't have the payload, so we need to create it and all the associated components
		//logging.LogDebug("Failed to find payload type, syncing new data", "payload", payloadtype)
		payloadtype.Name = in.PayloadType.Name
		payloadtype.Author = in.PayloadType.Author
		payloadtype.ContainerRunning = true
		payloadtype.FileExtension = in.PayloadType.FileExtension
		payloadtype.MythicEncrypts = in.PayloadType.MythicEncryptsData
		payloadtype.Note = in.PayloadType.Description
		payloadtype.SupportedOs = GetMythicJSONArrayFromStruct(in.PayloadType.SupportedOS)
		payloadtype.SupportsDynamicLoading = in.PayloadType.SupportsDynamicLoading
		payloadtype.Wrapper = in.PayloadType.Wrapper
		payloadtype.UseDisplayParamsForCLIHistory = in.PayloadType.UseDisplayParamsForCLIHistory
		if in.PayloadType.MessageFormat == "" {
			payloadtype.MessageFormat = "json"
		} else if utils.SliceContains(messageFormats, in.PayloadType.MessageFormat) {
			payloadtype.MessageFormat = in.PayloadType.MessageFormat
		} else {
			logging.LogError(nil, "Unknown message format", "message_format", in.PayloadType.MessageFormat)
			payloadtype.MessageFormat = "json"
		}
		if in.PayloadType.AgentType == "" {
			payloadtype.AgentType = "agent"
		} else if utils.SliceContains(agentTypes, in.PayloadType.AgentType) {
			payloadtype.AgentType = in.PayloadType.AgentType
			if payloadtype.AgentType == "wrapper" {
				payloadtype.Wrapper = true
			}
		} else {
			logging.LogError(nil, "Unknown agent type", "agent_type", in.PayloadType.AgentType)
			payloadtype.AgentType = "agent"
		}
		payloadtype.CommandAugmentSupportedAgents = GetMythicJSONArrayFromStruct(in.PayloadType.CommandAugmentSupportedAgents)
		if in.PayloadType.MessageUUIDLength == 0 {
			payloadtype.MessageUUIDLength = 36
		} else if utils.SliceContains(messageUUIDLengths, in.PayloadType.MessageUUIDLength) {
			payloadtype.MessageUUIDLength = in.PayloadType.MessageUUIDLength
		} else {
			logging.LogError(nil, "Unknown message UUID length", "MessageUUIDLength", in.PayloadType.MessageUUIDLength)
			payloadtype.MessageUUIDLength = 36
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO payloadtype 
			("name",author,container_running,file_extension,mythic_encrypts,note,supported_os,supports_dynamic_loading,wrapper,agent_type,message_format,command_augment_supported_agents,message_uuid_length,use_display_params_for_cli_history) 
			VALUES (:name, :author, :container_running, :file_extension, :mythic_encrypts, :note, :supported_os, :supports_dynamic_loading, :wrapper,:agent_type, :message_format, :command_augment_supported_agents, :message_uuid_length, :use_display_params_for_cli_history) 
			RETURNING id`,
		); err != nil {
			logging.LogError(err, "Failed to create new payloadtype statement")
			return err
		} else {
			if err = statement.Get(&payloadtype.ID, payloadtype); err != nil {
				logging.LogError(err, "Failed to create new payloadtype")
				return err
			}
			// when we get a new wrapper, resync payloads that might support it
			if payloadtype.Wrapper {
				go reSyncPayloadTypes()
			}
		}
	} else {
		// the payload exists in the database, so we need to go down the track of updating/adding/removing information
		//logging.LogDebug("Found payload", "payload", payloadtype)
		payloadtype.Name = in.PayloadType.Name
		payloadtype.Author = in.PayloadType.Author
		payloadtype.ContainerRunning = true
		payloadtype.FileExtension = in.PayloadType.FileExtension
		payloadtype.MythicEncrypts = in.PayloadType.MythicEncryptsData
		payloadtype.Note = in.PayloadType.Description
		payloadtype.SupportedOs = GetMythicJSONArrayFromStruct(in.PayloadType.SupportedOS)
		payloadtype.SupportsDynamicLoading = in.PayloadType.SupportsDynamicLoading
		payloadtype.Deleted = false
		payloadtype.Wrapper = in.PayloadType.Wrapper
		payloadtype.UseDisplayParamsForCLIHistory = in.PayloadType.UseDisplayParamsForCLIHistory
		if in.PayloadType.MessageFormat == "" {
			payloadtype.MessageFormat = "json"
		} else if utils.SliceContains(messageFormats, in.PayloadType.MessageFormat) {
			payloadtype.MessageFormat = in.PayloadType.MessageFormat
		} else {
			logging.LogError(nil, "Unknown message format", "message_format", in.PayloadType.MessageFormat)
			payloadtype.MessageFormat = "json"
		}
		if in.PayloadType.AgentType == "" {
			payloadtype.AgentType = "agent"
		} else if utils.SliceContains(agentTypes, in.PayloadType.AgentType) {
			payloadtype.AgentType = in.PayloadType.AgentType
			if payloadtype.AgentType == "wrapper" {
				payloadtype.Wrapper = true
			}
		} else {
			logging.LogError(nil, "Unknown agent type", "agent_type", in.PayloadType.AgentType)
			payloadtype.AgentType = "agent"
		}
		if in.PayloadType.MessageUUIDLength == 0 {
			payloadtype.MessageUUIDLength = 36
		} else if utils.SliceContains(messageUUIDLengths, in.PayloadType.MessageUUIDLength) {
			payloadtype.MessageUUIDLength = in.PayloadType.MessageUUIDLength
		} else {
			logging.LogError(nil, "Unknown message UUID length", "MessageUUIDLength", in.PayloadType.MessageUUIDLength)
			payloadtype.MessageUUIDLength = 36
		}
		payloadtype.CommandAugmentSupportedAgents = GetMythicJSONArrayFromStruct(in.PayloadType.CommandAugmentSupportedAgents)
		_, err = database.DB.NamedExec(`UPDATE payloadtype SET 
			author=:author, container_running=:container_running, file_extension=:file_extension, mythic_encrypts=:mythic_encrypts,
			note=:note, supported_os=:supported_os, supports_dynamic_loading=:supports_dynamic_loading, wrapper=:wrapper, deleted=:deleted,
			agent_type=:agent_type, message_format=:message_format, command_augment_supported_agents=:command_augment_supported_agents,
			message_uuid_length=:message_uuid_length, use_display_params_for_cli_history=:use_display_params_for_cli_history
			WHERE id=:id`, payloadtype,
		)
		if err != nil {
			logging.LogError(err, "Failed to update payloadtype in database")
			return err
		}
	}
	err := updatePayloadTypeC2Profiles(in, payloadtype)
	if err != nil {
		return err
	}
	err = updatePayloadTypeWrappers(in, payloadtype)
	if err != nil {
		return err
	}
	err = updatePayloadTypeCommands(in, payloadtype)
	if err != nil {
		return err
	}
	err = updatePayloadTypeBuildParameters(in, payloadtype)
	if err != nil {
		return err
	}
	err = updatePayloadBuildSteps(in, payloadtype)
	if err != nil {
		return err
	}
	absPath, err := filepath.Abs(filepath.Join(".", "static", fmt.Sprintf("%s_light.svg", payloadtype.Name)))
	if err != nil {
		return err
	}
	file, err := os.Create(absPath)
	if err != nil {
		return err
	}
	if in.PayloadType.AgentIcon != nil {
		if _, err = file.Write(*in.PayloadType.AgentIcon); err != nil {
			return err
		}
	}
	file.Close()
	darkModeAbsPath, err := filepath.Abs(filepath.Join(".", "static", fmt.Sprintf("%s_dark.svg", payloadtype.Name)))
	if err != nil {
		return err
	}
	darkModeFile, err := os.Create(darkModeAbsPath)
	if err != nil {
		return err
	}
	if in.PayloadType.DarkModeAgentIcon != nil {
		if _, err = darkModeFile.Write(*in.PayloadType.DarkModeAgentIcon); err != nil {
			return err
		}
	} else {
		if in.PayloadType.AgentIcon != nil {
			if _, err = darkModeFile.Write(*in.PayloadType.AgentIcon); err != nil {
				return err
			}
		}

	}
	darkModeFile.Close()
	if in.PayloadType.TranslationContainerName != "" {
		translationContainer := databaseStructs.Translationcontainer{
			Name: in.PayloadType.TranslationContainerName,
		}
		if err := database.DB.Get(&translationContainer, `SELECT id FROM translationcontainer WHERE "name"=$1`, translationContainer.Name); err != nil {
			logging.LogError(err, "Failed to find corresponding translation container for payload type")
			go SendAllOperationsMessage(fmt.Sprintf("Failed to find translation container, %s, for %s", translationContainer.Name, payloadtype.Name), 0, "", database.MESSAGE_LEVEL_WARNING)
		} else if _, err = database.DB.Exec(`UPDATE payloadtype SET translation_container_id=$1 WHERE id=$2`, translationContainer.ID, payloadtype.ID); err != nil {
			logging.LogError(err, "Failed to associate translation container with payload type")
		} else {
			// translation container information potentially changed, invalidate all the caches and re-do them with the updates
			InvalidateAllCachedUUIDInfo()
		}
	} else if _, err := database.DB.Exec(`UPDATE payloadtype SET translation_container_id=NULL WHERE id=$1`, payloadtype.ID); err != nil {
		logging.LogError(err, "Failed to update translation container status back to null")
	} else {
		// translation container information potentially changed, invalidate all the caches and re-do them with the updates
		InvalidateAllCachedUUIDInfo()
	}
	go SendAllOperationsMessage(fmt.Sprintf("Successfully synced %s with container version %s", payloadtype.Name, in.ContainerVersion), 0, "debug", database.MESSAGE_LEVEL_DEBUG)
	go database.ResolveAllOperationsMessage(getDownContainerMessage(payloadtype.Name), 0)
	checkContainerStatusAddPtChannel <- payloadtype
	if !in.ForcedSync {
		go CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(payloadtype.Name)
		if in.PayloadType.AgentType == "command_augment" {
			go updateAllCallbacksWithCommandAugments()
		}
	}
	return nil
}

func updatePayloadTypeBuildParameters(in PayloadTypeSyncMessage, payloadtype databaseStructs.Payloadtype) error {
	// get all currently associated parameters for the payload build parameter
	// if a parameter is in the database but not in the sync message, delete it
	// if a parameter is in the sync message, but not in the database, add it
	// if a parameter is in both, update it
	syncingParameters := in.PayloadType.BuildParameters
	databaseParameter := databaseStructs.Buildparameter{}
	updatedAndDeletedParameters := []string{}
	if rows, err := database.DB.NamedQuery(`SELECT
		*
		FROM buildparameter
		WHERE payload_type_id = :id
	`, payloadtype); err != nil {
		logging.LogError(err, "Failed to fetch build parameters for payloadtype when syncing")
		return err
	} else {
		for rows.Next() {
			found := false
			if err = rows.StructScan(&databaseParameter); err != nil {
				logging.LogError(err, "Failed to parse buildparameter into structure when syncing command")
				return err
			} else {
				//logging.LogDebug("Got row from buildparameter while syncing payloadtype", "row", databaseParameter)
				for _, newParameter := range syncingParameters {
					if newParameter.Name == databaseParameter.Name {
						// we found a matching parameter name, update it
						//logging.LogDebug("Found matching newParameter.Name and databaseParameter.Name", "name", newParameter.Name)
						updatedAndDeletedParameters = append(updatedAndDeletedParameters, databaseParameter.Name)
						found = true
						// update it
						databaseParameter.Description = newParameter.Description
						databaseParameter.Randomize = newParameter.Randomize
						databaseParameter.FormatString = newParameter.FormatString
						databaseParameter.ParameterType = newParameter.ParameterType
						databaseParameter.Required = newParameter.Required
						databaseParameter.VerifierRegex = newParameter.VerifierRegex
						databaseParameter.Deleted = false
						databaseParameter.IsCryptoType = newParameter.IsCryptoType
						if defaultVal, err := getSyncToDatabaseValueForDefaultValue(newParameter.ParameterType, newParameter.DefaultValue, newParameter.Choices); err != nil {
							logging.LogError(err, "Failed to getSyncToDatabaseValueForDefaultValue for updating build parameter")
							return err
						} else {
							databaseParameter.DefaultValue = defaultVal
						}
						if choices, err := getSyncToDatabaseValueForChoices(newParameter.ParameterType, newParameter.Choices, newParameter.DictionaryChoices); err != nil {
							logging.LogError(err, "Failed to call getSyncToDatabaseValueForChoices")
							return err
						} else {
							databaseParameter.Choices = choices
						}
						if err == nil {
							_, err = database.DB.NamedExec(`UPDATE buildparameter SET 
								description=:description, default_value=:default_value, choices=:choices,
								parameter_type=:parameter_type, required=:required, randomize=:randomize,
								verifier_regex=:verifier_regex, deleted=:deleted, format_string=:format_string,
								crypto_type=:crypto_type
								WHERE id=:id`, databaseParameter,
							)
							if err != nil {
								logging.LogError(err, "Failed to update build parameter in database", "build_parameter", databaseParameter)
								return err
							}
						} else {
							logging.LogError(err, "Failed to get string representation of default value for build parameter", "build_parameter", newParameter)
							return err
						}
					}
				}
			}
			if !found {
				//logging.LogDebug("Failed to find matching parameter name, deleting parameter", "parameter", databaseParameter)
				updatedAndDeletedParameters = append(updatedAndDeletedParameters, databaseParameter.Name)
				// we didn't see the current parameter in the syncingParameters from the agent container
				// this means that it once existed, but shouldn't anymore - mark it as deleted
				if _, err = database.DB.NamedExec("UPDATE buildparameter SET deleted=true WHERE id=:id", databaseParameter); err != nil {
					logging.LogError(err, "Failed to mark build parameter as deleted")
					return err
				}
			}
		}
	}
	// now that we've handled all the ones that should be updated or deleted, the rest should be added
	for _, newParameter := range syncingParameters {
		if utils.SliceContains(updatedAndDeletedParameters, newParameter.Name) {
			// this means we've already deleted or updated this specific parameter group for this command, so it's not new
			continue
		} else {
			// we have a new parameter group / command parameter to add in
			databaseParameter = databaseStructs.Buildparameter{
				Name:          newParameter.Name,
				Description:   newParameter.Description,
				Randomize:     newParameter.Randomize,
				FormatString:  newParameter.FormatString,
				VerifierRegex: newParameter.VerifierRegex,
				Deleted:       false,
				IsCryptoType:  newParameter.IsCryptoType,
				Required:      newParameter.Required,
				ParameterType: newParameter.ParameterType,
				PayloadTypeID: payloadtype.ID,
			}
			if defaultVal, err := getSyncToDatabaseValueForDefaultValue(newParameter.ParameterType, newParameter.DefaultValue, newParameter.Choices); err != nil {
				logging.LogError(err, "Failed to getSyncToDatabaseValueForDefaultValue for brand new build parameter")
				return err
			} else {
				databaseParameter.DefaultValue = defaultVal
			}
			if choices, err := getSyncToDatabaseValueForChoices(newParameter.ParameterType, newParameter.Choices, newParameter.DictionaryChoices); err != nil {
				logging.LogError(err, "Failed to call getSyncToDatabaseValueForChoices")
				return err
			} else {
				databaseParameter.Choices = choices
			}
			if statement, err := database.DB.PrepareNamed(`INSERT INTO buildparameter 
				(name,description,default_value,verifier_regex,deleted,
					required,parameter_type,payload_type_id, choices, crypto_type, randomize, format_string) 
				VALUES (:name, :description, :default_value, :verifier_regex, :deleted,
				:required, :parameter_type, :payload_type_id, :choices, :crypto_type, :randomize, :format_string) 
				RETURNING id`,
			); err != nil {
				logging.LogError(err, "Failed to create new buildparameter statement when importing payloadtype")
				return err
			} else {
				if err = statement.Get(&databaseParameter.ID, databaseParameter); err != nil {
					logging.LogError(err, "Failed to create new build parameter")
					return err
				} else {
					//logging.LogDebug("New build parameter", "build_parameter", databaseParameter)
				}
			}

		}
	}
	return nil
}

func updatePayloadTypeC2Profiles(in PayloadTypeSyncMessage, payloadtype databaseStructs.Payloadtype) error {
	// get all currently associated c2 profiles from database
	// if profile in database but not in sync message, delete it
	// if profile in sync message but not in database, add it
	syncingC2Profiles := in.PayloadType.SupportedC2Profiles
	databaseC2Profile := databaseStructs.Payloadtypec2profile{}
	if rows, err := database.DB.NamedQuery(`SELECT
		payloadtypec2profile.id,
		c2profile.name "c2profile.name"
		FROM payloadtypec2profile 
		JOIN c2profile ON payloadtypec2profile.c2_profile_id = c2profile.id 
		WHERE
		payload_type_id = :id
	`, payloadtype); err != nil {
		logging.LogError(err, "Failed to get payloadtypec2profile from database")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&databaseC2Profile); err != nil {
				logging.LogError(err, "Failed to get row from payloadtypec2profile")
				return err
			} else {
				logging.LogDebug("Got row from payloadtypec2profile", "row", databaseC2Profile)
				if utils.SliceContains(syncingC2Profiles, databaseC2Profile.C2profile.Name) {
					syncingC2Profiles = utils.RemoveStringFromSliceNoOrder(syncingC2Profiles, databaseC2Profile.C2profile.Name)
					continue
				} else {
					// got a current payloadtypec2profile mapping that shouldn't exist anymore, delete it from the database
					if _, err = database.DB.NamedExec("DELETE FROM payloadtypec2profile WHERE id=:id", databaseC2Profile); err != nil {
						logging.LogError(err, "Failed to delete payloadtypec2profile mapping")
						return err
					}
				}
			}
		}
	}
	// everything else left in syncingC2Profiles needs to be added
	for _, name := range syncingC2Profiles {
		c2profile := databaseStructs.C2profile{Name: name}
		if err := database.DB.Get(&c2profile, "SELECT id FROM c2profile WHERE name=$1", name); err != nil {
			logging.LogError(err, "Failed to get c2profile to associate with payloadtype", "c2profile", name, "c2profiles", syncingC2Profiles)

		} else {
			databaseC2Profile = databaseStructs.Payloadtypec2profile{C2ProfileID: c2profile.ID, PayloadTypeID: payloadtype.ID}
			if _, err := database.DB.NamedExec(`INSERT INTO 
				payloadtypec2profile (payload_type_id, c2_profile_id)
				VALUES (:payload_type_id, :c2_profile_id)`,
				databaseC2Profile); err != nil {
				logging.LogError(err, "Failed to create new payloadtypec2profile mapping")
			}
		}
	}
	return nil
}

func updatePayloadTypeWrappers(in PayloadTypeSyncMessage, payloadtype databaseStructs.Payloadtype) error {
	// get all currently associated payloadtype wrappers from the database
	// if payloadtype in database but not in sync message, delete it
	// if payloadtype in sync message, but not database, add it
	syncingWrappers := in.PayloadType.SupportedWrapperPayloadTypes
	databaseWrapper := databaseStructs.Wrappedpayloadtypes{}
	if payloadtype.Wrapper {
		if rows, err := database.DB.NamedQuery(`SELECT
		wrappedpayloadtypes.id,
		payloadtype.name "wrapped.name",
		payloadtype.id "wrapped.id"
		FROM wrappedpayloadtypes
		JOIN payloadtype ON wrappedpayloadtypes.wrapped_id = payloadtype.id
		WHERE
		wrapper_id = :id
	`, payloadtype); err != nil {
			logging.LogError(err, "Failed to get wrappedpayloadtypes from database")
			return err
		} else {
			for rows.Next() {
				if err = rows.StructScan(&databaseWrapper); err != nil {
					logging.LogError(err, "Failed to get row from wrappedpayloadtypes for importing new payloadtype")
					return err
				} else {
					logging.LogDebug("Got row from wrappedpayloadtypes", "row", databaseWrapper)
					if utils.SliceContains(syncingWrappers, databaseWrapper.Wrapped.Name) {
						syncingWrappers = utils.RemoveStringFromSliceNoOrder(syncingWrappers, databaseWrapper.Wrapped.Name)
					} else {
						// got a current wrapper payload type that shouldn't exist anymore, delete it from the database
						//if _, err = database.DB.NamedExec("DELETE FROM wrappedpayloadtypes WHERE id=:id", databaseWrapper); err != nil {
						//	logging.LogError(err, "Failed to delete wrappedpayloadtypes mapping")
						//	return err
						//}
					}
				}
			}
		}
	} else {
		if rows, err := database.DB.NamedQuery(`SELECT
		wrappedpayloadtypes.id,
		payloadtype.name "wrapper.name",
		payloadtype.id "wrapper.id"
		FROM wrappedpayloadtypes
		JOIN payloadtype ON wrappedpayloadtypes.wrapper_id = payloadtype.id
		WHERE
		wrapped_id = :id
	`, payloadtype); err != nil {
			logging.LogError(err, "Failed to get wrappedpayloadtypes from database")
			return err
		} else {
			for rows.Next() {
				if err = rows.StructScan(&databaseWrapper); err != nil {
					logging.LogError(err, "Failed to get row from wrappedpayloadtypes for importing new payloadtype")
					return err
				} else {
					logging.LogDebug("Got row from wrappedpayloadtypes", "row", databaseWrapper)
					if utils.SliceContains(syncingWrappers, databaseWrapper.Wrapper.Name) {
						syncingWrappers = utils.RemoveStringFromSliceNoOrder(syncingWrappers, databaseWrapper.Wrapper.Name)
					} else {
						// got a current wrapper payload type that shouldn't exist anymore, delete it from the database
						//if _, err = database.DB.NamedExec("DELETE FROM wrappedpayloadtypes WHERE id=:id", databaseWrapper); err != nil {
						//	logging.LogError(err, "Failed to delete wrappedpayloadtypes mapping")
						//	return err
						//}
					}
				}
			}
		}
	}

	// everything else left in syncingWrappers needs to be added
	for _, name := range syncingWrappers {
		targetWrapper := databaseStructs.Payloadtype{Name: name}
		if err := database.DB.Get(&targetWrapper, "SELECT id FROM payloadtype WHERE name=$1", name); err != nil {
			logging.LogError(err, "Failed to find payloadtype to associate for wrapping", "wrapper", name, "wrapped", payloadtype.Name)
		} else {
			databaseWrapper = databaseStructs.Wrappedpayloadtypes{WrapperID: targetWrapper.ID, WrappedID: payloadtype.ID}
			if payloadtype.Wrapper {
				databaseWrapper = databaseStructs.Wrappedpayloadtypes{WrapperID: payloadtype.ID, WrappedID: targetWrapper.ID}
			}
			err = database.DB.Get(&databaseWrapper, `SELECT id FROM wrappedpayloadtypes WHERE wrapper_id=$1 AND wrapped_id=$2`,
				databaseWrapper.WrapperID, databaseWrapper.WrappedID)
			if errors.Is(err, sql.ErrNoRows) {
				if _, err := database.DB.NamedExec(`INSERT INTO
				wrappedpayloadtypes (wrapper_id, wrapped_id)
				VALUES (:wrapper_id, :wrapped_id)`,
					databaseWrapper); err != nil {
					logging.LogError(err, "Failed to create new wrappedpayloadtype mapping")
					continue // don't bail out on one, keep going
				}
			} else if err != nil {
				logging.LogError(err, "failed to fetch wrapper maps")
			}

		}
	}
	return nil
}

func updatePayloadTypeCommands(in PayloadTypeSyncMessage, payloadtype databaseStructs.Payloadtype) error {
	// get all currently associated commands from the database
	// if a command is in the database but not in the sync message, delete it
	// if command is in the sync message, but not in the database, then add it
	// if command is in both, update it
	syncingCommands := in.CommandList
	databaseCommand := databaseStructs.Command{}
	updatedAndDeletedCommands := []string{}
	if rows, err := database.DB.NamedQuery(`SELECT
		* 
		FROM command 
		WHERE payload_type_id = :id
	`, payloadtype); err != nil {
		logging.LogError(err, "Failed to fetch commands for payloadtype when syncing")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&databaseCommand); err != nil {
				logging.LogError(err, "Failed to parse command into structure when syncing payloadtype")
				return err
			} else {
				//logging.LogDebug("Got row from commands while syncing payloadtype", "row", databaseCommand)
				updatedAndDeletedCommands = append(updatedAndDeletedCommands, databaseCommand.Cmd)
				found := false
				for _, newCommand := range syncingCommands {
					if newCommand.Name == databaseCommand.Cmd {
						found = true

						databaseCommand.NeedsAdmin = newCommand.NeedsAdminPermissions
						databaseCommand.HelpCmd = newCommand.HelpString
						databaseCommand.Description = newCommand.Description
						databaseCommand.Version = int(newCommand.Version)
						databaseCommand.SupportedUiFeatures = GetMythicJSONArrayFromStruct(newCommand.SupportedUIFeatures)
						databaseCommand.Author = newCommand.Author
						databaseCommand.Deleted = false
						databaseCommand.ScriptOnly = newCommand.ScriptOnlyCommand
						if len(newCommand.CommandAttributes.SupportedOS) == 0 {
							newCommand.CommandAttributes.SupportedOS = make([]string, 0)
						}
						if len(newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters) == 0 {
							newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters = make(map[string]string)
						}
						if newCommand.CommandAttributes.SupportedOS == nil {
							newCommand.CommandAttributes.SupportedOS = make([]string, 0)
						}
						if newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters == nil {
							newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters = make(map[string]string)
						}
						attributes := map[string]interface{}{
							"supported_os":              newCommand.CommandAttributes.SupportedOS,
							"builtin":                   newCommand.CommandAttributes.CommandIsBuiltin,
							"suggested_command":         newCommand.CommandAttributes.CommandIsSuggested,
							"load_only":                 newCommand.CommandAttributes.CommandCanOnlyBeLoadedLater,
							"filter_by_build_parameter": newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters,
						}
						for k, v := range newCommand.CommandAttributes.AdditionalAttributes {
							attributes[k] = v
						}
						//logging.LogDebug("updating command", "struct values", newCommand.CommandAttributes, "map values", attributes)
						//logging.LogDebug("updating database attributes to new thing", "attributes", attributes, "supported_os", attributes["supported_os"], "newfeatures", newCommand.SupportedUIFeatures)
						databaseCommand.Attributes = GetMythicJSONTextFromStruct(attributes)
						//logging.LogDebug("Found matching cmd when syncing payload type, time to update it", "cmd_new", databaseCommand)
						_, err = database.DB.NamedExec(`UPDATE command SET 
							needs_admin=:needs_admin, help_cmd=:help_cmd, description=:description, "version"=:version, attributes=:attributes, 
							supported_ui_features=:supported_ui_features, author=:author, deleted=:deleted, script_only=:script_only 
							WHERE id=:id`, databaseCommand,
						)
						if err != nil {
							logging.LogError(err, "Failed to update command in database")
							return err
						} else {
							if err := updatePayloadTypeCommandParameters(in, payloadtype, newCommand.CommandParameters, databaseCommand); err != nil {
								return err
							} else if err := updatePayloadTypeCommandBrowserScripts(in, newCommand, databaseCommand); err != nil {
								return err
							} else if err := updatePayloadTypeCommandMitreAttack(in, newCommand, databaseCommand); err != nil {
								return err
							}
						}
						break
					}
				}
				if !found {
					// we didn't see the current command in the syncingCommands list from the agent container
					// this means that it once existed, but shouldn't anymore - mark it as deleted
					if !databaseCommand.Deleted {
						logging.LogDebug("Need to delete command", "cmd", databaseCommand)
						_, err = database.DB.NamedExec(`UPDATE command SET 
							deleted=true 
							WHERE id=:id`, databaseCommand,
						)
						if err != nil {
							logging.LogError(err, "Failed to mark command as deleted in database", "command", databaseCommand)
							return err
						}
					}

				}
			}
		}
	}
	for _, newCommand := range syncingCommands {
		//logging.LogInfo("looping to see if need to add command", "updatedAndDeleted", updatedAndDeletedCommands, "current", newCommand.Name)
		if utils.SliceContains(updatedAndDeletedCommands, newCommand.Name) {
			continue
		}
		if newCommand.Name == "" {
			continue
		}
		databaseCommand = databaseStructs.Command{
			Cmd:                 newCommand.Name,
			NeedsAdmin:          newCommand.NeedsAdminPermissions,
			HelpCmd:             newCommand.HelpString,
			Description:         newCommand.Description,
			PayloadTypeID:       payloadtype.ID,
			Version:             int(newCommand.Version),
			SupportedUiFeatures: GetMythicJSONArrayFromStruct(newCommand.SupportedUIFeatures),
			Author:              newCommand.Author,
			Deleted:             false,
			ScriptOnly:          newCommand.ScriptOnlyCommand,
		}
		//logging.LogDebug("adding a new command", "new attributes", newCommand.CommandAttributes)
		attributes := map[string]interface{}{
			"supported_os":              newCommand.CommandAttributes.SupportedOS,
			"builtin":                   newCommand.CommandAttributes.CommandIsBuiltin,
			"suggested_command":         newCommand.CommandAttributes.CommandIsSuggested,
			"load_only":                 newCommand.CommandAttributes.CommandCanOnlyBeLoadedLater,
			"filter_by_build_parameter": newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters,
		}
		for k, v := range newCommand.CommandAttributes.AdditionalAttributes {
			attributes[k] = v
		}
		if len(newCommand.CommandAttributes.SupportedOS) == 0 {
			newCommand.CommandAttributes.SupportedOS = make([]string, 0)
		}
		if len(newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters) == 0 {
			newCommand.CommandAttributes.FilterCommandAvailabilityByAgentBuildParameters = make(map[string]string)
		}
		databaseCommand.Attributes = GetMythicJSONTextFromStruct(attributes)
		// create a new command for this payload type
		if statement, err := database.DB.PrepareNamed(`INSERT INTO command 
			(cmd,needs_admin,help_cmd,description,payload_type_id,"version",supported_ui_features,author,deleted,script_only,attributes) 
			VALUES (:cmd, :needs_admin, :help_cmd, :description, :payload_type_id, :version, :supported_ui_features, :author, :deleted, :script_only, :attributes) 
			RETURNING id`,
		); err != nil {
			logging.LogError(err, "Failed to create new command statement when importing payloadtype")
			return err
		} else {
			if err = statement.Get(&databaseCommand.ID, databaseCommand); err != nil {
				logging.LogError(err, "Failed to create new command")
				return err
			} else {
				//logging.LogDebug("New command", "command", databaseCommand)
				if err := updatePayloadTypeCommandParameters(in, payloadtype, newCommand.CommandParameters, databaseCommand); err != nil {
					return err
				} else if err := updatePayloadTypeCommandBrowserScripts(in, newCommand, databaseCommand); err != nil {
					return err
				} else if err := updatePayloadTypeCommandMitreAttack(in, newCommand, databaseCommand); err != nil {
					return err
				}
			}
		}
	}
	return nil
}

func updatePayloadTypeCommandParameters(in PayloadTypeSyncMessage, payloadtype databaseStructs.Payloadtype, newParameters []CommandParameter, command databaseStructs.Command) error {
	// get all currently associated parameters for the command
	// if a parameter is in the database but not in the sync message, delete it
	// if a parameter is in the sync message, but not in the database, add it
	// if a parameter is in both, update it
	syncingParameters := newParameters
	databaseParameter := databaseStructs.Commandparameters{}
	updatedAndDeletedParameters := []string{}
	if rows, err := database.DB.NamedQuery(`SELECT
		*
		FROM commandparameters
		WHERE command_id = :id
	`, command); err != nil {
		logging.LogError(err, "Failed to fetch command parameters for command when syning")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&databaseParameter); err != nil {
				logging.LogError(err, "Failed to parse commandparameter into structure when syncing command")
				return err
			} else {
				//logging.LogDebug("Got row from commandparameters while syncing command", "row", databaseParameter)
				found := false
				for _, newParameter := range syncingParameters {
					if newParameter.Name == databaseParameter.Name {
						// we found a matching parameter name, but now need to loop through this command's parameter groups
						//logging.LogDebug("Found matching newParameter.Name and databaseParameter.Name", "name", newParameter.Name)
						for _, newParameterGroup := range newParameter.ParameterGroupInformation {
							//logging.LogDebug("Looking to see if group names match", "newParameterGroup.GroupName", newParameterGroup.GroupName, "databaseParameter.ParameterGroupName", databaseParameter.ParameterGroupName)
							if newParameterGroup.GroupName == databaseParameter.ParameterGroupName {
								// we found an exact match to update

								updatedAndDeletedParameters = append(updatedAndDeletedParameters, databaseParameter.Name+databaseParameter.ParameterGroupName)
								found = true
								//logging.LogDebug("updating found to true and appending value", "updatedAndDeletedParameters", updatedAndDeletedParameters)
								// update it
								if newParameter.CLIName == "" {
									newParameter.CLIName = strings.ReplaceAll(newParameter.Name, " ", "-")
								}
								if newParameter.ModalDisplayName == "" {
									newParameter.ModalDisplayName = newParameter.Name
								}
								databaseParameter.CliName = newParameter.CLIName
								databaseParameter.DisplayName = newParameter.ModalDisplayName
								databaseParameter.Description = newParameter.Description
								databaseParameter.Choices = GetMythicJSONArrayFromStruct(newParameter.Choices)
								if defaultVal, err := getSyncToDatabaseValueForDefaultValue(newParameter.ParameterType, newParameter.DefaultValue, newParameter.Choices); err != nil {
									logging.LogError(err, "Failed to getSyncToDatabaseValueForDefaultValue for updating command parameter")
									return err
								} else {
									databaseParameter.DefaultValue = defaultVal
								}
								databaseParameter.SupportedAgents = GetMythicJSONArrayFromStruct(newParameter.SupportedAgents)
								databaseParameter.LimitCredentialsByType = GetMythicJSONArrayFromStruct(newParameter.LimitCredentialsByType)
								databaseParameter.ChoicesAreAllCommands = newParameter.ChoicesAreAllCommands
								databaseParameter.ChoicesAreLoadedCommands = newParameter.ChoicesAreLoadedCommands
								databaseParameter.Required = newParameterGroup.ParameterIsRequired
								databaseParameter.UiPosition = int(newParameterGroup.UIModalPosition)
								databaseParameter.Type = string(newParameter.ParameterType)
								if len(newParameter.FilterCommandChoicesByCommandAttributes) == 0 {
									newParameter.FilterCommandChoicesByCommandAttributes = make(map[string]string)
								}
								databaseParameter.ChoiceFilterByCommandAttributes = GetMythicJSONTextFromStruct(newParameter.FilterCommandChoicesByCommandAttributes)
								databaseParameter.DynamicQueryFunction = newParameter.DynamicQueryFunctionName
								databaseParameter.SupportedAgentBuildParameters = GetMythicJSONTextFromStruct(newParameter.SupportedAgentBuildParameters)
								_, err = database.DB.NamedExec(`UPDATE commandparameters SET 
									cli_name=:cli_name, display_name=:display_name, description=:description, choices=:choices, default_value=:default_value, 
									supported_agents=:supported_agents, supported_agent_build_parameters=:supported_agent_build_parameters,
									choices_are_all_commands=:choices_are_all_commands, choices_are_loaded_commands=:choices_are_loaded_commands, 
									choice_filter_by_command_attributes=:choice_filter_by_command_attributes, dynamic_query_function=:dynamic_query_function, 
									required=:required, ui_position=:ui_position, "type"=:type, limit_credentials_by_type=:limit_credentials_by_type 
									WHERE id=:id`, databaseParameter,
								)
								if err != nil {
									logging.LogError(err, "Failed to update command parameter in database", "command_parameter", databaseParameter)
									return err
								}
							}
						}
					}
				}
				if !found {
					//logging.LogDebug("Failed to find matching group and parameter name")
					// we didn't see the current parameter in the syncingParameters from the agent container
					// this means that it once existed, but shouldn't anymore - mark it as deleted
					logging.LogDebug("Need to delete command parameter", "parameter", databaseParameter, "cmd", command)
					if _, err = database.DB.NamedExec("DELETE FROM commandparameters WHERE id=:id", databaseParameter); err != nil {
						logging.LogError(err, "Failed to delete commandparameter mapping")
					}
				}
			}
		}
	}
	// now that we've handled all the ones that should be updated or deleted, the rest should be added
	for _, newParameter := range syncingParameters {
		for _, newParameterGroup := range newParameter.ParameterGroupInformation {
			if utils.SliceContains(updatedAndDeletedParameters, newParameter.Name+newParameterGroup.GroupName) {
				// this means we've already deleted or updated this specific parameter group for this command, so it's not new
				continue
			} else {
				if newParameter.CLIName == "" {
					newParameter.CLIName = strings.ReplaceAll(newParameter.Name, " ", "-")
				}
				if newParameter.ModalDisplayName == "" {
					newParameter.ModalDisplayName = newParameter.Name
				}
				// we have a new parameter group / command parameter to add in
				databaseParameter = databaseStructs.Commandparameters{
					Name:                     newParameter.Name,
					DisplayName:              newParameter.ModalDisplayName,
					CliName:                  newParameter.CLIName,
					Description:              newParameter.Description,
					Choices:                  GetMythicJSONArrayFromStruct(newParameter.Choices),
					LimitCredentialsByType:   GetMythicJSONArrayFromStruct(newParameter.LimitCredentialsByType),
					SupportedAgents:          GetMythicJSONArrayFromStruct(newParameter.SupportedAgents),
					ChoicesAreAllCommands:    newParameter.ChoicesAreAllCommands,
					ChoicesAreLoadedCommands: newParameter.ChoicesAreLoadedCommands,
					Required:                 newParameterGroup.ParameterIsRequired,
					UiPosition:               int(newParameterGroup.UIModalPosition),
					Type:                     string(newParameter.ParameterType),
					ParameterGroupName:       newParameterGroup.GroupName,
					CommandID:                command.ID,
					DynamicQueryFunction:     newParameter.DynamicQueryFunctionName,
				}
				if defaultVal, err := getSyncToDatabaseValueForDefaultValue(newParameter.ParameterType, newParameter.DefaultValue, newParameter.Choices); err != nil {
					logging.LogError(err, "Failed to getSyncToDatabaseValueForDefaultValue for brand new command parameter", "newParameter", newParameter)
					return err
				} else {
					databaseParameter.DefaultValue = defaultVal
				}
				databaseParameter.ChoiceFilterByCommandAttributes = GetMythicJSONTextFromStruct(newParameter.FilterCommandChoicesByCommandAttributes)
				databaseParameter.SupportedAgentBuildParameters = GetMythicJSONTextFromStruct(newParameter.SupportedAgentBuildParameters)
				if statement, err := database.DB.PrepareNamed(`INSERT INTO commandparameters 
					("name",display_name,cli_name,description,command_id,choices,default_value,supported_agents,choices_are_all_commands,
					choices_are_loaded_commands,required,ui_position,"type",choice_filter_by_command_attributes,dynamic_query_function,supported_agent_build_parameters,parameter_group_name,
					 limit_credentials_by_type) 
					VALUES (:name, :display_name, :cli_name, :description, :command_id, :choices, :default_value, :supported_agents, :choices_are_all_commands,
					:choices_are_loaded_commands, :required, :ui_position, :type, :choice_filter_by_command_attributes, :dynamic_query_function, :supported_agent_build_parameters, :parameter_group_name,
					        :limit_credentials_by_type) 
					RETURNING id`,
				); err != nil {
					logging.LogError(err, "Failed to create new command parameters statement when importing payloadtype")
					return err
				} else {
					if err = statement.Get(&databaseParameter.ID, databaseParameter); err != nil {
						logging.LogError(err, "Failed to create new command parameter")
						return err
					} else {
						//logging.LogDebug("New command parameter", "command_parameter", databaseParameter)
					}
				}
			}
		}
	}
	return nil
}

func updatePayloadTypeCommandBrowserScripts(in PayloadTypeSyncMessage, syncCommand Command, command databaseStructs.Command) error {
	databaseBrowserScript := databaseStructs.Browserscript{}
	/*
		if syncCommand.AssociatedBrowserScript != nil {
			logging.LogDebug("syncing browser script", "raw script", syncCommand.AssociatedBrowserScript.Script, "encoded", base64.StdEncoding.EncodeToString([]byte(syncCommand.AssociatedBrowserScript.Script)))
			//syncCommand.AssociatedBrowserScript.Script = base64.StdEncoding.EncodeToString([]byte(syncCommand.AssociatedBrowserScript.Script))
		}

	*/
	if rows, err := database.DB.NamedQuery(`SELECT
	*
	FROM browserscript
	WHERE command_id = :id and for_new_ui = true and operator_id IS NULL`, command); err != nil {
		logging.LogError(err, "Failed to get browserscript")
		return err
	} else {
		found := false
		for rows.Next() {
			if err = rows.StructScan(&databaseBrowserScript); err != nil {
				logging.LogError(err, "Failed to parse browserscript into structure when syncing command")
				return err
			} else {
				found = true
				//logging.LogDebug("Got row for browserscript", "row", databaseBrowserScript)
				if syncCommand.AssociatedBrowserScript != nil {
					databaseBrowserScript.Script = syncCommand.AssociatedBrowserScript.Script
					databaseBrowserScript.ContainerVersion = syncCommand.AssociatedBrowserScript.Script
					databaseBrowserScript.ContainerVersionAuthor = syncCommand.AssociatedBrowserScript.Author
					_, err = database.DB.NamedExec(`UPDATE browserscript SET 
						container_version=:container_version, container_version_author=:container_version_author 
						WHERE id=:id`, databaseBrowserScript,
					)
					if err != nil {
						logging.LogError(err, "Failed to update command browserscript in database", "browserscript", databaseBrowserScript)
						return err
					} else {
						updateBrowserScriptForAllOperators(databaseBrowserScript)
					}
				} else {
					// we're syncing null, but something exists, so we need to delete it for everybody
					if _, err = database.DB.NamedExec("DELETE FROM browserscript WHERE id=:id", databaseBrowserScript); err != nil {
						logging.LogError(err, "Failed to delete browserscript mapping")
						return err
					} else {
						removeBrowserScriptFromAllOperators(databaseBrowserScript)
					}
				}

			}
		}
		if syncCommand.AssociatedBrowserScript != nil && !found {
			// we have one registered for syncing from the container, and we didn't find anything that exists
			// create a new browserscript entry for Null operator, then for all operators
			databaseBrowserScript = databaseStructs.Browserscript{
				Author:                 syncCommand.AssociatedBrowserScript.Author,
				Script:                 syncCommand.AssociatedBrowserScript.Script,
				ContainerVersion:       syncCommand.AssociatedBrowserScript.Script,
				ContainerVersionAuthor: syncCommand.AssociatedBrowserScript.Author,
				CommandID:              command.ID,
				PayloadTypeID:          command.PayloadTypeID,
				Active:                 true,
				UserModified:           false,
				ForNewUi:               true,
			}
			if _, err := database.DB.NamedExec(`INSERT INTO
				browserscript (author, script, container_version, container_version_author, command_id, payload_type_id, active, user_modified, for_new_ui)
				VALUES (:author, :script, :container_version, :container_version_author, :command_id, :payload_type_id, :active, :user_modified, :for_new_ui)`,
				databaseBrowserScript); err != nil {
				logging.LogError(err, "Failed to create new browserscript mapping")
				return err
			} else {
				addBrowserScriptToAllOperators(databaseBrowserScript)
			}
		}
	}
	return nil
}

func addBrowserScriptToAllOperators(browserscript databaseStructs.Browserscript) error {
	operator := databaseStructs.Operator{}
	if rows, err := database.DB.Queryx(`SELECT
		id
		FROM operator
	`); err != nil {
		logging.LogError(err, "Failed to get operators")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&operator); err != nil {
				logging.LogError(err, "Failed to parse operator into structure")
				return err
			} else {
				browserscript.OperatorID = sql.NullInt64{Valid: true, Int64: int64(operator.ID)}
				if _, err := database.DB.NamedExec(`INSERT INTO
					browserscript (author, script, container_version, container_version_author, command_id, payload_type_id, active, user_modified, for_new_ui, operator_id)
					VALUES (:author, :script, :container_version, :container_version_author, :command_id, :payload_type_id, :active, :user_modified, :for_new_ui, :operator_id)`,
					browserscript); err != nil {
					logging.LogError(err, "Failed to create new browserscript mapping for operator", "operator", operator)
					return err
				}
			}
		}
	}
	return nil
}

func updateBrowserScriptForAllOperators(browserscript databaseStructs.Browserscript) error {
	operatorScript := databaseStructs.Browserscript{}
	if rows, err := database.DB.NamedQuery(`SELECT
	*
	FROM browserscript
	WHERE operator_id IS NOT NULL and command_id = :command_id
	`, browserscript); err != nil {
		logging.LogError(err, "Failed to get operators")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&operatorScript); err != nil {
				logging.LogError(err, "Failed to parse browserscript into structure for updating scripts")
				return err
			} else {
				if operatorScript.ContainerVersionAuthor == operatorScript.Author {
					operatorScript.Author = browserscript.Author
				}
				if !operatorScript.UserModified {
					operatorScript.Script = browserscript.Script
				}
				operatorScript.ContainerVersion = browserscript.Script
				operatorScript.ContainerVersionAuthor = browserscript.Author
				//logging.LogDebug("updating browser script for user", "script", operatorScript.Script)
				if _, err := database.DB.NamedExec(`UPDATE browserscript SET
					author=:author, script=:script, container_version=:container_version, container_version_author=:container_version_author
					WHERE id=:id`,
					operatorScript); err != nil {
					logging.LogError(err, "Failed to update browserscript mapping for operator", "operator_script", operatorScript)
					return err
				}
			}
		}
	}
	return nil
}

func removeBrowserScriptFromAllOperators(browserscript databaseStructs.Browserscript) error {
	operatorScript := databaseStructs.Browserscript{}
	if rows, err := database.DB.NamedQuery(`SELECT
	*
	FROM browserscript
	WHERE command_id = :command_id
	`, browserscript); err != nil {
		logging.LogError(err, "Failed to get browserscripts for command", "command", browserscript.CommandID)
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&operatorScript); err != nil {
				logging.LogError(err, "Failed to parse operator into structure")
				return err
			} else {
				if _, err = database.DB.NamedExec("DELETE FROM browserscript WHERE id=:id", operatorScript); err != nil {
					logging.LogError(err, "Failed to delete browserscript mapping")
					return err
				}
			}
		}
	}
	return nil
}

func updatePayloadTypeCommandMitreAttack(in PayloadTypeSyncMessage, syncCommand Command, command databaseStructs.Command) error {
	databaseMitreAttack := databaseStructs.Attackcommand{}
	seenMitreAttack := []string{}
	if rows, err := database.DB.NamedQuery(`SELECT
		attackcommand.id,
		attack.t_num "attack.t_num"
		FROM attackcommand 
		JOIN attack ON attackcommand.attack_id = attack.id 
		WHERE
		command_id = :id
	`, command); err != nil {
		logging.LogError(err, "Failed to get attackcommand from database")
		return err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&databaseMitreAttack); err != nil {
				logging.LogError(err, "Failed to parse mitre att&ck into structure")
				return err
			} else {
				// check if databaseMitreAttack is in syncCommand.MitreAttackMappings
				// if it is, mark it as seen and move on
				// if it's not, it needs to be removed
				if utils.SliceContains(syncCommand.MitreAttackMappings, databaseMitreAttack.Attack.TNum) {
					seenMitreAttack = append(seenMitreAttack, databaseMitreAttack.Attack.TNum)
				} else {
					if _, err = database.DB.NamedExec(`DELETE FROM attackcommand WHERE id=:id`, databaseMitreAttack); err != nil {
						logging.LogError(err, "Failed to delete attackcommand")
						return err
					}
				}
			}
		}
	}
	// anything else in syncCommand.MitreAttackMappings that's not in seenMitreAttack needs to be added
	for _, newMitreAttack := range syncCommand.MitreAttackMappings {
		if utils.SliceContains(seenMitreAttack, newMitreAttack) {
			// do nothing
		} else {
			// add it
			attack := databaseStructs.Attack{}
			if err := database.DB.Get(&attack, "SELECT * FROM attack WHERE t_num=$1", newMitreAttack); err != nil {
				logging.LogError(err, "Failed to find ATT&CK TNum", "t_num", newMitreAttack)
				SendAllOperationsMessage(
					fmt.Sprintf("%s:%s - Failed to find ATT&CK TNum: %s", in.PayloadType.Name, syncCommand.Name, newMitreAttack),
					0, "", database.MESSAGE_LEVEL_WARNING)
			} else {
				if _, err := database.DB.NamedExec(`INSERT INTO
					attackcommand (attack_id, command_id)
					VALUES (:attack_id, :command_id)`,
					databaseStructs.Attackcommand{
						AttackID:  attack.ID,
						CommandID: command.ID,
					},
				); err != nil {
					logging.LogError(err, "Failed to add new MITRE ATT&CK mapping", "attack", attack.ID, "command", command.ID)
					return err
				}
			}
		}
	}
	return nil
}

func updatePayloadBuildSteps(in PayloadTypeSyncMessage, payloadtype databaseStructs.Payloadtype) error {
	// remove all of the old build steps
	if _, err := database.DB.NamedExec(`DELETE FROM payload_build_step
	WHERE payload_build_step.payloadtype_id=:id and payload_build_step.payload_id IS NULL`, payloadtype); err != nil {
		logging.LogError(err, "Failed to remove old build steps")
		return err
	} else {
		// add all of the build steps
		for index, step := range in.PayloadType.BuildSteps {
			databaseStep := databaseStructs.PayloadBuildStep{
				StepName:        step.StepName,
				StepDescription: step.StepDescription,
				StepNumber:      index,
			}
			databaseStep.PayloadTypeID.Int64 = int64(payloadtype.ID)
			databaseStep.PayloadTypeID.Valid = true
			if _, err := database.DB.NamedExec(`INSERT INTO payload_build_step
			(payloadtype_id, step_name, step_description, start_time, step_number)
			VALUES (:payloadtype_id, :step_name, :step_description, :start_time, :step_number)`, databaseStep); err != nil {
				logging.LogError(err, "Failed to create new payload build step")
				return err
			}
		}
		return nil
	}
}

func updateAllCallbacksWithCommandAugments() {
	callbacks := []databaseStructs.Callback{}
	err := database.DB.Select(&callbacks, `SELECT
    	callback.id, callback.operator_id,
    	payload.os "payload.os",
    	payloadtype.Name "payload.payloadtype.name"
    	FROM callback
    	JOIN payload on callback.registered_payload_id = payload.id
    	JOIN payloadtype ON payload.payload_type_id = payloadtype.id`)
	if err != nil {
		logging.LogError(err, "failed to get callbacks for updating with newly synced command augmentation container")
		return
	}
	for _, callback := range callbacks {
		addCommandAugmentsToCallback(callback.ID, callback.Payload.Os, callback.Payload.Payloadtype.Name, callback.OperatorID)
	}

}
func reSyncPayloadTypes() {
	payloadTypes := []databaseStructs.Payloadtype{}
	if err := database.DB.Select(&payloadTypes, `SELECT
		"name", container_running, wrapper
		FROM payloadtype
		WHERE deleted=false`); err != nil {
		logging.LogError(err, "Failed to fetch payload types from database")
	} else {
		for _, pt := range payloadTypes {
			if pt.ContainerRunning {
				if pt.Wrapper {
					continue
				}
				if _, err = RabbitMQConnection.SendPTRPCReSync(PTRPCReSyncMessage{Name: pt.Name}); err != nil {
					logging.LogError(err, "Failed to ask payload type to resync")
				}
			}
		}
	}
}
