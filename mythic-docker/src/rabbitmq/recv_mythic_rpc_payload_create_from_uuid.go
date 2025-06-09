package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/mitchellh/mapstructure"
	amqp "github.com/rabbitmq/amqp091-go"
)

type MythicRPCPayloadCreateFromUUIDMessage struct {
	PayloadUUID    string  `json:"uuid"`
	TaskID         int     `json:"task_id"`
	NewDescription *string `json:"new_description"`
	NewFilename    *string `json:"new_filename"`
	RemoteHost     *string `json:"remote_host"`
}

// Every mythicRPC function call must return a response that includes the following two values
type MythicRPCPayloadCreateFromUUIDMessageResponse struct {
	Success        bool   `json:"success"`
	Error          string `json:"error"`
	NewPayloadUUID string `json:"new_payload_uuid"`
}

func init() {
	RabbitMQConnection.AddRPCQueue(RPCQueueStruct{
		Exchange:   MYTHIC_EXCHANGE,
		Queue:      MYTHIC_RPC_PAYLOAD_CREATE_FROM_UUID,   // swap out with queue in rabbitmq.constants.go file
		RoutingKey: MYTHIC_RPC_PAYLOAD_CREATE_FROM_UUID,   // swap out with routing key in rabbitmq.constants.go file
		Handler:    processMythicRPCPayloadCreateFromUUID, // points to function that takes in amqp.Delivery and returns interface{}
	})
}

// MYTHIC_RPC_OBJECT_ACTION - Say what the function does
func MythicRPCPayloadCreateFromUUID(input MythicRPCPayloadCreateFromUUIDMessage) MythicRPCPayloadCreateFromUUIDMessageResponse {
	response := MythicRPCPayloadCreateFromUUIDMessageResponse{
		Success: false,
	}
	// first get all of the payload information
	payloadConfiguration := PayloadConfiguration{}
	payload := databaseStructs.Payload{}
	if err := database.DB.Get(&payload, `SELECT
	payload.id, payload.description, payload.uuid, payload.os, payload.wrapped_payload_id, payload.operation_id,
	payloadtype.name "payloadtype.name",
	filemeta.filename "filemeta.filename" 
	FROM
	payload
	JOIN payloadtype ON payload.payload_type_id = payloadtype.id
	JOIN filemeta ON payload.file_id = filemeta.id
	WHERE 
	payload.uuid=$1`, input.PayloadUUID); err != nil {
		logging.LogError(err, "Failed to get payload")
		response.Error = err.Error()
		return response
	} else {
		if input.NewDescription != nil {
			payloadConfiguration.Description = *input.NewDescription
		} else {
			payloadConfiguration.Description = payload.Description
		}
		if input.NewFilename != nil {
			payloadConfiguration.Filename = *input.NewFilename
		} else {
			payloadConfiguration.Filename = string(payload.Filemeta.Filename)
		}
		payloadConfiguration.SelectedOS = payload.Os
		payloadConfiguration.PayloadType = payload.Payloadtype.Name
		payloadConfiguration.C2Profiles = GetPayloadC2ProfileInformation(payload)
		payloadConfiguration.BuildParameters = GetBuildParameterInformation(payload.ID)
		payloadConfiguration.Commands = GetPayloadCommandInformation(payload)
		if payload.WrappedPayloadID.Valid {
			// get the associated UUID for the wrapped payload
			wrappedPayload := databaseStructs.Payload{}
			if err := database.DB.Get(&wrappedPayload, `SELECT uuid FROM payload WHERE id=$1`, payload.WrappedPayloadID.Int64); err != nil {
				logging.LogError(err, "Failed to fetch wrapped payload information")
				response.Error = err.Error()
				return response
			} else {
				payloadConfiguration.WrappedPayloadUUID = wrappedPayload.UuID
			}
		}
		task := databaseStructs.Task{}
		if err := database.DB.Get(&task, `SELECT operator_id FROM task WHERE id=$1`, input.TaskID); err != nil {
			logging.LogError(err, "Failed to get operator_id from task when generating payload")
			response.Error = err.Error()
			return response
		}
		if newUUID, newID, err := RegisterNewPayload(payloadConfiguration, &databaseStructs.Operatoroperation{
			CurrentOperation: databaseStructs.Operation{ID: payload.OperationID},
			CurrentOperator:  databaseStructs.Operator{ID: task.OperatorID},
		}); err != nil {
			response.Error = err.Error()
			return response
		} else if _, err := database.DB.Exec(`UPDATE payload SET auto_generated=true, task_id=$2 WHERE id=$1`, newID, input.TaskID); err != nil {
			logging.LogError(err, "failed to update payload auto_generated status")
			response.Error = err.Error()
			return response
		} else {
			if input.RemoteHost != nil {
				if _, err := database.DB.Exec(`INSERT INTO payloadonhost 
					(host, payload_id, operation_id, task_id) 
					VALUES 
					($1, $2, $3, $4)`, strings.ToUpper(*input.RemoteHost), newID, payload.OperationID, input.TaskID); err != nil {
					logging.LogError(err, "Failed to register payload on host")
				}
			}
			response.NewPayloadUUID = newUUID
			response.Success = true
			return response
		}
	}
}
func processMythicRPCPayloadCreateFromUUID(msg amqp.Delivery) interface{} {
	incomingMessage := MythicRPCPayloadCreateFromUUIDMessage{}
	responseMsg := MythicRPCPayloadCreateFromUUIDMessageResponse{
		Success: false,
	}
	if err := json.Unmarshal(msg.Body, &incomingMessage); err != nil {
		logging.LogError(err, "Failed to unmarshal JSON into struct")
		responseMsg.Error = err.Error()
	} else {
		return MythicRPCPayloadCreateFromUUID(incomingMessage)
	}
	return responseMsg
}

func associateBuildParametersWithPayload(databasePayload databaseStructs.Payload, buildParameters *[]PayloadConfigurationBuildParameter) (map[string]interface{}, error) {
	logging.LogDebug("about to associate build parameters with payload", "buildParametersFromPayloadConfig", buildParameters)
	if buildParameters == nil {
		return nil, nil
	}
	finalBuildParameters := map[string]string{}
	returnBuildParameters := map[string]interface{}{}
	databaseBuildParameter := databaseStructs.Buildparameter{}
	if rows, err := database.DB.NamedQuery(`SELECT
		*
		FROM buildparameter
		WHERE payload_type_id=:payload_type_id and deleted=false
	`, databasePayload); err != nil {
		logging.LogError(err, "Failed to get build parameters from database when trying to build payload")
		return nil, err
	} else {
		for rows.Next() {
			if err = rows.StructScan(&databaseBuildParameter); err != nil {
				logging.LogError(err, "Failed to get row from buildparameter when trying to build payload")
				return nil, err
			} else {
				logging.LogDebug("Got row from buildparameter", "row", databaseBuildParameter)
				// if we didn't get a value for something, use the default value
				found := false
				for _, suppliedBuildParam := range *buildParameters {
					if suppliedBuildParam.Name == databaseBuildParameter.Name {
						if suppliedBuildParam.Value == nil {
							// the value isn't good, so take the default one instead
							break
						} else {
							found = true
							// the user supplied an explicit value for this build parameter, so use it
							if val, err := GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(databaseBuildParameter.ParameterType, suppliedBuildParam.Value); err != nil {
								//if val, err := GetStrippedValueForBuildParameter(databaseBuildParameter, suppliedBuildParam.Value); err != nil {
								logging.LogError(err, "Failed to strip value of build parameter", "value", suppliedBuildParam.Value, "build_parameter", databaseBuildParameter)
								return nil, err
							} else {
								finalBuildParameters[databaseBuildParameter.Name] = val
							}
							break
						}
					}
				}
				if !found {
					// the user didn't supply a value, so we'll take the default value
					if val, err := getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString(
						databaseBuildParameter.ParameterType, databaseBuildParameter.DefaultValue,
						databaseBuildParameter.Choices.StructValue(),
						databaseBuildParameter.Randomize, databaseBuildParameter.FormatString,
					); err != nil {
						//if val, err := GetDefaultValueForBuildParameter(databaseBuildParameter); err != nil {
						logging.LogError(err, "Failed to get default value for build parameter", "build_parameter", databaseBuildParameter)
						return nil, err
					} else {
						finalBuildParameters[databaseBuildParameter.Name] = val
					}
				}
				// create a buildparameterinstance entry to link this specific value to this payload for future reference
				databaseBuildParameterInstance := databaseStructs.Buildparameterinstance{
					PayloadID:        databasePayload.ID,
					BuildParameterID: databaseBuildParameter.ID,
					Value:            finalBuildParameters[databaseBuildParameter.Name],
				}
				if databaseBuildParameter.IsCryptoType {
					if databasePayload.Payloadtype.TranslationContainerID.Valid && !databasePayload.Payloadtype.MythicEncrypts {
						if cryptoKeysResponse, err := RabbitMQConnection.SendTrRPCGenerateEncryptionKeys(TrGenerateEncryptionKeysMessage{
							TranslationContainerName: databasePayload.Payloadtype.Translationcontainer.Name,
							C2Name:                   "",
							CryptoParamValue:         finalBuildParameters[databaseBuildParameter.Name],
							CryptoParamName:          databaseBuildParameter.Name,
						}); err != nil {
							logging.LogError(err, "Failed to contact translation container to generate crypto keys")
							return nil, errors.New(fmt.Sprintf("failed to contact translation container, %s, to generate encryption keys:\n %s", databasePayload.Payloadtype.Translationcontainer.Name, err.Error()))
						} else if !cryptoKeysResponse.Success {
							logging.LogError(errors.New(cryptoKeysResponse.Error), "Failed to have translation container successfully generate keys")
							return nil, errors.New(fmt.Sprintf("failed to have translation container, %s, to successfully generate keys:\n %s", databasePayload.Payloadtype.Translationcontainer.Name, cryptoKeysResponse.Error))
						} else {
							if cryptoKeysResponse.EncryptionKey != nil {
								databaseBuildParameterInstance.EncKey = cryptoKeysResponse.EncryptionKey
							}
							if cryptoKeysResponse.DecryptionKey != nil {
								databaseBuildParameterInstance.DecKey = cryptoKeysResponse.DecryptionKey
							}
						}
					} else {
						if cryptoKeys, err := mythicCrypto.GenerateKeysForPayload(finalBuildParameters[databaseBuildParameter.Name]); err != nil {
							logging.LogError(err, "Failed to generate crypto keys for payload")
							return nil, err
						} else {
							if cryptoKeys.EncKey != nil {
								databaseBuildParameterInstance.EncKey = cryptoKeys.EncKey
							}
							if cryptoKeys.DecKey != nil {
								databaseBuildParameterInstance.DecKey = cryptoKeys.DecKey
							}
						}
					}
				}
				if interfaceParam, err := GetInterfaceValueForContainer(
					databaseBuildParameter.ParameterType,
					finalBuildParameters[databaseBuildParameter.Name],
					databaseBuildParameterInstance.EncKey,
					databaseBuildParameterInstance.DecKey,
					databaseBuildParameter.IsCryptoType); err != nil {
					logging.LogError(err, "Failed to convert build parameter into interface")
					return nil, err
				} else {
					returnBuildParameters[databaseBuildParameter.Name] = interfaceParam
				}

				if _, err := database.DB.NamedExec(`INSERT INTO 
				buildparameterinstance (payload_id, value, build_parameter_id, enc_key, dec_key)
				VALUES (:payload_id, :value, :build_parameter_id, :enc_key, :dec_key)`,
					databaseBuildParameterInstance); err != nil {
					logging.LogError(err, "Failed to create new buildparameter instance mapping")
					return nil, err
				}
			}

		}
	}
	return returnBuildParameters, nil
}

func associateC2ProfilesWithPayload(databasePayload databaseStructs.Payload, c2Profiles *[]PayloadConfigurationC2Profile) ([]PayloadBuildC2Profile, error) {
	// associate c2 profiles and their parameters with the payload
	if c2Profiles == nil {
		return nil, errors.New("Creating a Payload without any C2 Profiles")
	}
	// finalC2Profiles will look like {"http": {"callback_host": "val", "callback_port": val2}}
	finalC2Profiles := make([]PayloadBuildC2Profile, 0)
	for _, suppliedC2Profile := range *c2Profiles {
		databaseC2Profile := databaseStructs.C2profile{}
		if err := database.DB.Get(&databaseC2Profile, "SELECT * FROM c2profile WHERE name=$1 and deleted=false", suppliedC2Profile.Name); err != nil {
			logging.LogError(err, "Failed to find c2 profile")
			return nil, err
		}
		finalC2Profile := PayloadBuildC2Profile{
			Name:       databaseC2Profile.Name,
			IsP2P:      databaseC2Profile.IsP2p,
			ID:         databaseC2Profile.ID,
			Parameters: map[string]interface{}{},
		}
		/*
				if !databaseC2Profile.ContainerRunning {
					err := errors.New("C2 Profile container isn't running, can't task configuration checks")
					logging.LogError(err, "C2 Profile container isn't running, can't task configuration checks")
					return nil, err
				}

			if !databaseC2Profile.Running && !databaseC2Profile.IsP2p {
				// the profile isn't running, and it's not a P2P container, so issue the start task
				go autoStartC2Profile(databaseC2Profile)
			}
		*/
		databaseC2ProfileParameter := databaseStructs.C2profileparameters{}
		if rows, err := database.DB.NamedQuery(`SELECT
			*
			FROM c2profileparameters
			WHERE c2_profile_id = :id and deleted=false
		`, databaseC2Profile); err != nil {
			logging.LogError(err, "Failed to get c2 parameters from database when trying to build payload")
			return nil, err
		} else {
			for rows.Next() {
				if err = rows.StructScan(&databaseC2ProfileParameter); err != nil {
					logging.LogError(err, "Failed to get row from c2profileparameters when trying to build payload")
					return nil, err
				} else {
					found := false
					paramStringVal := ""
					for suppliedParameterName, suppliedParameterValue := range suppliedC2Profile.Parameters {
						if suppliedParameterName == databaseC2ProfileParameter.Name {
							// we have a supplied parameter that matches the one we're looking at from the database for this c2 profile
							found = true
							if strippedValue, err := GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(
								databaseC2ProfileParameter.ParameterType, suppliedParameterValue,
							); err != nil {
								//if strippedValue, err := GetStrippedValueForC2Parameter(databaseC2ProfileParameter, suppliedParameterValue); err != nil {
								logging.LogError(err, "Failed to get stripped c2 profile parameter", "value", suppliedParameterValue)
								return nil, err
							} else {
								paramStringVal = strippedValue
							}
							break
						}
					}
					if !found {
						if strippedValue, err := getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString(
							databaseC2ProfileParameter.ParameterType, databaseC2ProfileParameter.DefaultValue,
							databaseC2ProfileParameter.Choices.StructValue(),
							databaseC2ProfileParameter.Randomize, databaseC2ProfileParameter.FormatString); err != nil {
							//if strippedValue, err := GetDefaultValueForC2Parameter(databaseC2ProfileParameter); err != nil {
							logging.LogError(err, "Failed to get default c2 profile parameter", "parameter", databaseC2ProfileParameter)
							return nil, err
						} else {
							paramStringVal = strippedValue
						}
					}

					c2ParameterInstance := databaseStructs.C2profileparametersinstance{
						PayloadID:             sql.NullInt64{Valid: true, Int64: int64(databasePayload.ID)},
						C2ProfileID:           databaseC2Profile.ID,
						C2ProfileParametersID: databaseC2ProfileParameter.ID,
						Value:                 paramStringVal,
					}
					c2ParameterInstance.OperationID.Valid = true
					c2ParameterInstance.OperationID.Int64 = int64(databasePayload.OperationID)
					if databaseC2ProfileParameter.IsCryptoType {
						if databasePayload.Payloadtype.TranslationContainerID.Valid && !databasePayload.Payloadtype.MythicEncrypts {
							if cryptoKeysResponse, err := RabbitMQConnection.SendTrRPCGenerateEncryptionKeys(TrGenerateEncryptionKeysMessage{
								TranslationContainerName: databasePayload.Payloadtype.Translationcontainer.Name,
								C2Name:                   "",
								CryptoParamValue:         paramStringVal,
								CryptoParamName:          databaseC2ProfileParameter.Name,
							}); err != nil {
								logging.LogError(err, "Failed to contact translation container to generate crypto keys")
								return nil, errors.New(fmt.Sprintf("failed to contact translation container, %s, to generate encryption keys:\n %s", databasePayload.Payloadtype.Translationcontainer.Name, err.Error()))
							} else if !cryptoKeysResponse.Success {
								logging.LogError(errors.New(cryptoKeysResponse.Error), "Failed to have translation container successfully generate keys")
								return nil, errors.New(fmt.Sprintf("failed to have translation container, %s, to successfully generate keys:\n %s", databasePayload.Payloadtype.Translationcontainer.Name, cryptoKeysResponse.Error))
							} else {
								if cryptoKeysResponse.EncryptionKey != nil {
									c2ParameterInstance.EncKey = cryptoKeysResponse.EncryptionKey
								}
								if cryptoKeysResponse.DecryptionKey != nil {
									c2ParameterInstance.DecKey = cryptoKeysResponse.DecryptionKey
								}
							}
						} else {
							if cryptoKeys, err := mythicCrypto.GenerateKeysForPayload(paramStringVal); err != nil {
								logging.LogError(err, "Failed to generate crypto keys for payload")
								return nil, err
							} else {
								if cryptoKeys.EncKey != nil {
									c2ParameterInstance.EncKey = cryptoKeys.EncKey
								}
								if cryptoKeys.DecKey != nil {
									c2ParameterInstance.DecKey = cryptoKeys.DecKey
								}
							}
						}

					}
					if interfaceParam, err := GetInterfaceValueForContainer(
						databaseC2ProfileParameter.ParameterType,
						paramStringVal,
						c2ParameterInstance.EncKey,
						c2ParameterInstance.DecKey,
						databaseC2ProfileParameter.IsCryptoType,
					); err != nil {
						logging.LogError(err, "Failed to convert c2 parameter to interface")
						return nil, err
					} else {
						finalC2Profile.Parameters[databaseC2ProfileParameter.Name] = interfaceParam
					}
					if _, err := database.DB.NamedExec(`INSERT INTO
							c2profileparametersinstance (payload_id, c2_profile_id, c2_profile_parameters_id, value, enc_key, dec_key, operation_id)
							VALUES (:payload_id, :c2_profile_id, :c2_profile_parameters_id, :value, :enc_key, :dec_key, :operation_id)`,
						c2ParameterInstance); err != nil {
						logging.LogError(err, "Failed to save c2 profile parameter instance into database")
						return nil, err
					}

				}
			}
		}
		// now map the c2 profile to the payload
		payloadC2Profile := databaseStructs.Payloadc2profiles{
			PayloadID:   databasePayload.ID,
			C2ProfileID: databaseC2Profile.ID,
		}
		if _, err := database.DB.NamedExec(`INSERT INTO
		payloadc2profiles (payload_id, c2_profile_id)
		VALUES (:payload_id, :c2_profile_id)`,
			payloadC2Profile); err != nil {
			logging.LogError(err, "Failed to save c2 profile payload mapping into database")
			return nil, err
		}
		finalC2Profiles = append(finalC2Profiles, finalC2Profile)
	}
	return finalC2Profiles, nil
}

func associateCommandsWithPayload(databasePayload databaseStructs.Payload, commands []string, commandGroups []string, buildParameters map[string]interface{}) ([]string, error) {
	// given the payload databasePayload, make sure that the commands exist and fit within the buildParameter specifications
	databaseCommands := []databaseStructs.Command{}
	finalCommands := []databaseStructs.Command{}
	finalCommandNames := []string{}
	// commands that explicitly can't go in the payload due to conflicting attribute requirements
	deniedCommandNames := []string{}
	err := database.DB.Select(&databaseCommands, `SELECT
		id, cmd, attributes, version, script_only
		FROM command
		WHERE payload_type_id=$1 and deleted=false
	`, databasePayload.PayloadTypeID)
	if err != nil {
		logging.LogError(err, "Failed to get commands from database when trying to build payload")
		return nil, err
	}
	for _, databaseCommand := range databaseCommands {
		if !databasePayload.Payloadtype.SupportsDynamicLoading {
			// the payload type doesn't support dynamic loading of commands, so we have to include all of the commands, regardless of what the user said
			finalCommands = append(finalCommands, databaseCommand)
			continue
		}
		// make sure that the commands attributes don't clash with the buildParameters. If they do, don't actually include it for the agent
		commandAttributes := CommandAttribute{}
		err = mapstructure.Decode(databaseCommand.Attributes.StructValue(), &commandAttributes)
		if err != nil {
			logging.LogError(err, "Failed to unmarshal command attributes", "command", databaseCommand)
			continue
		}
		// now that we have the command attributes, time to do some checks against the buildParameters to make sure all is good
		// first make sure that the command supports the operating system we selected
		if len(commandAttributes.SupportedOS) == 0 || utils.SliceContains(commandAttributes.SupportedOS, databasePayload.Os) {
			if commandAttributes.CommandIsBuiltin {
				// if the command is marked as built-in, we have to include it
				finalCommands = append(finalCommands, databaseCommand)
				finalCommandNames = append(finalCommandNames, databaseCommand.Cmd)
				continue
			}
			if commandAttributes.CommandCanOnlyBeLoadedLater {
				// can't be built in now, can only be loaded later
				deniedCommandNames = append(deniedCommandNames, databaseCommand.Cmd)
				continue
			}
			if len(commandAttributes.FilterCommandAvailabilityByAgentBuildParameters) > 0 {
				includeCommand := true
				// loop through the key-value pairs for the command
				for key, value := range commandAttributes.FilterCommandAvailabilityByAgentBuildParameters {
					// check to see if the key we see in the command is in our build parameters
					if buildParamValue, ok := buildParameters[key]; ok {
						// make sure that the build parameter value matches what the command required
						if value != buildParamValue {
							// if there's a mismatch, don't include the command
							includeCommand = false
						}
					}
				}
				if includeCommand && utils.SliceContains(commands, databaseCommand.Cmd) {
					// we aren't filtering out this command and the user specified it, so include it
					finalCommands = append(finalCommands, databaseCommand)
					finalCommandNames = append(finalCommandNames, databaseCommand.Cmd)
				} else if includeCommand && len(commands) == 0 && commandAttributes.CommandIsSuggested {
					// we aren't filtering out this command, but the user didn't specify any and this command is suggested, so include it
					finalCommands = append(finalCommands, databaseCommand)
					finalCommandNames = append(finalCommandNames, databaseCommand.Cmd)
				} else {
					deniedCommandNames = append(deniedCommandNames, databaseCommand.Cmd)
				}
				continue
			}
			// if the user didn't specify any commands, then just do the required and recommended ones
			if len(commands) == 0 && commandAttributes.CommandIsSuggested {
				finalCommands = append(finalCommands, databaseCommand)
				finalCommandNames = append(finalCommandNames, databaseCommand.Cmd)
				continue
			}
			if utils.SliceContains(commands, databaseCommand.Cmd) {
				finalCommands = append(finalCommands, databaseCommand)
				finalCommandNames = append(finalCommandNames, databaseCommand.Cmd)
				continue
			}
		} else {
			deniedCommandNames = append(deniedCommandNames, databaseCommand.Cmd)
		}
	}
	// now that we have all the commands selected, we need to process for any dependencies that might not be satisfied
	madeMods := true
	// keep looping while we're adjusting the final commands because we might have multiple layers of dependencies to add
	for madeMods {
		madeMods = false
		for _, command := range finalCommands {
			commandAttributes := CommandAttribute{}
			err = mapstructure.Decode(command.Attributes.StructValue(), &commandAttributes)
			if err != nil {
				logging.LogError(err, "Failed to unmarshal command attributes", "command", command)
				continue
			}
			if len(commandAttributes.Dependencies) > 0 {
				for _, dependency := range commandAttributes.Dependencies {
					if !utils.SliceContains(finalCommandNames, dependency) {
						// we're missing the dependency so far, see if we can find it in all the commands
						if utils.SliceContains(deniedCommandNames, dependency) {
							// uh oh, we included a command that depends on a rejected command
							return nil, errors.New(fmt.Sprintf("%s depends on %s, but %s isn't allowed with the currently selected parameters",
								command.Cmd, dependency))
						}
						// the dependency we have isn't included, but isn't explicitly denied, so just add it
						finalCommandNames = append(finalCommandNames, dependency)
						found := false
						for _, databaseCommand := range databaseCommands {
							if databaseCommand.Cmd == dependency {
								finalCommands = append(finalCommands, databaseCommand)
								found = true
								madeMods = true
								break
							}
						}
						if !found {
							// we have a dependency for a command that doesn't exist
							return nil, errors.New(fmt.Sprintf("%s depends on %s, but there is no %s command",
								command.Cmd, dependency, dependency))
						}
					}
				}
			}
		}
	}

	finalCommandNames = []string{}
	for _, command := range finalCommands {
		payloadCommandInstance := databaseStructs.Payloadcommand{
			PayloadID: databasePayload.ID,
			CommandID: command.ID,
			Version:   command.Version,
		}
		if _, err := database.DB.NamedExec(`INSERT INTO 
				payloadcommand (payload_id, command_id, version)
				VALUES (:payload_id, :command_id, :version)`,
			payloadCommandInstance); err != nil {
			logging.LogError(err, "Failed to create new command parameter instance mapping")
			return nil, err
		}
		if !command.ScriptOnly {
			finalCommandNames = append(finalCommandNames, command.Cmd)
		}
	}

	return finalCommandNames, nil
}
