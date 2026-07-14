package rabbitmq

import (
	"encoding/json"
	"errors"
	"fmt"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

const WrapperPayloadTypeRequirementKey = "payload_type"

type WrappablePayloadSearchResult struct {
	PayloadIDs []int
	TotalCount int
}

// SearchWrappablePayloads and ValidateWrappedPayload share this function so a
// payload shown by the picker is judged by the exact same rules at submission.
func searchWrappablePayloads(
	wrapperPayloadTypeID int,
	operationID int,
	buildParameters []PayloadConfigurationBuildParameter,
	payloadUUID string,
	limit int,
	offset int,
) (WrappablePayloadSearchResult, error) {
	result := WrappablePayloadSearchResult{PayloadIDs: []int{}}
	wrapperPayloadType := databaseStructs.Payloadtype{}
	err := database.DB.Get(&wrapperPayloadType, `SELECT
		id, "name", wrapper, wrapper_payload_requirements
		FROM payloadtype
		WHERE id=$1 AND deleted=false`, wrapperPayloadTypeID)
	if err != nil {
		return result, errors.New("failed to find wrapper payload type")
	}
	if !wrapperPayloadType.Wrapper {
		return result, errors.New("payload type is not a wrapper")
	}

	activeRequirements, err := getActiveWrapperPayloadRequirements(wrapperPayloadType, buildParameters)
	if err != nil {
		return result, err
	}
	if len(activeRequirements) == 0 {
		return result, nil
	}

	matchSQL, matchArgs, err := buildWrapperRequirementSQL(activeRequirements)
	if err != nil {
		return result, err
	}
	whereSQL := `payload.operation_id = ?
		AND payload.build_phase = 'success'
		AND payload.deleted = false
		AND payload.auto_generated = false
		AND (` + matchSQL + `)`
	args := []interface{}{operationID}
	args = append(args, matchArgs...)
	if payloadUUID != "" {
		whereSQL += ` AND payload.uuid = ?`
		args = append(args, payloadUUID)
	}

	countQuery := database.DB.Rebind(`SELECT count(*)
		FROM payload
		JOIN payloadtype source_payloadtype ON source_payloadtype.id = payload.payload_type_id
		WHERE ` + whereSQL)
	if err = database.DB.Get(&result.TotalCount, countQuery, args...); err != nil {
		return result, fmt.Errorf("failed to count compatible payloads: %w", err)
	}
	if result.TotalCount == 0 {
		return result, nil
	}

	pageArgs := append(append([]interface{}{}, args...), limit, offset)
	pageQuery := database.DB.Rebind(`SELECT payload.id
		FROM payload
		JOIN payloadtype source_payloadtype ON source_payloadtype.id = payload.payload_type_id
		WHERE ` + whereSQL + `
		ORDER BY payload.id DESC
		LIMIT ? OFFSET ?`)
	if err = database.DB.Select(&result.PayloadIDs, pageQuery, pageArgs...); err != nil {
		return result, fmt.Errorf("failed to fetch compatible payloads: %w", err)
	}
	return result, nil
}

func SearchWrappablePayloads(
	wrapperPayloadTypeID int,
	operationID int,
	buildParameters []PayloadConfigurationBuildParameter,
	limit int,
	offset int,
) (WrappablePayloadSearchResult, error) {
	return searchWrappablePayloads(wrapperPayloadTypeID, operationID, buildParameters, "", limit, offset)
}

func ValidateWrappedPayload(
	wrapperPayloadTypeID int,
	operationID int,
	buildParameters []PayloadConfigurationBuildParameter,
	payloadUUID string,
) (int, error) {
	result, err := searchWrappablePayloads(wrapperPayloadTypeID, operationID, buildParameters, payloadUUID, 1, 0)
	if err != nil {
		return 0, err
	}
	if result.TotalCount != 1 || len(result.PayloadIDs) != 1 {
		return 0, errors.New("wrapped payload does not meet this wrapper's requirements")
	}
	return result.PayloadIDs[0], nil
}

func getActiveWrapperPayloadRequirements(
	wrapperPayloadType databaseStructs.Payloadtype,
	buildParameters []PayloadConfigurationBuildParameter,
) ([]WrapperPayloadRequirement, error) {
	requirements := []WrapperPayloadRequirement{}
	if err := wrapperPayloadType.WrapperPayloadRequirements.Unmarshal(&requirements); err != nil {
		return nil, fmt.Errorf("failed to parse wrapper payload requirements: %w", err)
	}

	conditionNames := map[string]struct{}{}
	for ruleIndex, requirement := range requirements {
		if requirement.Requires == nil {
			return nil, fmt.Errorf("wrapper payload requirement %d is missing requires", ruleIndex)
		}
		for name := range requirement.When {
			conditionNames[name] = struct{}{}
		}
	}
	conditionValues, err := resolveWrapperConditionValues(wrapperPayloadType.ID, conditionNames, buildParameters)
	if err != nil {
		return nil, err
	}

	active := make([]WrapperPayloadRequirement, 0, len(requirements))
	for _, requirement := range requirements {
		matches := true
		for name, expectedValue := range requirement.When {
			if conditionValues[name] != expectedValue {
				matches = false
				break
			}
		}
		if matches {
			active = append(active, requirement)
		}
	}
	return active, nil
}

func resolveWrapperConditionValues(
	payloadTypeID int,
	conditionNames map[string]struct{},
	buildParameters []PayloadConfigurationBuildParameter,
) (map[string]string, error) {
	resolved := make(map[string]string, len(conditionNames))
	if len(conditionNames) == 0 {
		return resolved, nil
	}

	databaseBuildParameters := []databaseStructs.Buildparameter{}
	if err := database.DB.Select(&databaseBuildParameters, `SELECT *
		FROM buildparameter
		WHERE payload_type_id=$1 AND deleted=false`, payloadTypeID); err != nil {
		return nil, fmt.Errorf("failed to fetch wrapper build parameters: %w", err)
	}
	for _, databaseBuildParameter := range databaseBuildParameters {
		if _, needed := conditionNames[databaseBuildParameter.Name]; !needed {
			continue
		}
		var suppliedValue interface{}
		found := false
		for _, suppliedBuildParameter := range buildParameters {
			if suppliedBuildParameter.Name == databaseBuildParameter.Name && suppliedBuildParameter.Value != nil {
				suppliedValue = suppliedBuildParameter.Value
				found = true
				break
			}
		}

		var value string
		var err error
		if found {
			value, err = GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(databaseBuildParameter.ParameterType, suppliedValue)
		} else {
			value, err = getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString(
				databaseBuildParameter.ParameterType,
				databaseBuildParameter.DefaultValue,
				databaseBuildParameter.Choices.StructValue(),
				databaseBuildParameter.Randomize,
				databaseBuildParameter.FormatString,
			)
		}
		if err != nil {
			return nil, fmt.Errorf("failed to resolve wrapper build parameter %q: %w", databaseBuildParameter.Name, err)
		}
		resolved[databaseBuildParameter.Name] = value
	}
	for name := range conditionNames {
		if _, ok := resolved[name]; !ok {
			return nil, fmt.Errorf("wrapper requirement references unavailable build parameter %q", name)
		}
	}
	return resolved, nil
}

func buildWrapperRequirementSQL(requirements []WrapperPayloadRequirement) (string, []interface{}, error) {
	branches := make([]string, 0, len(requirements))
	args := []interface{}{}
	for _, requirement := range requirements {
		metadata := make(map[string]string, len(requirement.Requires))
		payloadTypeName := ""
		payloadTypeRequired := false
		for key, value := range requirement.Requires {
			if key == WrapperPayloadTypeRequirementKey {
				payloadTypeName = value
				payloadTypeRequired = true
			} else {
				metadata[key] = value
			}
		}

		conditions := []string{}
		if payloadTypeRequired {
			conditions = append(conditions, "source_payloadtype.name = ?")
			args = append(args, payloadTypeName)
		}
		if len(metadata) > 0 {
			encodedMetadata, err := json.Marshal(metadata)
			if err != nil {
				return "", nil, fmt.Errorf("failed to encode wrapper metadata requirement: %w", err)
			}
			conditions = append(conditions, "payload.build_metadata @> ?::jsonb")
			args = append(args, string(encodedMetadata))
		}
		if len(conditions) == 0 {
			branches = append(branches, "TRUE")
		} else {
			branches = append(branches, "("+strings.Join(conditions, " AND ")+")")
		}
	}
	return strings.Join(branches, " OR "), args, nil
}
