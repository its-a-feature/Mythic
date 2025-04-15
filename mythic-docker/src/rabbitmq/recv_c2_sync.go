package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
	"strings"
)

// C2_SYNC STRUCTS
type C2ParameterType = string

type C2SyncMessageResponse struct {
	Success bool   `json:"success"`
	Error   string `json:"error"`
}

type C2SyncMessage struct {
	Profile          C2Profile     `json:"c2_profile"`
	Parameters       []C2Parameter `json:"parameters"`
	ContainerVersion string        `json:"container_version"`
}

type C2Profile struct {
	Name           string `json:"name"`
	Description    string `json:"description"`
	Author         string `json:"author"`
	IsP2p          bool   `json:"is_p2p"`
	IsServerRouted bool   `json:"is_server_routed"`
}

const (
	C2_PARAMETER_TYPE_STRING            C2ParameterType = "String"
	C2_PARAMETER_TYPE_BOOLEAN                           = "Boolean"
	C2_PARAMETER_TYPE_CHOOSE_ONE                        = "ChooseOne"
	C2_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM                 = "ChooseOneCustom"
	C2_PARAMETER_TYPE_CHOOSE_MULTIPLE                   = "ChooseMultiple"
	C2_PARAMETER_TYPE_ARRAY                             = "Array"
	C2_PARAMETER_TYPE_DATE                              = "Date"
	C2_PARAMETER_TYPE_DICTIONARY                        = "Dictionary"
	C2_PARAMETER_TYPE_NUMBER                            = "Number"
	C2_PARAMETER_TYPE_TYPED_ARRAY                       = "TypedArray"
	C2_PARAMETER_TYPE_FILE                              = "File"
	C2_PARAMETER_TYPE_FILE_MULTIPLE                     = "FileMultiple"
)

type C2Parameter struct {
	Description       string                `json:"description"`
	Name              string                `json:"name"`
	DefaultValue      interface{}           `json:"default_value"`
	Randomize         bool                  `json:"randomize"`
	FormatString      string                `json:"format_string"`
	ParameterType     C2ParameterType       `json:"parameter_type"`
	Required          bool                  `json:"required"`
	VerifierRegex     string                `json:"verifier_regex"`
	IsCryptoType      bool                  `json:"crypto_type"`
	Choices           []string              `json:"choices"`
	DictionaryChoices []ParameterDictionary `json:"dictionary_choices"`
}

type ParameterDictionary struct {
	Name         string `json:"name" mapstructure:"name"`
	DefaultValue string `json:"default_value" mapstructure:"default_value"`
	DefaultShow  bool   `json:"default_show" mapstructure:"default_show"`
}

type SimplifiedParameterDictionary struct {
	Name  string `json:"name" mapstructure:"name"`
	Value string `json:"value" mapstructure:"value"`
	Key   string `json:"key" mapstructure:"key"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      "mythic_consume_c2_sync",
		RoutingKey: C2_SYNC_ROUTING_KEY,
		Handler:    processC2SyncMessages,
	})
}

func processC2SyncMessages(msg amqp.Delivery) interface{} {
	//logging.LogInfo("got message", "routingKey", msg.RoutingKey, "data", msg)
	c2SyncMsg := C2SyncMessage{}

	if err := json.Unmarshal(msg.Body, &c2SyncMsg); err != nil {
		logging.LogError(err, "Failed to process c2 sync message")
		go SendAllOperationsMessage(fmt.Sprintf("Failed to sync c2 profile %s", err.Error()), 0, "", database.MESSAGE_LEVEL_WARNING)
		return C2SyncMessageResponse{Success: false, Error: err.Error()}
	} else {
		response := C2SyncMessageResponse{}
		if err := c2Sync(c2SyncMsg); err != nil {
			// failed to sync message
			response.Success = false
			response.Error = fmt.Sprintf("Error: %v", err)
			go SendAllOperationsMessage(fmt.Sprintf("Failed to sync %s - %s", c2SyncMsg.Profile.Name, err.Error()), 0, c2SyncMsg.Profile.Name, database.MESSAGE_LEVEL_WARNING)
		} else {
			// successfully synced
			response.Success = true
		}
		logging.LogDebug("Finished processing c2 sync message")
		return response
	}
}

func c2Sync(in C2SyncMessage) error {
	//logging.LogDebug("Received connection to c2Sync", "syncMessage", in)
	c2Profile := databaseStructs.C2profile{}
	if in.Profile.Name == "" {
		logging.LogError(nil, "Can't have c2 container with empty name - bad sync")
		return errors.New("Can't have c2 container with empty name - bad sync")
	} else if !isValidContainerVersion(in.ContainerVersion) {
		logging.LogError(nil, "attempting to sync bad c2 container version")
		return errors.New(fmt.Sprintf("Version, %s, isn't supported. The max supported version is %s. \nThis likely means your PyPi or Golang library is out of date and should be updated.", in.ContainerVersion, validContainerVersionMax))
	}
	if err := database.DB.Get(&c2Profile, `SELECT * FROM c2profile WHERE "name"=$1`, in.Profile.Name); err != nil {
		// this means we don't have the c2 profile, so we need to create it and all the associated components
		logging.LogDebug("Failed to find c2 profile, syncing new data", "c2_profile", c2Profile)
		c2Profile.Name = in.Profile.Name
		c2Profile.Author = in.Profile.Author
		c2Profile.ContainerRunning = true
		c2Profile.Running = false
		c2Profile.IsP2p = in.Profile.IsP2p
		c2Profile.IsServerRouted = in.Profile.IsServerRouted
		c2Profile.Description = in.Profile.Description
		c2Profile.Deleted = false
		if statement, err := database.DB.PrepareNamed(`INSERT INTO c2profile 
			("name",author,container_running,is_p2p,is_server_routed,description, running, deleted) 
			VALUES (:name, :author, :container_running, :is_p2p, :is_server_routed, :description, :running, :deleted) 
			RETURNING id`,
		); err != nil {
			logging.LogError(err, "Failed to create new c2 profile statement")
			return err
		} else {
			if err = statement.Get(&c2Profile.ID, c2Profile); err != nil {
				logging.LogError(err, "Failed to create new c2 profile")
				return err
			} else {
				logging.LogDebug("New c2 profile", "c2_profile", c2Profile)
			}
		}
	} else {
		// the payload exists in the database, so we need to go down the track of updating/adding/removing information
		logging.LogDebug("Found c2 profile", "c2_profile", c2Profile)
		c2Profile.Author = in.Profile.Author
		c2Profile.ContainerRunning = true
		c2Profile.IsP2p = in.Profile.IsP2p
		c2Profile.Running = false
		c2Profile.IsServerRouted = in.Profile.IsServerRouted
		c2Profile.Description = in.Profile.Description
		c2Profile.Deleted = false
		_, err = database.DB.NamedExec(`UPDATE c2profile SET 
			author=:author, container_running=:container_running, is_p2p=:is_p2p, is_server_routed=:is_server_routed, 
			description=:description, running=:running, deleted=:deleted 
			WHERE id=:id`, c2Profile,
		)
		if err != nil {
			logging.LogError(err, "Failed to update c2 profile in database")
			return err
		}
	}
	if err := updateC2Parameters(in, c2Profile); err != nil {
		logging.LogError(err, "Failed to sync C2 profile")
		return err
	}
	go SendAllOperationsMessage(fmt.Sprintf("Successfully synced %s with container version %s", c2Profile.Name, in.ContainerVersion), 0, "debug", database.MESSAGE_LEVEL_DEBUG)
	go database.ResolveAllOperationsMessage(getDownContainerMessage(c2Profile.Name), 0)
	go autoStartC2Profile(c2Profile)
	go reSyncPayloadTypes()
	checkContainerStatusAddC2Channel <- c2Profile
	go CreateGraphQLSpectatorAPITokenAndSendOnStartMessage(c2Profile.Name)
	return nil
}

func updateC2Parameters(in C2SyncMessage, c2Profile databaseStructs.C2profile) error {
	// get all currently associated parameters for the c2 profile
	// if a parameter is in the database but not in the sync message, delete it
	// if a parameter is in the sync message, but not in the database, add it
	// if a parameter is in both, update it
	syncingParameters := in.Parameters
	databaseParameter := databaseStructs.C2profileparameters{}
	updatedAndDeletedParameters := []string{}
	if rows, err := database.DB.NamedQuery(`SELECT
		*
		FROM c2profileparameters
		WHERE c2_profile_id = :id
	`, c2Profile); err != nil {
		logging.LogError(err, "Failed to fetch c2 parameters for c2 profile when syncing")
		return err
	} else {
		for rows.Next() {
			found := false
			if err = rows.StructScan(&databaseParameter); err != nil {
				logging.LogError(err, "Failed to parse c2profileparameters into structure when syncing command")
				return err
			} else {
				logging.LogDebug("Got row from c2profileparameters while syncing c2 profile", "row", databaseParameter)
				for _, newParameter := range syncingParameters {
					if newParameter.Name == databaseParameter.Name {
						// we found a matching parameter name, update it
						logging.LogDebug("Found matching newParameter.Name and databaseParameter.Name", "name", newParameter.Name)
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
						if _, err = database.DB.NamedExec(`UPDATE c2profileparameters SET 
							description=:description, default_value=:default_value, randomize=:randomize, format_string=:format_string,
							parameter_type=:parameter_type, required=:required, choices=:choices,
							verifier_regex=:verifier_regex, deleted=:deleted, 
							crypto_type=:crypto_type 
							WHERE id=:id`, databaseParameter,
						); err != nil {
							logging.LogError(err, "Failed to update c2 parameter in database", "c2_parameter", databaseParameter)
						}
					}
				}
			}
			if !found {
				logging.LogDebug("Failed to find matching parameter name, deleting parameter", "parameter", databaseParameter)
				updatedAndDeletedParameters = append(updatedAndDeletedParameters, databaseParameter.Name)
				// we didn't see the current parameter in the syncingParameters from the agent container
				// this means that it once existed, but shouldn't anymore - mark it as deleted
				if _, err = database.DB.NamedExec("UPDATE c2profileparameters SET deleted=true WHERE id=:id", databaseParameter); err != nil {
					logging.LogError(err, "Failed to mark c2 profile parameter as deleted")
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
			databaseParameter = databaseStructs.C2profileparameters{
				Name:          newParameter.Name,
				Description:   newParameter.Description,
				Randomize:     newParameter.Randomize,
				FormatString:  newParameter.FormatString,
				VerifierRegex: newParameter.VerifierRegex,
				Deleted:       false,
				IsCryptoType:  newParameter.IsCryptoType,
				Required:      newParameter.Required,
				ParameterType: newParameter.ParameterType,
				C2ProfileID:   c2Profile.ID,
			}
			if defaultVal, err := getSyncToDatabaseValueForDefaultValue(newParameter.ParameterType, newParameter.DefaultValue, newParameter.Choices); err != nil {
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
			if statement, err := database.DB.PrepareNamed(`INSERT INTO c2profileparameters 
				("name",description,default_value,randomize,format_string,verifier_regex,deleted,crypto_type,required,parameter_type,c2_profile_id,choices) 
				VALUES (:name, :description, :default_value, :randomize, :format_string, :verifier_regex, :deleted,
				:crypto_type, :required, :parameter_type, :c2_profile_id, :choices) 
				RETURNING id`,
			); err != nil {
				logging.LogError(err, "Failed to create new c2 profile parameters statement when importing c2 profile")
				return err
			} else {
				if err = statement.Get(&databaseParameter.ID, databaseParameter); err != nil {
					logging.LogError(err, "Failed to create new c2 profile parameter")
					return err
				} else {
					logging.LogDebug("New c2 profile parameter", "c2_parameter", databaseParameter)
				}
			}
		}
	}
	return nil
}

func autoStartC2Profile(c2Profile databaseStructs.C2profile) *C2StartServerMessageResponse {
	// on a new sync, if it's not p2p, ask it to start
	var c2StartResp *C2StartServerMessageResponse
	var err error
	if !c2Profile.IsP2p {
		c2StartResp, err = RabbitMQConnection.SendC2RPCStartServer(C2StartServerMessage{Name: c2Profile.Name})
		if err != nil {
			logging.LogError(err, "Failed to send start message to C2 profile")
			c2StartResp.Error = err.Error()
		} else {
			UpdateC2ProfileRunningStatus(c2Profile, c2StartResp.InternalServerRunning)
			if !c2StartResp.InternalServerRunning {
				go SendAllOperationsMessage(fmt.Sprintf("Failed to start c2 profile %s:\n%s", c2Profile.Name, c2StartResp.Error), 0, "", database.MESSAGE_LEVEL_WARNING)
			}
		}
	}
	autoReHostFiles(c2Profile)
	return c2StartResp
}

func autoReHostFiles(c2Profile databaseStructs.C2profile) {
	fileHostedTagType := databaseStructs.TagType{
		Name: "FileHosted",
	}
	err := database.DB.Get(&fileHostedTagType, `SELECT id FROM tagtype WHERE name=$1`, fileHostedTagType.Name)
	if err != nil {
		logging.LogError(err, "failed to get existing tag types")
		return
	}
	currentTags := []databaseStructs.Tag{}
	err = database.DB.Select(&currentTags, `SELECT * FROM tag WHERE tagtype_id=$1`, fileHostedTagType.ID)
	if err != nil {
		logging.LogError(err, "failed to get existing tags for FileHosted tagtype")
		return
	}
	for _, tag := range currentTags {
		dataStruct := tag.Data.StructValue()
		for key, _ := range dataStruct {
			if strings.HasPrefix(key, fmt.Sprintf("%s; ", c2Profile.Name)) {
				newTagMap := dataStruct[key].(map[string]interface{})
				c2HostFileResponse, err := RabbitMQConnection.SendC2RPCHostFile(C2HostFileMessage{
					Name:     newTagMap["c2_profile"].(string),
					FileUUID: newTagMap["agent_file_id"].(string),
					HostURL:  newTagMap["host_url"].(string),
					Remove:   false,
				})
				if err != nil {
					logging.LogError(err, "failed to send host file message to c2 profile")
					go SendAllOperationsMessage(fmt.Sprintf(
						"%s failed to start hosting file:\n%s", newTagMap["c2_profile"].(string),
						err.Error()), tag.Operation, "", database.MESSAGE_LEVEL_WARNING)
					continue
				}
				if !c2HostFileResponse.Success {
					logging.LogError(err, "c2 profile failed to start hosting file")
					go SendAllOperationsMessage(fmt.Sprintf(
						"%s failed to start hosting file:\n%s", newTagMap["c2_profile"].(string),
						c2HostFileResponse.Error), tag.Operation, "", database.MESSAGE_LEVEL_WARNING)
					continue
				}
			}
		}
	}
}
