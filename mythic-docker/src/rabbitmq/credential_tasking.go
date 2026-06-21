package rabbitmq

import (
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

var maxCredentialJSONInt = int64(int(^uint(0) >> 1))

func expandCredentialJSONTaskingParameters(commandID int, parameterGroupName string, operationID int, params string) (string, bool, error) {
	credentialParameters := []databaseStructs.Commandparameters{}
	err := database.DB.Select(&credentialParameters, `SELECT
		name, display_name, cli_name, type, parameter_group_name
		FROM commandparameters
		WHERE command_id=$1 AND type=$2`,
		commandID, COMMAND_PARAMETER_TYPE_CREDENTIAL)
	if err != nil {
		return params, false, fmt.Errorf("failed to query credential parameters: %w", err)
	}
	filteredParameters := make([]databaseStructs.Commandparameters, 0, len(credentialParameters))
	for _, parameter := range credentialParameters {
		if normalizedParameterGroupName(parameter.ParameterGroupName) == normalizedParameterGroupName(parameterGroupName) {
			filteredParameters = append(filteredParameters, parameter)
		}
	}
	if len(filteredParameters) == 0 {
		return params, false, nil
	}
	trimmedParams := strings.TrimSpace(params)
	if trimmedParams == "" {
		return params, false, nil
	}
	decoder := json.NewDecoder(strings.NewReader(trimmedParams))
	decoder.UseNumber()
	paramsMap := map[string]interface{}{}
	if err := decoder.Decode(&paramsMap); err != nil {
		return params, false, fmt.Errorf("CredentialJson parameters require JSON object tasking with integer credential IDs: %w", err)
	}
	expanded := false
	for _, parameter := range filteredParameters {
		paramKey, value, ok := findCredentialJSONParameterValue(paramsMap, parameter)
		if !ok {
			continue
		}
		credentialID, ok := credentialJSONInteger(value)
		if !ok {
			return params, false, fmt.Errorf("CredentialJson parameter %q must be an integer credential ID", parameter.Name)
		}
		credential, err := resolveCredentialJSONTaskingCredential(credentialID, operationID)
		if err != nil {
			return params, false, fmt.Errorf("failed to resolve CredentialJson parameter %q: %w", parameter.Name, err)
		}
		paramsMap[paramKey] = map[string]interface{}{
			"credential_id": credential.ID,
			"account":       credential.Account,
			"realm":         credential.Realm,
			"type":          credential.Type,
			"comment":       credential.Comment,
			"credential":    credential.Credential,
			"metadata":      credential.Metadata.StructValue(),
		}
		expanded = true
	}
	if !expanded {
		return params, false, nil
	}
	expandedBytes, err := json.Marshal(paramsMap)
	if err != nil {
		return params, false, fmt.Errorf("failed to serialize expanded CredentialJson parameters: %w", err)
	}
	return string(expandedBytes), true, nil
}

func normalizedParameterGroupName(parameterGroupName string) string {
	parameterGroupName = strings.TrimSpace(parameterGroupName)
	if parameterGroupName == "" {
		return "Default"
	}
	return parameterGroupName
}

func findCredentialJSONParameterValue(paramsMap map[string]interface{}, parameter databaseStructs.Commandparameters) (string, interface{}, bool) {
	for _, key := range []string{parameter.Name, parameter.CliName, parameter.DisplayName} {
		if key == "" {
			continue
		}
		if value, ok := paramsMap[key]; ok {
			return key, value, true
		}
	}
	return "", nil, false
}

func credentialJSONInteger(value interface{}) (int, bool) {
	switch typed := value.(type) {
	case int:
		if typed <= 0 {
			return 0, false
		}
		return typed, true
	case int32:
		if typed <= 0 {
			return 0, false
		}
		return int(typed), true
	case int64:
		if typed <= 0 || typed > maxCredentialJSONInt {
			return 0, false
		}
		return int(typed), true
	case float64:
		if typed <= 0 || math.Trunc(typed) != typed || typed > float64(maxCredentialJSONInt) {
			return 0, false
		}
		return int(typed), true
	case json.Number:
		id, err := strconv.ParseInt(typed.String(), 10, 64)
		if err != nil || id <= 0 || id > maxCredentialJSONInt {
			return 0, false
		}
		return int(id), true
	default:
		return 0, false
	}
}

func resolveCredentialJSONTaskingCredential(credentialID int, operationID int) (databaseStructs.Credential, error) {
	credential := databaseStructs.Credential{}
	err := database.DB.Get(&credential, `SELECT
		c.id, c."type", c.account, c.realm, c.comment, credential_credentials(c) AS credential, c.metadata
		FROM credential c
		WHERE c.id=$1 AND c.operation_id=$2 AND c.deleted=false`,
		credentialID, operationID)
	return credential, err
}
