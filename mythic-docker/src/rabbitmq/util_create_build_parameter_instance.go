package rabbitmq

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateBuildParameterInstanceInput struct {
	PayloadTypeID int                    `json:"payload_type_id"`
	InstanceName  string                 `json:"instance_name"`
	Parameters    map[string]interface{} `json:"build_parameter_instance"`
}

func CreateBuildParameterInstance(input CreateBuildParameterInstanceInput, operatorOperation *databaseStructs.Operatoroperation) CreateC2InstanceResponse {
	response := CreateC2InstanceResponse{
		Status: "error",
	}
	buildParameters := []databaseStructs.Buildparameter{}
	err := database.DB.Select(&buildParameters, `SELECT
	*
	FROM buildparameter
	WHERE payload_type_id=$1 and deleted=false`, input.PayloadTypeID)
	if err != nil {
		logging.LogError(err, "Failed to fetch build parameters when creating build parameter instance")
		response.Error = "Failed to fetch build parameters: " + err.Error()
		return response
	}
	type tempBuildParam struct {
		ParameterID  int    `db:"build_parameter_id"`
		Value        string `db:"value"`
		OperationID  int    `db:"operation_id"`
		InstanceName string `db:"instance_name"`
	}
	var paramsToSave []tempBuildParam
	for _, dbParam := range buildParameters {
		found := false
		for key, val := range input.Parameters {
			if key == dbParam.Name {
				found = true
				dbStringValue, err := GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(dbParam.ParameterType, val)
				if err != nil {
					logging.LogError(err, "Failed to get string from user supplied value for saved build parameter instance")
					response.Error = "Failed to get string from user supplied value for saved build parameter instance: " + err.Error()
					return response
				}
				paramsToSave = append(paramsToSave, tempBuildParam{
					ParameterID:  dbParam.ID,
					Value:        dbStringValue,
					OperationID:  operatorOperation.CurrentOperation.ID,
					InstanceName: input.InstanceName,
				})
			}
		}
		if !found {
			dbStringValue, err := getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString(
				dbParam.ParameterType, dbParam.DefaultValue,
				dbParam.Choices.StructValue(),
				dbParam.Randomize, dbParam.FormatString)
			if err != nil {
				logging.LogError(err, "Failed to get string from default value for saved build parameter instance")
				response.Error = "Failed to get string from default value for saved build parameter instance: " + err.Error()
				return response
			}
			paramsToSave = append(paramsToSave, tempBuildParam{
				ParameterID:  dbParam.ID,
				Value:        dbStringValue,
				OperationID:  operatorOperation.CurrentOperation.ID,
				InstanceName: input.InstanceName,
			})
		}
	}
	for _, param := range paramsToSave {
		result, err := database.DB.NamedExec(`UPDATE buildparameterinstance
			SET value=:value
			WHERE build_parameter_id=:build_parameter_id
			AND operation_id=:operation_id
			AND instance_name=:instance_name`, param)
		if err != nil {
			logging.LogError(err, "Failed to update build parameter instance")
			response.Error = "Failed to update instance: " + err.Error()
			return response
		}
		rows, err := result.RowsAffected()
		if err != nil {
			logging.LogError(err, "Failed to check updated build parameter instance rows")
			response.Error = "Failed to update instance: " + err.Error()
			return response
		}
		if rows == 0 {
			if _, err := database.DB.NamedExec(`INSERT INTO buildparameterinstance
				(build_parameter_id, value, operation_id, instance_name)
				VALUES
				(:build_parameter_id, :value, :operation_id, :instance_name)`, param); err != nil {
				logging.LogError(err, "Failed to save new build parameter instance")
				response.Error = "Failed to save instance: " + err.Error()
				return response
			}
		}
	}
	response.Status = "success"
	return response
}
