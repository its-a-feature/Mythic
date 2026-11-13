package database

import (
	"database/sql"
	"errors"
	"fmt"

	mythicCrypto "github.com/its-a-feature/Mythic/crypto"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/lib/pq"
)

func AreDatabaseErrorsEqual(errorCode error, errorConstant string) bool {
	if pqError, ok := errorCode.(*pq.Error); ok {
		return string(pqError.Code) == errorConstant
	}
	return false
}

func GetDatabaseErrorString(errorCode error) string {
	if pqError, ok := errorCode.(*pq.Error); ok {
		return pqError.Code.Name()
	}
	return fmt.Sprintf("%v", errorCode)
}

// GetUserCurrentOperation supplies login/refresh summaries, before there is an
// authenticated request context. Reuse the explicit lookup instead of loading
// every membership just to find the user's selected operation.
func GetUserCurrentOperation(userID int) (*databaseStructs.Operatoroperation, error) {
	user, err := GetUserFromID(userID)
	if err != nil {
		return nil, err
	}
	operation, err := GetUserOperation(user, int(user.CurrentOperationID.Int64))
	if errors.Is(err, sql.ErrNoRows) || err == nil && operation.ID == 0 {
		// Keep login summaries empty when no selected membership is available,
		// including admins whose authority does not require a membership row.
		return &databaseStructs.Operatoroperation{CurrentOperator: *user}, nil
	}
	return operation, err
}

// GetUserOperation loads one operation/membership using an already loaded owner.
// The caller chooses the operation explicitly: API-token authentication must
// never substitute the owner's globally selected operation or reload the owner.
func GetUserOperation(user *databaseStructs.Operator, operationID int) (*databaseStructs.Operatoroperation, error) {
	operation := &databaseStructs.Operatoroperation{CurrentOperator: *user, OperatorID: user.ID, OperationID: operationID}
	if operationID <= 0 {
		return operation, nil
	}
	if DB == nil {
		return nil, errors.New("database connection not initialized")
	}
	err := DB.Get(operation, `SELECT COALESCE(m.id,0) id, COALESCE(m.view_mode,'') view_mode,
	 COALESCE(m.base_disabled_commands_id,0) base_disabled_commands_id,
	 o.id "operation.id",o.name "operation.name",o.admin_id "operation.admin_id",
	 o.banner_text "operation.banner_text",o.banner_color "operation.banner_color",
	 o.complete "operation.complete",o.webhook "operation.webhook",o.channel "operation.channel"
	 FROM operation o LEFT JOIN operatoroperation m ON m.operation_id=o.id AND m.operator_id=$1
	 WHERE o.id=$2 AND (m.id IS NOT NULL OR $3)`, user.ID, operationID, user.Admin)
	if err != nil {
		return nil, fmt.Errorf("operation %d is unavailable: %w", operationID, err)
	}
	return operation, nil
}

// GetUserFromID is an uncached account lookup. Authenticated HTTP requests reuse
// the owner snapshot through authentication.GetRequestUser instead.
func GetUserFromID(userID int) (*databaseStructs.Operator, error) {
	if DB == nil {
		return nil, errors.New("database connection not initialized")
	}
	operator := databaseStructs.Operator{}
	err := DB.Get(&operator, `SELECT 
	username, id, "admin", last_login, failed_login_count, salt, "password", secrets, preferences,
	last_failed_login_timestamp, active, deleted, view_utc_time,
	current_operation_id, account_type, email, session_version
	FROM operator 
	WHERE id=$1`, userID)
	if err != nil {
		logging.LogError(err, "Failed to find operator", "user_id", userID)
		return nil, err
	}
	return &operator, nil
}

func GetOperationsForUser(userID int) (*[]databaseStructs.Operatoroperation, error) {
	operatorOperations := []databaseStructs.Operatoroperation{}
	if err := DB.Select(&operatorOperations, `SELECT
	operatoroperation.id, operatoroperation.view_mode, 
	operator.id "operator.id",
	operation.id "operation.id",
	operation.name "operation.name",
	operation.admin_id "operation.admin_id"
	FROM operatoroperation
	JOIN operation ON operatoroperation.operation_id = operation.id 
	JOIN operator ON operatoroperation.operator_id = operator.id 
	WHERE operatoroperation.operator_id=$1`, userID); err != nil {
		logging.LogError(err, "Failed to fetch operations for the user", "user_id", userID)
		return nil, err
	} else {
		return &operatorOperations, nil
	}
}

func UpdatePayloadWithError(databasePayload databaseStructs.Payload, err error) {
	databasePayload.BuildStderr += err.Error()
	databasePayload.BuildPhase = "error"
	if _, updateError := DB.NamedExec(`UPDATE payload SET 
		build_phase=:build_phase, build_stderr=:build_stderr 
		WHERE id=:id`, databasePayload,
	); updateError != nil {
		logging.LogError(updateError, "Failed to update payload's build status to error")
	} else {
		UpdateRemainingBuildSteps(databasePayload)
	}
}
func UpdateRemainingBuildSteps(databasePayload databaseStructs.Payload) {
	buildSteps := []databaseStructs.PayloadBuildStep{}
	if err := DB.Select(&buildSteps, `SELECT
	id, start_time, end_time, step_success, step_stdout, step_skip
	FROM payload_build_step
	WHERE payload_id=$1`, databasePayload.ID); err == nil {
		for _, step := range buildSteps {
			/*
				if !step.StartTime.Valid {
					step.StartTime.Valid = true
					step.StartTime.Time = stepNow
				}

			*/
			// payload is done, we started a step, but never reported a status, it must be skipped
			if step.StartTime.Valid && !step.EndTime.Valid {
				step.StartTime = sql.NullTime{Valid: false}
				step.StepSkip = true
			} else if !step.StartTime.Valid {
				step.StepSkip = true
			}
			if step.StepStdout == "" {
				step.StepStdout = "Automatically updated when payload finished building"
			}
			if _, err := DB.NamedExec(`UPDATE payload_build_step SET
			end_time=:end_time, step_success=:step_success, step_stdout=:step_stdout, start_time=:start_time,
			step_skip=:step_skip 
			WHERE id=:id`, step); err != nil {
				logging.LogError(err, "Failed to automatically update step when payload finished building")
			}
		}
	} else if err == sql.ErrNoRows {

	} else {
		logging.LogError(err, "Failed to get payload build steps when payload finished building")
	}
}

func CheckUserPassword(databaseOperator databaseStructs.Operator, password string) bool {
	hashBytes := mythicCrypto.HashSha512([]byte(databaseOperator.Salt + password))
	hashByteString := fmt.Sprintf("%x", hashBytes)
	return hashByteString == databaseOperator.Password
}

func HashUserPassword(databaseOperator databaseStructs.Operator, password string) string {
	hashBytes := mythicCrypto.HashSha512([]byte(databaseOperator.Salt + password))
	return fmt.Sprintf("%x", hashBytes)
}

func AssignNewOperatorAllBrowserScripts(userID int) {
	browserscripts := []databaseStructs.Browserscript{}
	if err := DB.Select(&browserscripts, `SELECT
	*
	FROM
	browserscript
	WHERE
	operator_id IS NULL`); err != nil {
		logging.LogError(err, "Failed to fetch browserscripts where operator is NULL when creating a new operator")
		return
	} else {
		for _, script := range browserscripts {
			script.OperatorID = sql.NullInt64{Valid: true, Int64: int64(userID)}
			if _, err := DB.NamedExec(`INSERT INTO browserscript
			(operator_id, script, command_id, payload_type_id, active, author, user_modified, container_version, container_version_author, for_new_ui)
			VALUES
			(:operator_id,:script,:command_id,:payload_type_id,:active,:author,:user_modified,:container_version,:container_version_author,:for_new_ui)`,
				script); err != nil {
				logging.LogError(err, "Failed to create new browserscript entry")
			}
		}
	}
}

func SetGlobalSetting(name string, setting interface{}, operatorID int) error {
	newGlobalSetting := databaseStructs.GlobalSetting{Name: name}
	newSetting := databaseStructs.MythicJSONText{}
	err := newSetting.Scan(setting)
	if err != nil {
		logging.LogError(err, "Failed to marshal struct into databaseStructs.MythicJSONText")
	}
	newGlobalSetting.Setting = newSetting
	if operatorID > 0 {
		newGlobalSetting.OperatorID.Valid = true
		newGlobalSetting.OperatorID.Int64 = int64(operatorID)
	}
	_, err = DB.NamedExec(`UPDATE global_setting 
		SET setting=:setting, operator_id=:operator_id 
		WHERE "name"=:name`, newGlobalSetting)
	return err
}
