package webcontroller

import (
	"database/sql"
	"fmt"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdateOperatorOperationInput struct {
	Input UpdateOperatorOperation `json:"input" binding:"required"`
}

type UpdateOperatorOperation struct {
	OperationID             int                      `json:"operation_id" binding:"required"`
	AddUsers                []int                    `json:"add_users"`
	RemoveUsers             []int                    `json:"remove_users"`
	ViewModeOperators       []int                    `json:"view_mode_operators"`
	ViewModeSpectators      []int                    `json:"view_mode_spectators"`
	DisabledCommandProfiles []disabledCommandMapping `json:"disabled_command_map"`
}

type disabledCommandMapping struct {
	UserID                   int `json:"user_id"`
	DisabledCommandProfileID int `json:"disabled_command_profile_id"`
}

type UpdateOperatorOperationResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func UpdateOperatorOperationWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateOperatorOperationInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateOperatorOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	operator := databaseStructs.Operator{}
	operatorRole := databaseStructs.Operatoroperation{}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, UpdateOperatorOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = database.DB.Get(&operator, `SELECT * FROM operator WHERE id=$1`, userID)
	if err != nil {
		logging.LogError(err, "Failed to get information about operator")
		c.JSON(http.StatusOK, UpdateOperatorOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	err = database.DB.Get(&operatorRole, `SELECT * FROM operatoroperation WHERE 
		operator_id=$1 AND operation_id=$2`, operator.ID, input.Input.OperationID)
	if err != sql.ErrNoRows && err != nil {
		logging.LogError(err, "Failed to get information about operator's role in operation")
		c.JSON(http.StatusOK, UpdateOperatorOperationResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return

	}
	if !operator.Admin && operatorRole.ViewMode != database.OPERATOR_OPERATION_VIEW_MODE_LEAD {
		logging.LogError(nil, "Tried to update operation, but not admin or operation lead")
		c.JSON(http.StatusOK, UpdateOperatorOperationResponse{
			Status: "error",
			Error:  "Must be global admin or lead of operation to update it",
		})
		return
	}
	// get the associated database information
	currentOperation := databaseStructs.Operation{
		ID: input.Input.OperationID,
	}
	logging.LogDebug("Got message to update operatoroperation", "data", input.Input)
	// add users
	for _, user := range input.Input.AddUsers {
		newUser := databaseStructs.Operator{ID: user}
		if _, err := database.DB.Exec(`INSERT INTO operatoroperation
				(operator_id, operation_id) VALUES ($1, $2) ON CONFLICT DO NOTHING `, user, currentOperation.ID); err != nil {
			logging.LogError(err, "Failed to add operator to operation")
		} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
			logging.LogError(err, "Failed to lookup operator username")
		} else {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Adding %s to operation", newUser.Username),
				currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
			err = database.DB.Get(&newUser, `SELECT current_operation_id FROM operator WHERE id=$1`, newUser.ID)
			if err != nil {
				logging.LogError(err, "Failed to lookup operator username")
			}
			if int(newUser.CurrentOperationID.Int64) == 0 {
				newUser.CurrentOperationID.Valid = true
				newUser.CurrentOperationID.Int64 = int64(currentOperation.ID)
				_, err = database.DB.NamedExec(`UPDATE operator SET current_operation_id=:current_operation_id 
                WHERE id=:id`, newUser)
				if err != nil {
					logging.LogError(err, "Failed to update operator's current operation")
				}
			}
		}
	}
	// remove users
	for _, user := range input.Input.RemoveUsers {
		newUser := databaseStructs.Operator{ID: user}
		// can't remove the lead this way, you need to use the update first
		if _, err := database.DB.Exec(`DELETE FROM operatoroperation
				WHERE operator_id=$1 AND operation_id=$2 AND view_mode!=$3`,
			user, currentOperation.ID, database.OPERATOR_OPERATION_VIEW_MODE_LEAD); err != nil {
			logging.LogError(err, "Failed to remove operator from operation")
		} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
			logging.LogError(err, "Failed to lookup operator username")
		} else {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Removing %s from operation", newUser.Username),
				currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
			// now that a user was removed from the op, see if they have any other's available and update
			err = database.DB.Get(&newUser, `SELECT current_operation_id FROM operator WHERE id=$1`, newUser.ID)
			if err != nil {
				logging.LogError(err, "Failed to lookup operator username")
			}
			if int(newUser.CurrentOperationID.Int64) == currentOperation.ID {
				newUser.CurrentOperationID.Valid = false
				newUser.CurrentOperationID.Int64 = 0
				_, err = database.DB.NamedExec(`UPDATE operator SET current_operation_id=:current_operation_id 
                WHERE id=:id`, newUser)
				if err != nil {
					logging.LogError(err, "Failed to update operator's current operation")
				}
			}
		}

	}
	// change view_mode to operator for specified users
	for _, user := range input.Input.ViewModeOperators {
		newUser := databaseStructs.Operator{ID: user}
		if _, err := database.DB.Exec(`UPDATE operatoroperation SET
				view_mode=$1 WHERE operator_id=$2 AND operation_id=$3 AND view_mode!=$4`,
			database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR, user, currentOperation.ID,
			database.OPERATOR_OPERATION_VIEW_MODE_LEAD); err != nil {
			logging.LogError(err, "Failed to update view mode to operator")
		} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
			logging.LogError(err, "Failed to lookup operator username")
		} else {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s to operator", newUser.Username),
				currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
		}
	}
	// change view_mode to spectator for specified users
	for _, user := range input.Input.ViewModeSpectators {
		newUser := databaseStructs.Operator{ID: user}
		if _, err := database.DB.Exec(`UPDATE operatoroperation SET
				view_mode=$1 WHERE operator_id=$2 AND operation_id=$3 AND view_mode!=$4`,
			database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR, user, currentOperation.ID,
			database.OPERATOR_OPERATION_VIEW_MODE_LEAD); err != nil {
			logging.LogError(err, "Failed to update view mode to spectator")
		} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
			logging.LogError(err, "Failed to lookup operator username")
		} else {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s to spectator", newUser.Username),
				currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
		}
	}
	// update disabled command profiles
	for _, disabledProfile := range input.Input.DisabledCommandProfiles {
		var newProfileID *int
		if disabledProfile.DisabledCommandProfileID > 0 {
			newProfileID = &disabledProfile.DisabledCommandProfileID
		}
		newUser := databaseStructs.Operator{ID: disabledProfile.UserID}
		if _, err := database.DB.Exec(`UPDATE operatoroperation SET base_disabled_commands_id=$1
				WHERE operator_id=$2 AND operation_id=$3`, newProfileID, disabledProfile.UserID, currentOperation.ID); err != nil {
			logging.LogError(err, "Failed to update disabled commands profile")
		} else if err := database.DB.Get(&newUser, `SELECT username FROM operator WHERE id=$1`, newUser.ID); err != nil {
			logging.LogError(err, "Failed to lookup operator username")
		} else if disabledProfile.DisabledCommandProfileID > 0 {
			var profileName string
			if err := database.DB.Get(&profileName, `SELECT "name" FROM disabledcommandsprofile WHERE id=$1`, disabledProfile.DisabledCommandProfileID); err != nil {
				logging.LogError(err, "Failed to get disabled commands profile name")
			} else {
				go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Updated %s's disabled commands profile to '%s' ", newUser.Username, profileName),
					currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
			}
		} else {
			go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Removed %s's disabled commands profile ", newUser.Username),
				currentOperation.ID, "", database.MESSAGE_LEVEL_INFO)
		}

	}
	err = UpdateHasuraClaims(c, true)
	if err != nil {
		logging.LogError(err, "Failed to update claims")
	}
	c.JSON(http.StatusOK, UpdateOperatorOperationResponse{
		Status: "success",
	})
	return
}
