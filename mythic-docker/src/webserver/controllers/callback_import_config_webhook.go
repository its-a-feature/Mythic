package webcontroller

import (
	"database/sql"
	"encoding/base64"
	"github.com/gin-gonic/gin"
	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"
)

type ImportCallbackConfigInput struct {
	Input ImportCallbackConfig `json:"input" binding:"required"`
}

type ImportCallbackConfig struct {
	Config ExportCallbackConfiguration `json:"config" binding:"required"`
}

type ImportCallbackConfigResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func ImportCallbackConfigWebhook(c *gin.Context) {
	// get variables from the POST request
	var input ImportCallbackConfigInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, ImportCallbackConfigResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		logging.LogError(nil, "Failed to get operatorOperation from gin context from middleware")
		c.JSON(http.StatusOK, ImportCallbackConfigResponse{
			Status: "error",
			Error:  "Failed to get current operation information",
		})
		return
	}
	callbackConfig := input.Input.Config
	// get the associated database information
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	// have to process the callback configuration in order from most generic to most specific
	translationContainer := databaseStructs.Translationcontainer{
		Name: callbackConfig.PayloadType.TranslationContainerName,
	}
	if callbackConfig.PayloadType.TranslationContainerName != "" {
		err = database.DB.Get(&translationContainer, `SELECT * FROM translationcontainer WHERE "name"=$1`, translationContainer.Name)
		if err != nil {
			if err == sql.ErrNoRows {
				// payload type doesn't exist, so we need to create it
				statement, err := database.DB.PrepareNamed(`INSERT INTO translationcontainer 
					("name") 
					VALUES (:name) 
					RETURNING id`)
				if err != nil {
					logging.LogError(err, "Failed to create new translationcontainer statement")
					c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
					return
				}
				err = statement.Get(&translationContainer.ID, translationContainer)
				if err != nil {
					logging.LogError(err, "Failed to create new translation container")
					c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
					return
				}
			} else {
				logging.LogError(err, "Failed to query translation container information")
				c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
			}
		}
	}
	// make sure callbackConfig.PayloadType exists (and create if needed)
	payloadtype := databaseStructs.Payloadtype{
		Name:           callbackConfig.PayloadType.Name,
		MythicEncrypts: callbackConfig.PayloadType.MythicEncrypts,
		SupportedOs:    rabbitmq.GetMythicJSONArrayFromStruct([]string{callbackConfig.Payload.Os}),
	}
	if translationContainer.ID > 0 {
		payloadtype.TranslationContainerID.Valid = true
		payloadtype.TranslationContainerID.Int64 = int64(translationContainer.ID)
	}
	err = database.DB.Get(&payloadtype, `SELECT * FROM payloadtype WHERE "name"=$1`, callbackConfig.PayloadType.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			// payload type doesn't exist, so we need to create it
			statement, err := database.DB.PrepareNamed(`INSERT INTO payloadtype 
			("name",mythic_encrypts,supported_os,translation_container_id) 
			VALUES (:name, :mythic_encrypts, :supported_os, :translation_container_id) 
			RETURNING id`,
			)
			if err != nil {
				logging.LogError(err, "Failed to create new payloadtype statement")
				c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
				return
			}
			err = statement.Get(&payloadtype.ID, payloadtype)
			if err != nil {
				logging.LogError(err, "Failed to create new payloadtype")
				c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
				return
			}
		} else {
			logging.LogError(err, "Failed to query payloadtype information")
			c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
			return
		}
	}
	// generate fake payload
	fileMeta := databaseStructs.Filemeta{
		AgentFileID:    uuid.NewString(),
		TotalChunks:    1,
		ChunksReceived: 1,
		Complete:       true,
		IsPayload:      true,
		Filename:       []byte(callbackConfig.PayloadFilename),
		OperationID:    operatorOperation.CurrentOperation.ID,
		OperatorID:     operatorOperation.CurrentOperator.ID,
	}
	statement, err := database.DB.PrepareNamed(`INSERT INTO filemeta
(total_chunks, chunks_received, complete, is_payload, filename, operation_id, operator_id, agent_file_id, path)
VALUES (:total_chunks, :chunks_received, :complete, :is_payload, :filename, :operation_id, :operator_id, :agent_file_id, :path) RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to make named statement for filemeta")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	err = statement.Get(&fileMeta.ID, fileMeta)
	if err != nil {
		logging.LogError(err, "Failed to create filemeta information")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	payload := databaseStructs.Payload{
		UuID:           callbackConfig.Payload.UuID,
		Description:    callbackConfig.Payload.Description,
		PayloadTypeID:  payloadtype.ID,
		OperationID:    operatorOperation.CurrentOperation.ID,
		Os:             callbackConfig.Payload.Os,
		BuildPhase:     callbackConfig.Payload.BuildPhase,
		BuildContainer: callbackConfig.Payload.BuildContainer,
		BuildMessage:   callbackConfig.Payload.BuildMessage,
		BuildStderr:    callbackConfig.Payload.BuildStderr,
		BuildStdout:    callbackConfig.Payload.BuildStdout,
		OperatorID:     operatorOperation.CurrentOperator.ID,
	}
	payload.FileID.Valid = true
	payload.FileID.Int64 = int64(fileMeta.ID)
	err = database.DB.Get(&payload, `SELECT * FROM payload WHERE uuid=$1`, payload.UuID)
	if err == sql.ErrNoRows {
		statement, err = database.DB.PrepareNamed(`INSERT INTO payload 
			(uuid,description,payload_type_id,operation_id,os,build_phase, build_container, build_message, build_stderr, build_stdout, operator_id, file_id) 
			VALUES (:uuid, :description, :payload_type_id, :operation_id, :os, :build_phase, :build_container, :build_message, :build_stderr, :build_stdout, :operator_id, :file_id) 
			RETURNING id`,
		)
		if err != nil {
			logging.LogError(err, "Failed to create new payload statement")
			c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
			return
		}
		err = statement.Get(&payload.ID, payload)
		if err != nil {
			logging.LogError(err, "Failed to create new payload")
			c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
			return
		}
		// make sure callbackConfig.PayloadType has callbackConfig.PayloadBuild parameters (and create if needed)
		for _, build := range callbackConfig.PayloadBuild {
			buildParameter := databaseStructs.Buildparameter{Name: build.Name, PayloadTypeID: payloadtype.ID,
				Description: build.Name}
			err = database.DB.Get(&buildParameter, `SELECT id, crypto_type FROM buildparameter WHERE "name"=$1 AND payload_type_id=$2`,
				buildParameter.Name, buildParameter.PayloadTypeID)
			if err != nil {
				if err == sql.ErrNoRows {
					// need to create the build parameter
					switch v := build.Value.(type) {
					case map[string]interface{}:
						if _, ok = v["enc_key"]; ok {
							buildParameter.IsCryptoType = true
							buildParameter.ParameterType = rabbitmq.BUILD_PARAMETER_TYPE_CHOOSE_ONE
						} else {
							buildParameter.ParameterType = rabbitmq.BUILD_PARAMETER_TYPE_DICTIONARY
						}
					case bool:
						buildParameter.ParameterType = rabbitmq.BUILD_PARAMETER_TYPE_BOOLEAN
					case float64:
						buildParameter.ParameterType = rabbitmq.BUILD_PARAMETER_TYPE_NUMBER
					case []interface{}:
						buildParameter.ParameterType = rabbitmq.BUILD_PARAMETER_TYPE_ARRAY
					default:
						buildParameter.ParameterType = rabbitmq.BUILD_PARAMETER_TYPE_STRING
					}
					statement, err = database.DB.PrepareNamed(`INSERT INTO buildparameter 
					("name", payload_type_id, crypto_type, parameter_type) 
					VALUES (:name, :payload_type_id, :crypto_type, :parameter_type) 
					RETURNING id`,
					)
					if err != nil {
						logging.LogError(err, "Failed to create new build parameter statement")
						c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
						return
					}
					err = statement.Get(&buildParameter.ID, buildParameter)
					if err != nil {
						logging.LogError(err, "Failed to create build parameter")
						c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
						return
					}
				} else {
					// actually ran into an error
					logging.LogError(err, "Failed to query build parameters")
					c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
					return
				}
			}
			buildParameterInstance := databaseStructs.Buildparameterinstance{
				BuildParameterID: buildParameter.ID,
				PayloadID:        payload.ID,
			}
			// need to create the build parameter
			switch v := build.Value.(type) {
			case map[string]interface{}:
				if _, ok = v["enc_key"]; ok {
					buildParameterInstance.Value = v["value"].(string)
					encKey, err := base64.StdEncoding.DecodeString(v["enc_key"].(string))
					if err != nil {
						logging.LogError(err, "Failed to decode encryption key")
						c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
						return
					} else {
						buildParameterInstance.EncKey = &encKey
					}
					decKey, err := base64.StdEncoding.DecodeString(v["dec_key"].(string))
					if err != nil {
						logging.LogError(err, "Failed to decode decryption key")
						c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
						return
					} else {
						buildParameterInstance.DecKey = &decKey
					}
				} else {
					buildParameterInstance.Value, err = rabbitmq.GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(buildParameter.ParameterType, build.Value)
					if err != nil {
						logging.LogError(err, "Failed to save build parameter")
						c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
						return
					}
				}
			default:
				buildParameterInstance.Value, err = rabbitmq.GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(buildParameter.ParameterType, build.Value)
				if err != nil {
					logging.LogError(err, "Failed to save build parameter")
					c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
					return
				}
			}
			// we now know that the build parameter exists, so we can create our instance and tie to the payload
			_, err = database.DB.NamedExec(`INSERT INTO buildparameterinstance 
			(build_parameter_id, payload_id, "value", enc_key, dec_key)
			VALUES (:build_parameter_id, :payload_id, :value, :enc_key, :dec_key)`, buildParameterInstance)
			if err != nil {
				logging.LogError(err, "Failed to save build parameter instance")
				c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
				return
			}
		}
	} else if err != nil {
		logging.LogError(err, "Failed to get payload data")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	// make sure payload C2 profiles exist (and create if needed)
	callbackConfig.Callback.OperationID = operatorOperation.CurrentOperation.ID
	callbackConfig.Callback.RegisteredPayloadID = payload.ID
	callbackConfig.Callback.OperatorID = operatorOperation.CurrentOperator.ID
	statement, err = database.DB.PrepareNamed(`INSERT INTO callback
(agent_callback_id, "user", host, pid, ip, external_ip, process_name, description, registered_payload_id, integrity_level,
 operation_id, crypto_type, enc_key, dec_key, os, architecture, "domain", extra_info, sleep_info, mythictree_groups, operator_id)
 VALUES (:agent_callback_id, :user, :host, :pid, :ip, :external_ip, :process_name, :description, :registered_payload_id,
         :integrity_level, :operation_id, :crypto_type, :enc_key, :dec_key, :os, :architecture, :domain, :extra_info, :sleep_info,
         :mythictree_groups, :operator_id) RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to prepare named statement for creating callback")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	err = statement.Get(&callbackConfig.Callback.ID, callbackConfig.Callback)
	if err != nil {
		logging.LogError(err, "Failed to create new callback")
		c.JSON(http.StatusOK, gin.H{"status": "error", "error": err.Error()})
		return
	}
	// make sure payload commands exist and add them if needed
	for _, cmd := range callbackConfig.PayloadCommands {
		err = ensureCommands(cmd, payloadtype.ID, 0, payload.ID, operatorOperation.CurrentOperator.ID)
		if err != nil {
			logging.LogError(err, "Failed to ensure command in payload")
		}
	}
	for _, cmd := range callbackConfig.CallbackCommands {
		err = ensureCommands(cmd, payloadtype.ID, callbackConfig.Callback.ID, 0, operatorOperation.CurrentOperator.ID)
		if err != nil {
			logging.LogError(err, "Failed to ensure command in callback")
		}
	}
	// make sure callback c2 profiles exist
	for _, c2 := range callbackConfig.CallbackC2 {
		err = ensureC2Profile(c2, callbackConfig.Callback.OperationID, callbackConfig.Callback.ID, 0)
		if err != nil {
			logging.LogError(err, "Failed to ensure callback c2 profile")
		}
	}
	for _, c2 := range callbackConfig.PayloadC2 {
		err = ensureC2Profile(c2, callbackConfig.Callback.OperationID, 0, payload.ID)
		if err != nil {
			logging.LogError(err, "Failed to ensure payload c2 profile")
		}
	}
	// make sure callback commands exist and add them if needed
	c.JSON(http.StatusOK, gin.H{"status": "success"})
	return
}

func ensureC2Profile(c2Info rabbitmq.PayloadConfigurationC2Profile, operationID int, callbackID int, payloadID int) error {
	c2profile := databaseStructs.C2profile{Name: c2Info.Name, IsP2p: c2Info.IsP2P}
	err := database.DB.Get(&c2profile, `SELECT * FROM c2profile WHERE "name"=$1`, c2profile.Name)
	if err != nil {
		if err == sql.ErrNoRows {
			// c2 profile doesn't exist, need to add it
			statement, err := database.DB.PrepareNamed(`INSERT INTO c2profile
				("name", is_p2p) VALUES (:name, :is_p2p) RETURNING id`)
			if err != nil {
				return err
			}
			err = statement.Get(&c2profile.ID, c2profile)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}
	for paramName, paramValue := range c2Info.Parameters {
		// ensure the parameters exist for the c2 profile and associate the callback ID
		c2ProfileParameter := databaseStructs.C2profileparameters{C2ProfileID: c2profile.ID, Name: paramName,
			Description: paramName}
		err = database.DB.Get(&c2ProfileParameter, `SELECT * FROM c2profileparameters WHERE
                                     c2_profile_id=$1 AND "name"=$2 AND deleted=false`, c2ProfileParameter.C2ProfileID, c2ProfileParameter.Name)
		if err != nil {
			if err == sql.ErrNoRows {
				// need to create the build parameter
				switch v := paramValue.(type) {
				case map[string]interface{}:
					if _, ok := v["enc_key"]; ok {
						c2ProfileParameter.IsCryptoType = true
						c2ProfileParameter.ParameterType = rabbitmq.C2_PARAMETER_TYPE_CHOOSE_ONE
					} else {
						c2ProfileParameter.ParameterType = rabbitmq.C2_PARAMETER_TYPE_DICTIONARY
					}
				case bool:
					c2ProfileParameter.ParameterType = rabbitmq.C2_PARAMETER_TYPE_BOOLEAN
				case float64:
					c2ProfileParameter.ParameterType = rabbitmq.C2_PARAMETER_TYPE_NUMBER
				case []interface{}:
					c2ProfileParameter.ParameterType = rabbitmq.C2_PARAMETER_TYPE_ARRAY
				default:
					c2ProfileParameter.ParameterType = rabbitmq.C2_PARAMETER_TYPE_STRING
				}
				statement, err := database.DB.PrepareNamed(`INSERT INTO c2profileparameters
					(c2_profile_id, "name", parameter_type, crypto_type, description)
					VALUES (:c2_profile_id, :name, :parameter_type, :crypto_type, :description) RETURNING id`)
				if err != nil {
					logging.LogError(err, "Failed to prepare named c2 profile parameters")
					return err
				}
				err = statement.Get(&c2ProfileParameter.ID, c2ProfileParameter)
				if err != nil {
					logging.LogError(err, "Failed to get c2 profile parameters")
					return err
				}
			} else {
				return err
			}
		}
		// c2 profile and c2 profile parameters exist, create a new instance
		c2ProfileParameterInstance := databaseStructs.C2profileparametersinstance{
			C2ProfileParametersID: c2ProfileParameter.ID,
			C2ProfileID:           c2profile.ID,
		}
		switch v := paramValue.(type) {
		case map[string]interface{}:
			if _, ok := v["enc_key"]; ok {
				c2ProfileParameterInstance.Value = v["value"].(string)
				encKey, err := base64.StdEncoding.DecodeString(v["enc_key"].(string))
				if err != nil {
					logging.LogError(err, "Failed to decode encryption key")
					return err
				} else {
					c2ProfileParameterInstance.EncKey = &encKey
				}
				decKey, err := base64.StdEncoding.DecodeString(v["dec_key"].(string))
				if err != nil {
					logging.LogError(err, "Failed to decode decryption key")
					return err
				} else {
					c2ProfileParameterInstance.DecKey = &decKey
				}
			} else {
				c2ProfileParameterInstance.Value, err = rabbitmq.GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(c2ProfileParameter.ParameterType, paramValue)
				if err != nil {
					logging.LogError(err, "Failed to save c2 profile parameter instance value")
					return err
				}
			}
		default:
			c2ProfileParameterInstance.Value, err = rabbitmq.GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(c2ProfileParameter.ParameterType, paramValue)
			if err != nil {
				logging.LogError(err, "Failed to save c2 profile parameter instance value")
				return err
			}
		}
		if callbackID > 0 {
			c2ProfileParameterInstance.CallbackID.Valid = true
			c2ProfileParameterInstance.CallbackID.Int64 = int64(callbackID)
		} else {
			c2ProfileParameterInstance.PayloadID.Valid = true
			c2ProfileParameterInstance.PayloadID.Int64 = int64(payloadID)
		}
		c2ProfileParameterInstance.C2ProfileID = c2profile.ID
		c2ProfileParameterInstance.OperationID.Valid = true
		c2ProfileParameterInstance.OperationID.Int64 = int64(operationID)
		// we now know that the build parameter exists, so we can create our instance and tie to the payload
		_, err = database.DB.NamedExec(`INSERT INTO c2profileparametersinstance 
			(c2_profile_parameters_id, payload_id, callback_id, "value", enc_key, dec_key, c2_profile_id, operation_id)
			VALUES (:c2_profile_parameters_id, :payload_id, :callback_id, :value, :enc_key, :dec_key, :c2_profile_id, :operation_id)`,
			c2ProfileParameterInstance)
		if err != nil {
			logging.LogError(err, "Failed to save c2 profile parameters instance")
			return err
		}
	}
	return nil
}
func ensureCommands(cmdName string, payloadTypeID int, callbackID int, payloadID int, operatorID int) error {
	command := databaseStructs.Command{Cmd: cmdName, PayloadTypeID: payloadTypeID}
	err := database.DB.Get(&command, `SELECT id FROM command WHERE cmd=$1 AND payload_type_id=$2`,
		cmdName, payloadTypeID)
	if err != nil {
		if err == sql.ErrNoRows {
			// need to create it
			statement, err := database.DB.PrepareNamed(`INSERT INTO command (cmd, payload_type_id)
			VALUES (:cmd, :payload_type_id) RETURNING id`)
			if err != nil {
				return err
			}
			err = statement.Get(&command.ID, command)
			if err != nil {
				return err
			}
		} else {
			return err
		}
	}
	if callbackID > 0 {
		_, err = database.DB.Exec(`INSERT INTO loadedcommands (command_id, callback_id, operator_id)
			VALUES ($1, $2, $3)`, command.ID, callbackID, operatorID)
		return err
	}
	if payloadID > 0 {
		_, err = database.DB.Exec(`INSERT INTO payloadcommand (payload_id, command_id)
			VALUES ($1, $2)`, payloadID, command.ID)
		return err
	}
	return nil
}
