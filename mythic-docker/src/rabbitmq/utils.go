package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"github.com/its-a-feature/Mythic/eventing"
	"github.com/mitchellh/mapstructure"
	"math"
	"os"
	"path/filepath"
	"strconv"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

// Build Parameter information for PayloadSyncing and Payload Building
func getSyncToDatabaseValueForChoices(parameterType string, choices []string, dictionaryChoices []ParameterDictionary) (databaseStructs.MythicJSONArray, error) {
	switch parameterType {
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM:
		fallthrough
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE:
		fallthrough
	case BUILD_PARAMETER_TYPE_ARRAY:
		fallthrough
	case BUILD_PARAMETER_TYPE_TYPED_ARRAY:
		fallthrough
	case BUILD_PARAMETER_TYPE_CHOOSE_MULTIPLE:
		return GetMythicJSONArrayFromStruct(choices), nil
	case BUILD_PARAMETER_TYPE_DICTIONARY:
		return GetMythicJSONArrayFromStruct(dictionaryChoices), nil
	case BUILD_PARAMETER_TYPE_STRING:
		fallthrough
	case BUILD_PARAMETER_TYPE_BOOLEAN:
		fallthrough
	case BUILD_PARAMETER_TYPE_NUMBER:
		fallthrough
	case BUILD_PARAMETER_TYPE_FILE:
		fallthrough
	case BUILD_PARAMETER_TYPE_FILE_MULTIPLE:
		fallthrough
	case BUILD_PARAMETER_TYPE_DATE:
		return databaseStructs.MythicJSONArray{}, nil
	default:
		logging.LogError(nil, "bad parameter type for converting SyncToDatabaseValueForChoices", "parameter type", parameterType)
		return databaseStructs.MythicJSONArray{}, errors.New("bad type")
	}
}
func getSyncToDatabaseValueForDefaultValue(parameterType string, defaultValue interface{}, choices []string) (string, error) {
	switch parameterType {
	case BUILD_PARAMETER_TYPE_TYPED_ARRAY:
		switch v := defaultValue.(type) {
		case string:
			return v, nil
		case nil:
			if len(choices) > 0 {
				return choices[0], nil
			}
			return "", nil
		case []interface{}:
			if len(v) == 0 {
				return "", nil
			}
			return fmt.Sprintf("%v", v[0]), nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_TYPED_ARRAY: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_STRING", "value", v, "defaultValue", defaultValue)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_STRING:
		switch v := defaultValue.(type) {
		case string:
			return v, nil
		case nil:
			if len(choices) > 0 {
				return choices[0], nil
			}
			return "", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_STRING: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_STRING", "value", v, "defaultValue", defaultValue)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_CHOOSE_MULTIPLE:
		fallthrough
	case BUILD_PARAMETER_TYPE_ARRAY:
		switch v := defaultValue.(type) {
		case []interface{}:
			if defaultBytes, err := json.Marshal(v); err != nil {
				logging.LogError(err, "Failed to marshal default array value", "value", v)
				return "", errors.New("Failed to marshal default array value")
			} else {
				return string(defaultBytes), nil
			}
		case nil:
			return "[]", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_ARRAY: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_ARRAY", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_FILE_MULTIPLE:
		return "[]", nil
	case BUILD_PARAMETER_TYPE_BOOLEAN:
		switch v := defaultValue.(type) {
		case bool:
			if v {
				return "true", nil
			} else {
				return "false", nil
			}
		case string:
			if strings.ToLower(v) == "false" {
				return "false", nil
			} else if strings.ToLower(v) == "true" {
				return "true", nil
			} else {
				tmpErr := errors.New("Boolean value not true or false")
				logging.LogError(tmpErr, "boolean default_value was supplied a string not 'true' or 'false'", "value", v)
				return "", tmpErr
			}
		case nil:
			return "false", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_BOOLEAN: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_BOOLEAN", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_NUMBER:
		switch v := defaultValue.(type) {
		case string:
			return strings.TrimSpace(v), nil
		case int64:
			return fmt.Sprintf("%v", v), nil
		case float64:
			return fmt.Sprintf("%v", int(math.Round(v))), nil
		case int:
			return fmt.Sprintf("%v", v), nil
		case nil:
			return "0", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_NUMBER: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_NUMBER", "type", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_DICTIONARY:
		return "", nil
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM:
		switch v := defaultValue.(type) {
		case string:
			return v, nil
		case nil:
			if len(choices) > 0 {
				return choices[0], nil
			} else {
				return "", nil
			}
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE:
		switch v := defaultValue.(type) {
		case string:
			if len(choices) == 0 {
				tmpErr := errors.New("parameter type choose one has no choices available")
				logging.LogError(tmpErr, "default value not in choices because choices for *_PARAMETER_TYPE_CHOOSE_ONE is empty")
				return "", tmpErr
			} else if !utils.SliceContains(choices, v) {
				tmpErr := errors.New(fmt.Sprintf("Parameter type choose one has a default value not in the choices: %v, %s", choices, v))
				logging.LogError(tmpErr, "default value for parameter type *_PARAMETER_TYPE_CHOOSE_ONE isn't in choices")
				return "", tmpErr
			} else {
				return v, nil
			}

		case nil:
			if len(choices) > 0 {
				return choices[0], nil
			} else {
				return "", nil
			}
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_CHOOSE_ONE: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_CHOOSE_ONE", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_DATE:
		switch v := defaultValue.(type) {
		case float64:
			return fmt.Sprintf("%v", v), nil
		case int64:
			return fmt.Sprintf("%v", v), nil
		case int:
			return fmt.Sprintf("%v", v), nil
		case nil:
			return "1", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_DATE: %T", v))
			logging.LogError(tmpErr, "bad type of default value for parameter type *_PARAMETER_TYPE_DATE", "value", defaultValue)
			return "", tmpErr
		}
	case COMMAND_PARAMETER_TYPE_CONNECTION_INFO:
		fallthrough
	case COMMAND_PARAMETER_TYPE_LINK_INFO:
		fallthrough
	case COMMAND_PARAMETER_TYPE_CREDENTIAL:
		fallthrough
	case COMMAND_PARAMETER_TYPE_PAYLOAD_LIST:
		fallthrough
	case COMMAND_PARAMETER_TYPE_FILE:
		return "", nil
	default:
		logging.LogError(nil, "unknown parameter type", "type", parameterType)
		return "", errors.New("Unknown parameter type")
	}
}
func GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(parameterType string, userSuppliedValue interface{}) (string, error) {
	switch parameterType {
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE:
		fallthrough
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM:
		fallthrough
	case BUILD_PARAMETER_TYPE_STRING:
		switch v := userSuppliedValue.(type) {
		case string:
			return strings.TrimSpace(v), nil
		case nil:
			return "", nil
		case map[string]interface{}:
			if val, ok := v["value"]; !ok {
				tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_STRING: %T", v))
				logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_STRING", "value", v)
				return "", tmpErr
			} else {
				return strings.TrimSpace(val.(string)), nil
			}
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_STRING: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_STRING", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_CHOOSE_MULTIPLE:
		fallthrough
	case BUILD_PARAMETER_TYPE_FILE_MULTIPLE:
		fallthrough
	case BUILD_PARAMETER_TYPE_ARRAY:
		switch v := userSuppliedValue.(type) {
		case []interface{}:
			if defaultBytes, err := json.Marshal(v); err != nil {
				logging.LogError(err, "Failed to marshal array value", "value", userSuppliedValue)
				return "", errors.New("Failed to marshal array value")
			} else {
				return string(defaultBytes), nil
			}
		case nil:
			return "[]", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_ARRAY: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_ARRAY", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_TYPED_ARRAY:
		switch v := userSuppliedValue.(type) {
		case [][]interface{}:
			if defaultBytes, err := json.Marshal(v); err != nil {
				logging.LogError(err, "Failed to marshal array value", "value", userSuppliedValue)
				return "", errors.New("Failed to marshal array value")
			} else {
				return string(defaultBytes), nil
			}
		case nil:
			return "[]", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_TYPED_ARRAY: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_TYPED_ARRAY", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_BOOLEAN:
		switch v := userSuppliedValue.(type) {
		case bool:
			if v {
				return "true", nil
			} else {
				return "false", nil
			}
		case string:
			if strings.ToLower(v) == "false" {
				return "false", nil
			} else if strings.ToLower(v) == "true" {
				return "true", nil
			} else {
				logging.LogError(nil, "boolean was supplied a string not 'true' or 'false'", "value", userSuppliedValue)
				return "", errors.New("Boolean value not true or false")
			}
		case nil:
			return "false", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_BOOLEAN: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_BOOLEAN", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_NUMBER:
		switch v := userSuppliedValue.(type) {
		case string:
			return strings.TrimSpace(v), nil
		case int64:
			return fmt.Sprintf("%v", v), nil
		case float64:
			return fmt.Sprintf("%v", int(math.Round(v))), nil
		case int:
			return fmt.Sprintf("%v", v), nil
		case nil:
			return "0", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_NUMBER: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_NUMBER", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_DICTIONARY:
		switch v := userSuppliedValue.(type) {
		case map[string]interface{}:
			if defaultBytes, err := json.Marshal(v); err != nil {
				logging.LogError(err, "Failed to marshal dictionary value", "value", userSuppliedValue)
				return "", errors.New("Failed to marshal dictionary value")
			} else {
				return string(defaultBytes), nil
			}
		case string:
			return strings.TrimSpace(v), nil
		case nil:
			return "{}", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_DICTIONARY: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_DICTIONARY", "value", v)
			return "", tmpErr
		}
	case BUILD_PARAMETER_TYPE_DATE:
		switch v := userSuppliedValue.(type) {
		case float64:
			newTime := time.Now().UTC().AddDate(0, 0, int(v)).Format(TIME_FORMAT_STRING_YYYY_MM_DD)
			return newTime, nil
		case string:
			if intVal, err := strconv.Atoi(v); err != nil {
				return strings.TrimSpace(v), nil
			} else {
				newTime := time.Now().UTC().AddDate(0, 0, intVal).Format(TIME_FORMAT_STRING_YYYY_MM_DD)
				return newTime, nil
			}
		case int64:
			newTime := time.Now().UTC().AddDate(0, 0, int(v)).Format(TIME_FORMAT_STRING_YYYY_MM_DD)
			return newTime, nil
		case nil:
			newTime := time.Now().UTC().AddDate(0, 0, 1).Format(TIME_FORMAT_STRING_YYYY_MM_DD)
			return newTime, nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_DATE: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_DATE", "value", v)
			return "", tmpErr
		}
	case COMMAND_PARAMETER_TYPE_FILE:
		switch v := userSuppliedValue.(type) {
		case string:
			return strings.TrimSpace(v), nil
		case nil:
			return "", nil
		default:
			tmpErr := errors.New(fmt.Sprintf("bad type for *_PARAMETER_TYPE_STRING: %T", v))
			logging.LogError(tmpErr, "bad type of value for parameter type *_PARAMETER_TYPE_STRING", "value", v)
			return "", tmpErr
		}
	case COMMAND_PARAMETER_TYPE_CONNECTION_INFO:
		fallthrough
	case COMMAND_PARAMETER_TYPE_LINK_INFO:
		fallthrough
	case COMMAND_PARAMETER_TYPE_CREDENTIAL:
		fallthrough
	case COMMAND_PARAMETER_TYPE_PAYLOAD_LIST:
		return "", nil
	default:
		logging.LogError(nil, "unknown parameter type", "type", parameterType)
		return "", errors.New("Unknown parameter type")
	}
}
func GetMythicJSONTextFromStruct(input interface{}) databaseStructs.MythicJSONText {
	newType := databaseStructs.MythicJSONText{}
	if err := newType.Scan(input); err != nil {
		logging.LogError(err, "Failed to marshal struct into databaseStructs.MythicJSONText")
	}
	return newType
}
func GetMythicJSONArrayFromStruct(input interface{}) databaseStructs.MythicJSONArray {
	newType := databaseStructs.MythicJSONArray{}
	if err := newType.Scan(input); err != nil {
		logging.LogError(err, "Failed to marshal struct into databaseStructs.MythicJSONArray")
	}
	return newType
}
func getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString(parameterType string, defaultValue string, choices []interface{}, randomize bool, formatString string) (string, error) {
	if randomize {
		if random, err := utils.Generate(formatString, 10); err != nil {
			logging.LogError(err, "Failed to generate new randomized string", "randomizer", formatString)
			return "", err
		} else {
			return random, nil
		}
	}
	switch parameterType {
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM:
		fallthrough
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE:
		if defaultValue == "" {
			stringChoices := make([]string, len(choices))
			for i, c := range choices {
				switch v := c.(type) {
				case string:
					stringChoices[i] = v
				default:
					logging.LogError(nil, "Got a non-string choice when tring to getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString")
					return "", errors.New("Got non-string choice")
				}
			}
			if utils.SliceContains(stringChoices, defaultValue) {
				return defaultValue, nil
			} else if len(stringChoices) > 0 {
				return stringChoices[0], nil
			} else {
				logging.LogError(nil, "Trying to get default value for ChooseOne for instance creation, but no choices and no value supplied")
				return defaultValue, nil
			}
		} else {
			return strings.TrimSpace(defaultValue), nil
		}
	case BUILD_PARAMETER_TYPE_FILE:
		fallthrough
	case BUILD_PARAMETER_TYPE_STRING:
		return strings.TrimSpace(defaultValue), nil
	case BUILD_PARAMETER_TYPE_CHOOSE_MULTIPLE:
		// default value synced to database should be a json string
		fallthrough
	case BUILD_PARAMETER_TYPE_ARRAY:
		// default value synced to database should be a json string
		return strings.TrimSpace(defaultValue), nil
	case BUILD_PARAMETER_TYPE_TYPED_ARRAY:
		return "[]", nil
	case BUILD_PARAMETER_TYPE_BOOLEAN:
		return strings.TrimSpace(defaultValue), nil
	case BUILD_PARAMETER_TYPE_NUMBER:
		return strings.TrimSpace(defaultValue), nil
	case BUILD_PARAMETER_TYPE_DICTIONARY:
		// need to generate the base dictionary from the dictionary array choices and create a string
		var dictionaryChoices []ParameterDictionary
		if defaultValue == "" {
			// use choices
			if err := mapstructure.Decode(choices, &dictionaryChoices); err != nil {
				logging.LogError(err, "Failed to decode mapstructure of base dictionary choices")
				return "", err
			}
		} else if err := json.Unmarshal([]byte(defaultValue), &dictionaryChoices); err != nil {
			logging.LogError(err, "Failed to unmarshal dictionary choices")
			return "", err
		}
		dictionary := make(map[string]interface{})
		for _, opt := range dictionaryChoices {
			if opt.DefaultShow {
				dictionary[opt.Name] = opt.DefaultValue
			}
		}
		if dictionaryBytes, err := json.Marshal(dictionary); err != nil {
			logging.LogError(err, "Failed to convert default dictionary to string")
			return "", err
		} else {
			return string(dictionaryBytes), nil
		}

	case BUILD_PARAMETER_TYPE_DATE:
		// date number is stored as the default value, so convert to new string
		if number, err := strconv.Atoi(defaultValue); err != nil {
			logging.LogError(err, "Failed to get default value for date")
			return "", err
		} else {
			newTime := time.Now().UTC().AddDate(0, 0, number).Format(TIME_FORMAT_STRING_YYYY_MM_DD)
			return newTime, nil
		}
	default:
		logging.LogError(nil, "unknown parameter type", "type", parameterType)
		return "", errors.New("Unknown parameter type")
	}
}
func GetInterfaceValueForContainer(parameterType string, finalString string, encKey *[]byte, decKey *[]byte, cryptoType bool) (interface{}, error) {
	switch parameterType {
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE:
		if cryptoType {
			return map[string]interface{}{
				"value":   strings.TrimSpace(finalString),
				"enc_key": encKey,
				"dec_key": decKey,
			}, nil
		} else {
			return strings.TrimSpace(finalString), nil
		}
	case BUILD_PARAMETER_TYPE_CHOOSE_ONE_CUSTOM:
		fallthrough
	case BUILD_PARAMETER_TYPE_STRING:
		return strings.TrimSpace(finalString), nil
	case BUILD_PARAMETER_TYPE_CHOOSE_MULTIPLE:
		fallthrough
	case BUILD_PARAMETER_TYPE_FILE_MULTIPLE:
		fallthrough
	case BUILD_PARAMETER_TYPE_ARRAY:
		var arrayValues []interface{}
		if err := json.Unmarshal([]byte(finalString), &arrayValues); err != nil {
			logging.LogError(err, "Failed to convert final string back to array for container")
			return "[]", err
		} else {
			return arrayValues, nil
		}
	case BUILD_PARAMETER_TYPE_TYPED_ARRAY:
		var arrayValues [][]interface{}
		if err := json.Unmarshal([]byte(finalString), &arrayValues); err != nil {
			logging.LogError(err, "Failed to convert final string back to an array of tuples for container")
			return "[]", err
		} else {
			return arrayValues, nil
		}
	case BUILD_PARAMETER_TYPE_BOOLEAN:
		if strings.ToLower(finalString) == "false" {
			return false, nil
		} else if strings.ToLower(finalString) == "true" {
			return true, nil
		} else {
			logging.LogError(nil, "Failed to convert boolean string to boolean")
			return false, errors.New("bad boolean value")
		}
	case BUILD_PARAMETER_TYPE_NUMBER:
		if value, err := strconv.Atoi(finalString); err != nil {
			logging.LogError(err, "Failed to convert number string back to int")
			return 0, err
		} else {
			return value, nil
		}
	case BUILD_PARAMETER_TYPE_DICTIONARY:
		// need to generate the base dictionary from the dictionary array choices and create a string
		var dictionary map[string]interface{}
		if err := json.Unmarshal([]byte(finalString), &dictionary); err != nil {
			logging.LogError(err, "Failed to convert dictionary string to map")
			return "", err
		} else {
			return dictionary, nil
		}
	case BUILD_PARAMETER_TYPE_DATE:
		return strings.TrimSpace(finalString), nil
	case BUILD_PARAMETER_TYPE_FILE:
		return strings.TrimSpace(finalString), nil
	default:
		logging.LogError(nil, "unknown parameter type", "type", parameterType)
		return "", errors.New("Unknown parameter type")
	}
}

// Payload information for exporting, rebuilding
func GetPayloadC2ProfileInformation(payload databaseStructs.Payload) *[]PayloadConfigurationC2Profile {
	c2profileParameterInstances := []databaseStructs.C2profileparametersinstance{}
	if err := database.DB.Select(&c2profileParameterInstances, `SELECT 
	c2profile.name "c2profile.name",
	c2profile.id "c2profile.id",
	c2profile.is_p2p "c2profile.is_p2p",
	value, enc_key, dec_key,
	c2profileparameters.crypto_type "c2profileparameters.crypto_type", 
	c2profileparameters.parameter_type "c2profileparameters.parameter_type",
	c2profileparameters.name "c2profileparameters.name"
	FROM c2profileparametersinstance 
	JOIN c2profileparameters ON c2profileparametersinstance.c2_profile_parameters_id = c2profileparameters.id 
	JOIN c2profile ON c2profileparametersinstance.c2_profile_id = c2profile.id
	WHERE payload_id=$1`, payload.ID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile parameters from database for payload", "payload_id", payload.ID)
		return nil
	}
	parametersMap := make(map[string][]databaseStructs.C2profileparametersinstance)
	for _, parameter := range c2profileParameterInstances {
		if _, ok := parametersMap[parameter.C2Profile.Name]; ok {
			// we've already seen parameter.C2Profile.Name before, add to the array
			parametersMap[parameter.C2Profile.Name] = append(parametersMap[parameter.C2Profile.Name], parameter)
		} else {
			// we haven't seen parameter.C2Profile.Name before, create the array
			parametersMap[parameter.C2Profile.Name] = []databaseStructs.C2profileparametersinstance{parameter}
		}
	}
	finalC2Profiles := []PayloadConfigurationC2Profile{}
	for c2ProfileName, c2ProfileGroup := range parametersMap {
		isP2P := false
		parametersValueDictionary := make(map[string]interface{})
		for _, parameter := range c2ProfileGroup {
			if parameter.C2Profile.IsP2p {
				isP2P = true
			}
			if interfaceParam, err := GetInterfaceValueForContainer(
				parameter.C2ProfileParameter.ParameterType,
				parameter.Value,
				parameter.EncKey,
				parameter.DecKey,
				parameter.C2ProfileParameter.IsCryptoType); err != nil {
				logging.LogError(err, "Failed to get c2 profile parameter instance interface")
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = parameter.Value
			} else {
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = interfaceParam
			}
		}
		finalC2Profiles = append(finalC2Profiles, PayloadConfigurationC2Profile{
			Name:       c2ProfileName,
			Parameters: parametersValueDictionary,
			IsP2P:      isP2P,
		})
	}
	return &finalC2Profiles
}
func GetCallbackC2ProfileInformation(callback databaseStructs.Callback) *[]PayloadConfigurationC2Profile {
	c2profileParameterInstances := []databaseStructs.C2profileparametersinstance{}
	if err := database.DB.Select(&c2profileParameterInstances, `SELECT 
	c2profile.name "c2profile.name",
	c2profile.id "c2profile.id",
	c2profile.is_p2p "c2profile.is_p2p",
	value, enc_key, dec_key,
	c2profileparameters.crypto_type "c2profileparameters.crypto_type", 
	c2profileparameters.parameter_type "c2profileparameters.parameter_type",
	c2profileparameters.name "c2profileparameters.name"
	FROM c2profileparametersinstance 
	JOIN c2profileparameters ON c2profileparametersinstance.c2_profile_parameters_id = c2profileparameters.id 
	JOIN c2profile ON c2profileparametersinstance.c2_profile_id = c2profile.id
	WHERE callback_id=$1`, callback.ID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile parameters from database for callback", "callback_id", callback.ID)
		return nil
	}
	parametersMap := make(map[string][]databaseStructs.C2profileparametersinstance)
	for _, parameter := range c2profileParameterInstances {
		if _, ok := parametersMap[parameter.C2Profile.Name]; ok {
			// we've already seen parameter.C2Profile.Name before, add to the array
			parametersMap[parameter.C2Profile.Name] = append(parametersMap[parameter.C2Profile.Name], parameter)
		} else {
			// we haven't seen parameter.C2Profile.Name before, create the array
			parametersMap[parameter.C2Profile.Name] = []databaseStructs.C2profileparametersinstance{parameter}
		}
	}
	finalC2Profiles := []PayloadConfigurationC2Profile{}
	for c2ProfileName, c2ProfileGroup := range parametersMap {
		parametersValueDictionary := make(map[string]interface{})
		isP2P := false
		for _, parameter := range c2ProfileGroup {
			if parameter.C2Profile.IsP2p {
				isP2P = true
			}
			if interfaceParam, err := GetInterfaceValueForContainer(
				parameter.C2ProfileParameter.ParameterType,
				parameter.Value,
				parameter.EncKey,
				parameter.DecKey,
				parameter.C2ProfileParameter.IsCryptoType); err != nil {
				logging.LogError(err, "Failed to get c2 profile parameter instance interface")
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = parameter.Value
			} else {
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = interfaceParam
			}
		}
		finalC2Profiles = append(finalC2Profiles, PayloadConfigurationC2Profile{
			Name:       c2ProfileName,
			Parameters: parametersValueDictionary,
			IsP2P:      isP2P,
		})
	}
	return &finalC2Profiles
}

func GetBuildParameterInformation(payloadID int) *[]PayloadConfigurationBuildParameter {
	buildParameters := []databaseStructs.Buildparameterinstance{}
	if err := database.DB.Select(&buildParameters, `SELECT
	buildparameterinstance.value,
	buildparameterinstance.enc_key,
	buildparameterinstance.dec_key,
	buildparameter.name "buildparameter.name",
	buildparameter.parameter_type "buildparameter.parameter_type",
	buildparameter.crypto_type "buildparameter.crypto_type"
	FROM
	buildparameterinstance
	JOIN buildparameter ON buildparameterinstance.build_parameter_id = buildparameter.id
	WHERE
	buildparameterinstance.payload_id=$1
	`, payloadID); err != nil {
		logging.LogError(err, "Failed to get build parameters for payload")
		return nil
	} else {
		buildValues := make([]PayloadConfigurationBuildParameter, len(buildParameters))
		for index, parameter := range buildParameters {
			buildValues[index].Name = parameter.BuildParameter.Name
			if interfaceParam, err := GetInterfaceValueForContainer(
				parameter.BuildParameter.ParameterType,
				parameter.Value,
				parameter.EncKey,
				parameter.DecKey,
				parameter.BuildParameter.IsCryptoType); err != nil {
				logging.LogError(err, "Failed to get c2 profile parameter instance interface")
				buildValues[index].Value = parameter.Value
			} else {
				buildValues[index].Value = interfaceParam
			}
		}
		return &buildValues
	}
}

func GetPayloadCommandInformation(payload databaseStructs.Payload) []string {
	commands := []databaseStructs.Payloadcommand{}
	if err := database.DB.Select(&commands, `SELECT 
	command.cmd "command.cmd" 
	FROM payloadcommand 
	JOIN command ON payloadcommand.command_id = command.id
	WHERE payloadcommand.payload_id=$1 ORDER BY command.cmd`, payload.ID); err != nil {
		logging.LogError(err, "Failed to fetch commands for payload")
		return []string{}
	} else {
		commandStrings := make([]string, len(commands))
		for index, command := range commands {
			commandStrings[index] = command.Command.Cmd
		}
		return commandStrings
	}
}
func GetCallbackCommandInformation(callback databaseStructs.Callback) []string {
	commands := []databaseStructs.Loadedcommands{}
	if err := database.DB.Select(&commands, `SELECT 
	command.cmd "command.cmd" 
	FROM loadedcommands 
	JOIN command ON loadedcommands.command_id = command.id
	WHERE loadedcommands.callback_id=$1 ORDER BY command.cmd`, callback.ID); err != nil {
		logging.LogError(err, "Failed to fetch commands for payload")
		return []string{}
	} else {
		commandStrings := make([]string, len(commands))
		for index, command := range commands {
			commandStrings[index] = command.Command.Cmd
		}
		return commandStrings
	}
}

var completionMutex sync.Mutex

// Helper functions for getting information for sending Task data to a container
func CheckAndProcessTaskCompletionHandlers(taskId int) {
	// check if this task has a completion function
	logging.LogDebug("starting task completion handler processing, waiting for lock")
	completionMutex.Lock()
	logging.LogDebug("starting task completion handler processing with lock")
	defer func() {
		completionMutex.Unlock()
		logging.LogDebug("exiting task completion handler processing and releasing lock")
	}()
	//logging.LogInfo("kicking off CheckAndProcessTaskCompletionHandlers", "taskId", taskId)
	task := databaseStructs.Task{}
	parentTask := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT
		task.parent_task_id, task.operator_id, task.completed,
		task.subtask_callback_function, task.subtask_callback_function_completed,
		task.group_callback_function, task.group_callback_function_completed, task.completed_callback_function,
		task.completed_callback_function_completed, task.subtask_group_name, task.id, task.status, task.eventstepinstance_id
		FROM task
		WHERE task.id=$1`, taskId)
	if err != nil {
		logging.LogError(err, "Failed to check for completion functions for task")
	}
	if !task.Completed {
		return
	}
	_, err = database.DB.Exec(`UPDATE apitokens SET deleted=true AND active=false WHERE task_id=$1`, taskId)
	if err != nil {
		logging.LogError(err, "Failed to update the apitokens to set to deleted")
	}
	if task.ParentTaskID.Valid {
		err = database.DB.Get(&parentTask, `SELECT 
    		task.id, task.status, task.completed, task.eventstepinstance_id, task.completed_callback_function_completed,
    		task.subtask_callback_function,
    		c.script_only "command.script_only"
    		from task
    		LEFT OUTER JOIN command c on task.command_id = c.id
    		WHERE task.id=$1`, task.ParentTaskID.Int64)
		if err != nil {
			logging.LogError(err, "Failed to get parent task information")
		}
	}
	// now we have info for both the current task that finished something and the parent task (if there is one)
	if task.CompletedCallbackFunction != "" && !task.CompletedCallbackFunctionCompleted {
		// this task has a completion function set, and it hasn't been executed, so run it
		// ex in create_tasking: completionFunctionName := "shellCompleted"
		//	response.CompletionFunctionName = &completionFunctionName
		// this function is executed for the TASK
		taskMessage := PTTaskCompletionFunctionMessage{
			TaskData:               GetTaskConfigurationForContainer(task.ID),
			CompletionFunctionName: task.CompletedCallbackFunction,
		}
		task.Status = PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION
		if _, err := database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
			logging.LogError(err, "Failed to update status to completion task running")
		} else if err = RabbitMQConnection.SendPtTaskCompletionFunction(taskMessage); err != nil {
			logging.LogError(err, "Failed to send task completion function message to container")
			task.Status = PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION_ERROR
			if _, err = database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
				logging.LogError(err, "Failed to update task status for completion function error")
			}
		}
	} else if task.SubtaskCallbackFunction != "" && !task.SubtaskCallbackFunctionCompleted {
		// this task has a subtask callback function, and that subtask function hasn't completed successfully
		// ex in create_tasking:
		//	completionFunctionName := "pwdCompleted"
		//	if responseCreate, err := mythicrpc.SendMythicRPCTaskCreateSubtask(mythicrpc.MythicRPCTaskCreateSubtaskMessage{
		//		TaskID:      taskData.Task.ID,
		//		CommandName: "pwd",
		//		SubtaskCallbackFunction: &completionFunctionName,
		//	});
		// this function is executed for the PARENT_TASK
		subtaskData := GetTaskConfigurationForContainer(task.ID)
		taskMessage := PTTaskCompletionFunctionMessage{
			TaskData:               GetTaskConfigurationForContainer(int(task.ParentTaskID.Int64)),
			SubtaskData:            &subtaskData,
			CompletionFunctionName: task.SubtaskCallbackFunction,
		}
		task.Status = PT_TASK_FUNCTION_STATUS_SUBTASK_COMPLETED_FUNCTION
		if _, err := database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
			logging.LogError(err, "Failed to update status to completion task running")
		} else if err = RabbitMQConnection.SendPtTaskCompletionFunction(taskMessage); err != nil {
			logging.LogError(err, "Failed to send task completion function message to container")
			task.Status = PT_TASK_FUNCTION_STATUS_SUBTASK_COMPLETED_FUNCTION_ERROR
			if _, err = database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
				logging.LogError(err, "Failed to update task status for completion function error")
			}
		}
	} else if task.SubtaskGroupName != "" && task.GroupCallbackFunction != "" && !task.GroupCallbackFunctionCompleted {
		// we have a subtask group name, we have a group callback function defined, and that group callback function is done
		// need to check if we're the last one in the group to finish - if so, we need to call the function, if not do nothing
		// this function is executed for the PARENT_TASK
		subtaskData := GetTaskConfigurationForContainer(task.ID)
		taskMessage := PTTaskCompletionFunctionMessage{
			TaskData:               GetTaskConfigurationForContainer(int(task.ParentTaskID.Int64)),
			SubtaskData:            &subtaskData,
			CompletionFunctionName: task.GroupCallbackFunction,
			SubtaskGroup:           &task.SubtaskGroupName,
		}
		// only call this function to get executed if all within the group are done
		logging.LogInfo("sending SendPtTaskCompletionFunction to container", "taskId", task.ParentTaskID.Int64, "subtaskid", task.ID)
		groupTasks := []databaseStructs.Task{}
		if err := database.DB.Select(&groupTasks, `SELECT id FROM task WHERE 
                        parent_task_id=$1 AND subtask_group_name=$2 AND completed=false`,
			task.ParentTaskID.Int64, task.SubtaskGroupName); err != nil {
			logging.LogError(err, "Failed to fetch other group tasks")
		} else if len(groupTasks) == 0 {
			task.Status = PT_TASK_FUNCTION_STATUS_GROUP_COMPLETED_FUNCTION
			if _, err := database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
				logging.LogError(err, "Failed to update status to completion task running")
			} else if err = RabbitMQConnection.SendPtTaskCompletionFunction(taskMessage); err != nil {
				logging.LogError(err, "Failed to send task completion function message to container")
				task.Status = PT_TASK_FUNCTION_STATUS_GROUP_COMPLETED_FUNCTION_ERROR
				if _, err := database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
					logging.LogError(err, "Failed to update task status for completion function error")
				}
			}
		} else {

		}

	} else if task.ParentTaskID.Valid && !parentTask.Completed {
		unfinishedChildren := []databaseStructs.Task{}
		if err := database.DB.Select(&unfinishedChildren, `SELECT id FROM task WHERE parent_task_id=$1 AND completed=false`, parentTask.ID); err != nil {
			logging.LogError(err, "Failed to search for subtasks")
		} else if len(unfinishedChildren) == 0 {
			if parentTask.Status == PT_TASK_FUNCTION_STATUS_DELEGATING {
				if !parentTask.Command.ScriptOnly {
					parentTask.Status = PT_TASK_FUNCTION_STATUS_SUBMITTED
					submittedTasksAwaitingFetching.addTaskById(parentTask.ID)
					if _, err = database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, parentTask); err != nil {
						logging.LogError(err, "Failed to update parent task information to submitted")
					}
				} else {
					parentTask.Status = PT_TASK_FUNCTION_STATUS_COMPLETED
					parentTask.Completed = true
					if _, err = database.DB.NamedExec(`UPDATE task SET status=:status, completed=:completed WHERE id=:id`, parentTask); err != nil {
						logging.LogError(err, "Failed to update parent task information to submitted")
					}
					if parentTask.CompletedCallbackFunction != "" && !parentTask.CompletedCallbackFunctionCompleted {
						// this task has a completion function set, and it hasn't been executed, so run it
						// ex in create_tasking: completionFunctionName := "shellCompleted"
						//	response.CompletionFunctionName = &completionFunctionName
						// this function is executed for the TASK
						taskMessage := PTTaskCompletionFunctionMessage{
							TaskData:               GetTaskConfigurationForContainer(parentTask.ID),
							CompletionFunctionName: parentTask.CompletedCallbackFunction,
						}
						err = RabbitMQConnection.SendPtTaskCompletionFunction(taskMessage)
						if err != nil {
							logging.LogError(err, "Failed to send task completion function message to container")
							task.Status = PT_TASK_FUNCTION_STATUS_COMPLETION_FUNCTION_ERROR
							if _, err = database.DB.NamedExec(`UPDATE task SET status=:status WHERE id=:id`, task); err != nil {
								logging.LogError(err, "Failed to update task status for completion function error")
							}
						}
					}
				}
			}
		}
	}
}

func GetTaskMessageCommandList(callbackID int) []string {
	commands := []databaseStructs.Loadedcommands{}
	if err := database.DB.Select(&commands, `SELECT
	command.cmd "command.cmd"
	FROM loadedcommands
	JOIN command on loadedcommands.command_id = command.id
	WHERE loadedcommands.callback_id=$1`, callbackID); err != nil {
		logging.LogError(err, "Failed to get list of loaded commands in callback")
		return []string{}
	} else {
		commandStrings := make([]string, len(commands))
		for index, command := range commands {
			commandStrings[index] = command.Command.Cmd
		}
		return commandStrings
	}
}

func GetTaskMessageCallbackC2ProfileInformation(callbackID int) []PayloadConfigurationC2Profile {
	c2profileParameterInstances := []databaseStructs.C2profileparametersinstance{}
	if err := database.DB.Select(&c2profileParameterInstances, `SELECT 
		c2profile.name "c2profile.name",
		c2profile.id "c2profile.id",
		value, enc_key, dec_key,
		c2profileparameters.crypto_type "c2profileparameters.crypto_type", 
		c2profileparameters.parameter_type "c2profileparameters.parameter_type",
		c2profileparameters.name "c2profileparameters.name"
		FROM c2profileparametersinstance 
		JOIN c2profileparameters ON c2profileparametersinstance.c2_profile_parameters_id = c2profileparameters.id 
		JOIN c2profile ON c2profileparametersinstance.c2_profile_id = c2profile.id
		WHERE callback_id=$1`, callbackID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile parameters from database for callback", "callback_id", callbackID)
		return nil
	}
	parametersMap := make(map[string][]databaseStructs.C2profileparametersinstance)
	for _, parameter := range c2profileParameterInstances {
		if _, ok := parametersMap[parameter.C2Profile.Name]; ok {
			// we've already seen parameter.C2Profile.Name before, add to the array
			parametersMap[parameter.C2Profile.Name] = append(parametersMap[parameter.C2Profile.Name], parameter)
		} else {
			// we haven't seen parameter.C2Profile.Name before, create the array
			parametersMap[parameter.C2Profile.Name] = []databaseStructs.C2profileparametersinstance{parameter}
		}
	}
	finalC2Profiles := []PayloadConfigurationC2Profile{}
	for c2ProfileName, c2ProfileGroup := range parametersMap {
		parametersValueDictionary := make(map[string]interface{})
		for _, parameter := range c2ProfileGroup {
			if interfaceParam, err := GetInterfaceValueForContainer(
				parameter.C2ProfileParameter.ParameterType,
				parameter.Value,
				parameter.EncKey,
				parameter.DecKey,
				parameter.C2ProfileParameter.IsCryptoType); err != nil {
				logging.LogError(err, "Failed to get c2 profile parameter instance interface")
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = parameter.Value
			} else {
				parametersValueDictionary[parameter.C2ProfileParameter.Name] = interfaceParam
			}
		}
		finalC2Profiles = append(finalC2Profiles, PayloadConfigurationC2Profile{
			Name:       c2ProfileName,
			Parameters: parametersValueDictionary,
		})
	}
	return finalC2Profiles
}

func GetTaskMessageCallbackInformation(callbackID int) PTTaskMessageCallbackData {
	data := PTTaskMessageCallbackData{}
	databaseData := databaseStructs.Callback{}
	err := database.DB.Get(&databaseData, `SELECT 
    	callback.*,
    	operator.username "operator.username",
    	operation.name "operation.name"
		FROM callback 
		JOIN operation ON callback.operation_id = operation.id
		JOIN operator ON callback.operator_id = operator.id
		WHERE callback.id=$1`,
		callbackID)
	if err != nil {
		logging.LogError(err, "Failed to get callback information")
		return data
	}
	data.ID = databaseData.ID
	data.DisplayID = databaseData.DisplayID
	data.AgentCallbackID = databaseData.AgentCallbackID
	data.InitCallback = databaseData.InitCallback.String()
	data.LastCheckin = databaseData.LastCheckin.String()
	data.User = databaseData.User
	data.Host = databaseData.Host
	data.PID = databaseData.PID
	data.IP = databaseData.IP
	err = json.Unmarshal([]byte(databaseData.IP), &data.IPs)
	if err != nil {
		logging.LogError(err, "Failed to unmarshal IP string back to array")
	}
	data.ExternalIp = databaseData.ExternalIp
	data.ProcessName = databaseData.ProcessName
	data.Description = databaseData.Description
	data.OperatorID = databaseData.OperatorID
	data.OperatorUsername = databaseData.Operator.Username
	data.Active = databaseData.Active
	data.RegisteredPayloadID = databaseData.RegisteredPayloadID
	data.IntegrityLevel = databaseData.IntegrityLevel
	data.Locked = databaseData.Locked
	data.OperationID = databaseData.OperationID
	data.OperationName = databaseData.Operation.Name
	data.CryptoType = databaseData.CryptoType
	if databaseData.DecKey != nil {
		data.DecKey = *databaseData.DecKey
	}
	if databaseData.EncKey != nil {
		data.DecKey = *databaseData.EncKey
	}
	data.Os = databaseData.Os
	data.Architecture = databaseData.Architecture
	data.Domain = databaseData.Domain
	data.ExtraInfo = databaseData.ExtraInfo
	data.SleepInfo = databaseData.SleepInfo
	data.Cwd = databaseData.Cwd
	data.ImpersonationContext = databaseData.ImpersonationContext
	return data
}

func GetTaskMessageTaskInformation(taskID int) PTTaskMessageTaskData {
	data := PTTaskMessageTaskData{}
	databaseTask := databaseStructs.Task{}
	// select task data, then marshal/unmarshal it as a quick way to filter out attributes
	err := database.DB.Get(&databaseTask, `SELECT 
    	task.*,
    	callback.display_id "callback.display_id",
		operator.username "operator.username",
		payloadtype.name "callback.payload.payloadtype.name"
    	FROM task 
    	JOIN operator ON task.operator_id = operator.id
    	JOIN callback ON task.callback_id = callback.id
    	JOIN payload ON callback.registered_payload_id = payload.id
    	JOIN payloadtype ON payload.payload_type_id = payloadtype.id
    	WHERE task.id=$1`, taskID)
	if err != nil {
		logging.LogError(err, "Failed to get task information")
		return data
	}
	if !utils.SliceContains(NonPayloadCommands, databaseTask.CommandName) && databaseTask.ProcessAtOriginalCommand {
		// update the command name to be what was originally issued instead of whatever the task changed it to
		err = database.DB.Get(&databaseTask.CommandName, `SELECT cmd FROM command WHERE id=$1`, databaseTask.CommandID)
		if err != nil {
			logging.LogError(err, "Failed to get command name for task information")
			return data
		}
	}
	data = PTTaskMessageTaskData{
		ID:                                 databaseTask.ID,
		DisplayID:                          databaseTask.DisplayID,
		AgentTaskID:                        databaseTask.AgentTaskID,
		CommandName:                        databaseTask.CommandName,
		Params:                             databaseTask.Params,
		Timestamp:                          databaseTask.Timestamp.String(),
		CallbackID:                         databaseTask.CallbackID,
		CallbackDisplayID:                  databaseTask.Callback.DisplayID,
		PayloadType:                        databaseTask.CommandPayloadType,
		Status:                             databaseTask.Status,
		OriginalParams:                     databaseTask.OriginalParams,
		DisplayParams:                      databaseTask.DisplayParams,
		Comment:                            databaseTask.Comment,
		Stdout:                             databaseTask.Stdout,
		Stderr:                             databaseTask.Stderr,
		Completed:                          databaseTask.Completed,
		OperatorUsername:                   databaseTask.Operator.Username,
		OperatorID:                         databaseTask.OperatorID,
		OpsecPreBlocked:                    databaseTask.OpsecPreBlocked.Bool,
		OpsecPreMessage:                    databaseTask.OpsecPreMessage,
		OpsecPreBypassed:                   databaseTask.OpsecPreBypassed,
		OpsecPreBypassRole:                 databaseTask.OpsecPreBypassRole,
		OpsecPostBlocked:                   databaseTask.OpsecPostBlocked.Bool,
		OpsecPostMessage:                   databaseTask.OpsecPostMessage,
		OpsecPostBypassed:                  databaseTask.OpsecPostBypassed,
		OpsecPostBypassRole:                databaseTask.OpsecPostBypassRole,
		ParentTaskID:                       int(databaseTask.ParentTaskID.Int64),
		SubtaskCallbackFunction:            databaseTask.SubtaskCallbackFunction,
		SubtaskCallbackFunctionCompleted:   databaseTask.SubtaskCallbackFunctionCompleted,
		GroupCallbackFunction:              databaseTask.GroupCallbackFunction,
		GroupCallbackFunctionCompleted:     databaseTask.GroupCallbackFunctionCompleted,
		CompletedCallbackFunction:          databaseTask.CompletedCallbackFunction,
		CompletedCallbackFunctionCompleted: databaseTask.CompletedCallbackFunctionCompleted,
		SubtaskGroupName:                   databaseTask.SubtaskGroupName,
		TaskingLocation:                    databaseTask.TaskingLocation,
		ParameterGroupName:                 databaseTask.ParameterGroupName,
		IsInteractiveTask:                  databaseTask.IsInteractiveTask,
		InteractiveTaskType:                int(databaseTask.InteractiveTaskType.Int64),
		EventStepInstanceId:                int(databaseTask.EventStepInstanceID.Int64),
	}
	if databaseTask.TokenID.Valid {
		err = database.DB.Get(&data.TokenID, `SELECT token_id FROM token WHERE id=$1`, databaseTask.TokenID.Int64)
		if err != nil {
			logging.LogError(err, "Failed to get token information")
		}
	}
	return data
}

func getTaskMessagePayloadInformation(payloadID int) PTTaskMessagePayloadData {
	data := PTTaskMessagePayloadData{}
	databaseData := databaseStructs.Payload{}
	if err := database.DB.Get(&databaseData, `SELECT 
	payload.*,
	payloadtype.name "payloadtype.name" 
	FROM payload
	JOIN payloadtype ON payload.payload_type_id = payloadtype.id
	WHERE payload.id=$1`,
		payloadID); err != nil {
		logging.LogError(err, "Failed to get task information")
		return data
	} else if callbackJSON, err := json.Marshal(databaseData); err != nil {
		logging.LogError(err, "Failed to marshal task data into JSON")
		return data
	} else if err := json.Unmarshal(callbackJSON, &data); err != nil {
		logging.LogError(err, "Failed to unmarshal task JSON data to GetTaskMessageTaskInformation ")
	}
	data.PayloadType = databaseData.Payloadtype.Name
	return data
}
func GetSecrets(userID int, eventStepInstanceId int) map[string]interface{} {
	secrets := make(map[string]interface{})

	user := databaseStructs.Operator{}
	err := database.DB.Get(&user, `SELECT secrets FROM operator WHERE id=$1`, userID)
	if err != nil {
		logging.LogError(err, "Failed to get user secrets", "user_id", userID)
	} else {
		for key, value := range user.Secrets.StructValue() {
			secrets[key] = value
		}
	}
	if eventStepInstanceId > 0 {
		eventStepInstance := databaseStructs.EventStepInstance{}
		err = database.DB.Get(&eventStepInstance, `SELECT environment, inputs FROM eventstepinstance WHERE id=$1`, eventStepInstanceId)
		if err != nil {
			logging.LogError(err, "failed to get event step instance environment and inputs")
		} else {
			for key, value := range eventStepInstance.Environment.StructValue() {
				secrets[key] = value
			}
			for key, value := range eventStepInstance.Inputs.StructValue() {
				secrets[key] = value
			}
			secrets["EVENT_STEP_INSTANCE_ID"] = eventStepInstanceId
		}
	}
	return secrets
}
func GetTaskConfigurationForContainer(taskID int) PTTaskMessageAllData {
	taskMessage := PTTaskMessageAllData{
		Task: GetTaskMessageTaskInformation(taskID),
	}
	taskMessage.Secrets = GetSecrets(taskMessage.Task.OperatorID, taskMessage.Task.EventStepInstanceId)
	taskMessage.Callback = GetTaskMessageCallbackInformation(taskMessage.Task.CallbackID)
	taskMessage.Payload = getTaskMessagePayloadInformation(taskMessage.Callback.RegisteredPayloadID)
	taskMessage.Commands = GetTaskMessageCommandList(taskMessage.Task.CallbackID)
	taskMessage.C2Profiles = GetTaskMessageCallbackC2ProfileInformation(taskMessage.Task.CallbackID)
	taskMessage.BuildParameters = *GetBuildParameterInformation(taskMessage.Callback.RegisteredPayloadID)
	taskMessage.PayloadType = taskMessage.Payload.PayloadType
	taskMessage.CommandPayloadType = taskMessage.Task.PayloadType
	/*
			commandPayloadType := databaseStructs.Task{}
			err := database.DB.Get(&commandPayloadType, `SELECT
		    payloadtype.name "command.payloadtype.name"
		    FROM task
		    JOIN command ON task.command_id = command.id
		    JOIN payloadtype ON command.payload_type_id = payloadtype.id
		    WHERE task.id=$1`, taskID)
			if err != nil {
				logging.LogError(err, "failed to get payload type information from task")
				taskMessage.CommandPayloadType = taskMessage.PayloadType
			} else {
				taskMessage.CommandPayloadType = commandPayloadType.Command.Payloadtype.Name
			}

	*/

	return taskMessage
}
func GetOnNewCallbackConfigurationForContainer(callbackId int) PTOnNewCallbackAllData {
	callbackMessage := PTOnNewCallbackAllData{}
	callbackMessage.Callback = GetTaskMessageCallbackInformation(callbackId)
	callbackMessage.Payload = getTaskMessagePayloadInformation(callbackMessage.Callback.RegisteredPayloadID)
	callbackMessage.Commands = GetTaskMessageCommandList(callbackId)
	callbackMessage.C2Profiles = GetTaskMessageCallbackC2ProfileInformation(callbackId)
	callbackMessage.BuildParameters = *GetBuildParameterInformation(callbackMessage.Callback.RegisteredPayloadID)
	callbackMessage.PayloadType = callbackMessage.Payload.PayloadType
	callbackMessage.Secrets = GetSecrets(callbackMessage.Callback.OperatorID, 0)
	return callbackMessage
}

// save file to disk
func GetSaveFilePath() (string, string, error) {
	// create the base file information in the database for the new payload
	newUUID := uuid.New().String()
	payloadFilePath := filepath.Join(".", "files", newUUID)
	// create the file or make sure we can create it
	for i := 0; i < 10; i++ {
		_, err := os.Stat(payloadFilePath)
		if os.IsNotExist(err) {
			if f, err := os.Create(payloadFilePath); err != nil {
				logging.LogError(err, "Failed to create new path on disk, trying a new one")
				continue
			} else {
				f.Close()
				return newUUID, payloadFilePath, nil
			}
		} else {
			logging.LogError(err, "Failed to create new path on disk, trying a new one")
		}
		newUUID = uuid.New().String()
		payloadFilePath = filepath.Join(".", "files", newUUID)
	}
	return "", "", errors.New("Failed to create file on disk")
}
func SendAllOperationsMessage(message string, operationID int, source string, messageLevel database.MESSAGE_LEVEL) {
	/*
		Send a message to all operation's event logs if operationID is 0, otherwise just send it to the specific operation.
		if messageLevel == "error", first check to see if there's an unresolved message of type `source` first.
			if so, increment the counter
			if not, create the message
	*/
	var operations []databaseStructs.Operation
	if err := database.DB.Select(&operations, `SELECT id, "name", webhook, channel FROM operation WHERE complete=false`); err != nil {
		logging.LogError(err, "Failed to get operations for SendAllOperationsMessage", "message", message)
		return
	}
	sourceString := source
	if sourceString == "" {
		sourceString = uuid.NewString()
	}
	for _, operation := range operations {
		if operationID == 0 || operation.ID == operationID {
			// this is the operation we're interested in
			if messageLevel == database.MESSAGE_LEVEL_WARNING {
				existingMessage := databaseStructs.Operationeventlog{}
				if err := database.DB.Get(&existingMessage, `
				SELECT id, count, "message", source FROM operationeventlog WHERE
				level='warning' and source=$1 and operation_id=$2 and resolved=false and deleted=false
				`, sourceString, operation.ID); err != nil {
					if !errors.Is(err, sql.ErrNoRows) {
						logging.LogError(err, "Failed to query existing event log message")
					} else if errors.Is(err, sql.ErrNoRows) {
						newMessage := databaseStructs.Operationeventlog{
							Source:      sourceString,
							Level:       messageLevel,
							Message:     message,
							OperationID: operation.ID,
							Count:       0,
						}
						if _, err := database.DB.NamedExec(`INSERT INTO operationeventlog 
						(source, "level", "message", operation_id, count) 
						VALUES 
						(:source, :level, :message, :operation_id, :count)`, newMessage); err != nil {
							logging.LogError(err, "Failed to create new operationeventlog message")
						} else {
							go RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
								OperationID:      operation.ID,
								OperationName:    operation.Name,
								OperationWebhook: operation.Webhook,
								OperationChannel: operation.Channel,
								OperatorUsername: "",
								Action:           WEBHOOK_TYPE_ALERT,
								Data: map[string]interface{}{
									"message":   newMessage.Message,
									"source":    newMessage.Source,
									"count":     newMessage.Count,
									"timestamp": time.Now().UTC(),
								},
							})
							EventingChannel <- EventNotification{
								Trigger:     eventing.TriggerAlert,
								OperationID: operation.ID,
								Outputs: map[string]interface{}{
									"alert": newMessage.Message,
								},
							}

						}
					}
				} else {
					// err was nil, so we did get a matching existing message
					existingMessage.Count += 1
					if _, err := database.DB.NamedExec(`UPDATE operationeventlog SET 
					"count"=:count 
					WHERE id=:id`, existingMessage); err != nil {
						logging.LogError(err, "Failed to increase count on operationeventlog")
					} else {

						go RabbitMQConnection.EmitWebhookMessage(WebhookMessage{
							OperationID:      operation.ID,
							OperationName:    operation.Name,
							OperationWebhook: operation.Webhook,
							OperationChannel: operation.Channel,
							OperatorUsername: "",
							Action:           WEBHOOK_TYPE_ALERT,
							Data: map[string]interface{}{
								"message":   existingMessage.Message,
								"source":    existingMessage.Source,
								"count":     existingMessage.Count,
								"timestamp": time.Now().UTC(),
							},
						})

					}
				}
			} else {
				newMessage := databaseStructs.Operationeventlog{
					Source:      sourceString,
					Level:       messageLevel,
					Message:     message,
					OperationID: operation.ID,
					Count:       0,
				}
				if _, err := database.DB.NamedExec(`INSERT INTO operationeventlog 
				(source, "level", "message", operation_id, count) 
				VALUES 
				(:source, :level, :message, :operation_id, :count)`, newMessage); err != nil {
					logging.LogError(err, "Failed to create new operationeventlog message")
				}
			}

		}
	}
}
