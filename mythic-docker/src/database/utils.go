package database

import (
	"database/sql"
	"fmt"

	"github.com/google/uuid"
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

func GetUserCurrentOperation(userID int) (*databaseStructs.Operatoroperation, error) {
	var operatorOperation []databaseStructs.Operatoroperation
	if err := DB.Select(&operatorOperation, `SELECT 
	operatoroperation.id, operatoroperation.view_mode, operatoroperation.base_disabled_commands_id,
	operatoroperation.operator_id, operatoroperation.operation_id,
	operator.id "operator.id",
	operator.username "operator.username", 
	operator.admin "operator.admin",
	operator.current_operation_id "operator.current_operation_id",
	operation.id "operation.id",
	operation.name "operation.name", 
	operation.admin_id "operation.admin_id",
	operation.webhook "operation.webhook"
	FROM operatoroperation
	JOIN operation ON operatoroperation.operation_id = operation.id 
	JOIN operator ON operatoroperation.operator_id = operator.id 
	WHERE operatoroperation.operator_id=$1`, userID); err != nil {
		// this means we don't have the payload, so we need to create it and all of the associated components
		logging.LogError(err, "Failed to find operation for user", "user", userID)
		return nil, err
	} else {
		//logging.LogDebug("OperatorOperation Information", "operator_operation", operatorOperation)
		for _, curOp := range operatorOperation {
			if curOp.CurrentOperator.CurrentOperationID.Int64 == int64(curOp.CurrentOperation.ID) {
				return &curOp, nil
			}
		}
		blankOperation := databaseStructs.Operatoroperation{}
		if operatorInfo, err := GetUserFromID(userID); err != nil {
			logging.LogError(err, "Failed to get user info when operation isn't set")
			return nil, err
		} else {
			blankOperation.CurrentOperator = *operatorInfo
		}
		logging.LogError(nil, "No operation set for user, so returning blank")
		return &blankOperation, nil
	}
}

func GetUserFromID(userID int) (*databaseStructs.Operator, error) {
	operator := databaseStructs.Operator{}
	if err := DB.Get(&operator, `SELECT 
	username, id, admin, last_login, failed_login_count, salt, password,
	last_failed_login_timestamp, active, deleted, current_operation_id, view_utc_time, 
	current_operation_id  
	FROM operator 
	WHERE id=$1`, userID); err != nil {
		logging.LogError(err, "Failed to find operator", "user_id", userID)
		return nil, err
	} else {
		return &operator, nil
	}
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
	if _, updateError := DB.NamedExec("UPDATE payload SET "+
		"build_phase=:build_phase, build_stderr=:build_stderr "+
		"WHERE id=:id", databasePayload,
	); updateError != nil {
		logging.LogError(updateError, "Failed to update payload's build status to error")
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

func SendAllOperationsMessage(message string, operationID int, source string, messageLevel MESSAGE_LEVEL) {
	/*
		Send a message to all operation's event logs if operationID is 0, otherwise just send it to the specific operation.
		if messageLevel == "error", first check to see if there's an unresolved message of type `source` first.
			if so, increment the counter
			if not, create the message
	*/
	var operations []databaseStructs.Operation
	if err := DB.Select(&operations, `SELECT id FROM operation WHERE complete=false`); err != nil {
		logging.LogError(err, "Failed to get operations for SendAllOperationsMessage", "message", message)
		return
	}
	sourceString := source
	if sourceString == "" {
		if sourceIdentifier, err := uuid.NewUUID(); err != nil {
			logging.LogError(err, "Failed to generate new UUID for source of SendAllOperationsMessage")
		} else {
			sourceString = sourceIdentifier.String()
		}
	}
	for _, operation := range operations {
		if operationID == 0 || operation.ID == operationID {
			// this is the operation we're interested in
			if messageLevel == MESSAGE_LEVEL_WARNING {
				existingMessage := databaseStructs.Operationeventlog{}
				if err := DB.Get(&existingMessage, `
				SELECT id, count FROM operationeventlog WHERE
				level='warning' and source=$1 and operation_id=$2 and resolved=false and deleted=false
				`, sourceString, operation.ID); err != nil {
					if err != sql.ErrNoRows {
						logging.LogError(err, "Failed to query existing event log message")
					} else if err == sql.ErrNoRows {
						newMessage := databaseStructs.Operationeventlog{
							Source:      sourceString,
							Level:       string(messageLevel),
							Message:     message,
							OperationID: operation.ID,
							Count:       0,
						}
						if _, err := DB.NamedExec(`INSERT INTO operationeventlog 
						(source, "level", "message", operation_id, count) 
						VALUES 
						(:source, :level, :message, :operation_id, :count)`, newMessage); err != nil {
							logging.LogError(err, "Failed to create new operationeventlog message")
						}
					}
				} else {
					// err was nil, so we did get a matching existing message
					existingMessage.Count += 1
					if _, err := DB.NamedExec(`UPDATE operationeventlog SET 
					"count"=:count 
					WHERE id=:id`, existingMessage); err != nil {
						logging.LogError(err, "Failed to increase count on operationeventlog")
					}
				}
			} else {
				newMessage := databaseStructs.Operationeventlog{
					Source:      sourceString,
					Level:       string(messageLevel),
					Message:     message,
					OperationID: operation.ID,
					Count:       0,
				}
				if _, err := DB.NamedExec(`INSERT INTO operationeventlog 
				(source, "level", "message", operation_id, count) 
				VALUES 
				(:source, :level, :message, :operation_id, :count)`, newMessage); err != nil {
					logging.LogError(err, "Failed to create new operationeventlog message")
				}
			}

		}
	}
}
func ResolveAllOperationsMessage(message string, operationID int) {
	/*
		Resolve a message in all operation's event logs if operationID is 0, otherwise just resolve it to the specific operation.
	*/
	operations := []databaseStructs.Operation{}
	if err := DB.Select(&operations, `SELECT id FROM operation WHERE complete=false`); err != nil {
		logging.LogError(err, "Failed to get operations for ResolveAllOperationsMessage", "data", message)
		return
	}
	for _, operation := range operations {
		if operationID == 0 || operation.ID == operationID {
			// this is the operation we're interested in
			updateObject := databaseStructs.Operationeventlog{
				Message:     message,
				OperationID: operationID,
			}
			if operationID == 0 {
				updateObject.OperationID = operation.ID
			}
			if _, err := DB.NamedExec(`UPDATE operationeventlog SET 
			resolved=true 
			WHERE level='warning' AND resolved=false AND deleted=false AND message=:message AND operation_id=:operation_id`, updateObject); err != nil {
				logging.LogError(err, "Failed to increase count on operationeventlog")
			}
		}
	}
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
