package database

import (
	"github.com/google/uuid"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"strings"
)

func CreateOperationBotForOperation(newOperation databaseStructs.Operation) {
	// create a new bot for the operation
	userName := strings.ToLower(newOperation.Name)
	userName = strings.ReplaceAll(userName, " ", "-")
	userName += "-bot"
	salt := uuid.New().String()
	newOperator := databaseStructs.Operator{
		Admin:            false,
		Username:         userName,
		Salt:             salt,
		FailedLoginCount: 0,
		Active:           true,
		AccountType:      databaseStructs.AccountTypeBot,
	}
	newOperator.CurrentOperationID.Valid = true
	newOperator.CurrentOperationID.Int64 = int64(newOperation.ID)
	newOperator.Password = HashUserPassword(newOperator, utils.GenerateRandomPassword(50))
	statement, err := DB.PrepareNamed(`INSERT INTO operator 
		(admin, username, salt, password, failed_login_count, active, account_type, current_operation_id) 
		VALUES (:admin, :username, :salt, :password, :failed_login_count, :active, :account_type, :current_operation_id)
		RETURNING id`)
	if err != nil {
		logging.LogError(err, "Failed to create named statement for new operator")
		return
	}
	err = statement.Get(&newOperator.ID, newOperator)
	if err != nil {
		logging.LogError(err, "Failed to create new operator", "operator", newOperator)
		return
	}
	// add the bot account to the operation
	newOperatorOperation := databaseStructs.Operatoroperation{
		OperatorID:  newOperator.ID,
		OperationID: newOperation.ID,
		ViewMode:    OPERATOR_OPERATION_VIEW_MODE_OPERATOR,
	}
	_, err = DB.NamedExec(`INSERT INTO operatoroperation
			(operator_id, operation_id, view_mode)
			VALUES (:operator_id, :operation_id, :view_mode)`, newOperatorOperation)
	if err != nil {
		logging.LogError(err, "Failed to create new operatorOperation mapping", "operatoroperation", newOperatorOperation)
		return
	}
}
