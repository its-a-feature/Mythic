package rabbitmq

import (
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type CreateC2InstanceInput struct {
	C2ID         int                    `json:"c2_profile"`
	InstanceName string                 `json:"instance_name"`
	Parameters   map[string]interface{} `json:"c2_profile_parameters"`
}

type CreateC2InstanceResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func CreateC2Instance(input CreateC2InstanceInput, operatorOperation *databaseStructs.Operatoroperation) CreateC2InstanceResponse {
	response := CreateC2InstanceResponse{
		Status: "error",
	}
	//logging.LogDebug("got a request to create a c2 instance", "input", input)
	// saved value from the UI/Scripting will be key-value pairs with the final values (except for crypto generation)
	c2ProfileParameters := []databaseStructs.C2profileparameters{}
	if err := database.DB.Select(&c2ProfileParameters, `SELECT
	*
	FROM c2profileparameters
	WHERE c2_profile_id=$1 and deleted=false`, input.C2ID); err != nil {
		logging.LogError(err, "Failed to fetch c2 profile parameters when creating c2 instance")
		response.Error = "Failed to fetch c2 profile parameters: " + err.Error()
		return response
	} else {
		type tempC2Param struct {
			ParameterID  int    `db:"c2_profile_parameters_id"`
			Value        string `db:"value"`
			OperationID  int    `db:"operation_id"`
			InstanceName string `db:"instance_name"`
			C2ProfileID  int    `db:"c2_profile_id"`
		}
		var paramsToSave []tempC2Param
		for _, dbParam := range c2ProfileParameters {
			// for each dbParam, see if there's a matching Name in the input.Parameters
			found := false
			for key, val := range input.Parameters {
				if key == dbParam.Name {
					found = true
					if dbStringValue, err := GetFinalStringForDatabaseInstanceValueFromUserSuppliedValue(dbParam.ParameterType, val); err != nil {
						logging.LogError(err, "Failed to get string from user supplied value for saved c2 instance")
						response.Error = "Failed to get string from user supplied value for saved c2 instance: " + err.Error()
						return response
					} else {
						paramsToSave = append(paramsToSave, tempC2Param{
							ParameterID:  dbParam.ID,
							Value:        dbStringValue,
							OperationID:  operatorOperation.CurrentOperation.ID,
							InstanceName: input.InstanceName,
							C2ProfileID:  input.C2ID,
						})
					}
				}
			}
			if !found {
				if dbStringValue, err := getFinalStringForDatabaseInstanceValueFromDefaultDatabaseString(
					dbParam.ParameterType, dbParam.DefaultValue,
					dbParam.Choices.StructValue(),
					dbParam.Randomize, dbParam.FormatString); err != nil {
					logging.LogError(err, "Failed to get string from default value for saved c2 instance")
					response.Error = "Failed to get string from default value for saved c2 instance: " + err.Error()
					return response
				} else {
					paramsToSave = append(paramsToSave, tempC2Param{
						ParameterID:  dbParam.ID,
						Value:        dbStringValue,
						OperationID:  operatorOperation.CurrentOperation.ID,
						InstanceName: input.InstanceName,
						C2ProfileID:  input.C2ID,
					})
				}
			}
		}
		// now that we have all of our string arguments, we can save them in the database
		for _, param := range paramsToSave {
			if _, err := database.DB.NamedExec(`INSERT INTO c2profileparametersinstance
			(c2_profile_parameters_id, value, operation_id, instance_name, c2_profile_id)
			VALUES
			(:c2_profile_parameters_id, :value, :operation_id, :instance_name, :c2_profile_id)
			ON CONFLICT (instance_name, operation_id, c2_profile_parameters_id)
			DO UPDATE SET value=:value
			`, param); err != nil {
				logging.LogError(err, "Failed to save new parameter instance")
				response.Error = "Failed to save instance: " + err.Error()
				return response
			}
		}
		response.Status = "success"
		return response
	}
}
