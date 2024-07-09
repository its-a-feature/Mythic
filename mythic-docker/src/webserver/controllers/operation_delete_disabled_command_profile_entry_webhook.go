package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/jmoiron/sqlx"
)

type DeleteDisabledCommandProfileEntryInput struct {
	Input DeleteDisabledCommandProfileEntry `json:"input" binding:"required"`
}

type DeleteDisabledCommandProfileEntry struct {
	Name    string `json:"name" binding:"required"`
	Entries []int  `json:"entries" binding:"required"`
}

type DeleteDisabledCommandProfileEntryResponse struct {
	Status     string `json:"status"`
	Error      string `json:"error"`
	Name       string `json:"name"`
	DeletedIDs []int  `json:"deleted_ids"`
}

func DeleteDisabledCommandProfileEntryWebhook(c *gin.Context) {
	// get variables from the POST request
	var input DeleteDisabledCommandProfileEntryInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  "Failed to get current operation. Is it set?",
		})
		return
	}
	operatorOperation := ginOperatorOperation.(*databaseStructs.Operatoroperation)
	if operatorOperation.CurrentOperation.AdminID != operatorOperation.CurrentOperator.ID {
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  "Only the admin of an operation can remove block lists",
		})
		return
	}
	affectedOperatorOperations := []databaseStructs.Operatoroperation{}
	err = database.DB.Select(&affectedOperatorOperations, `SELECT
			operatoroperation.id,
			disabledcommandsprofile.name "disabledcommandsprofile.name"
			FROM operatoroperation 
			JOIN disabledcommandsprofile ON operatoroperation.base_disabled_commands_id = disabledcommandsprofile.id
			WHERE operatoroperation.operation_id=$1
			`, operatorOperation.CurrentOperation.ID)
	if err != nil {
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	disabledCommandProfileEntries := []databaseStructs.Disabledcommandsprofile{}
	if err := database.DB.Select(&disabledCommandProfileEntries, `SELECT
			id, command_id
			FROM
			disabledcommandsprofile WHERE
			name=$1 AND operation_id=$2`,
		input.Input.Name, operatorOperation.CurrentOperation.ID); err != nil {
		logging.LogError(err, "Failed to get all disabled commands")
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	nonDeletedEntries := []int{}
	deletedEntries := []int{}
	for _, entry := range disabledCommandProfileEntries {
		if !utils.SliceContains(input.Input.Entries, entry.CommandID) {
			nonDeletedEntries = append(nonDeletedEntries, entry.ID)
		} else {
			deletedEntries = append(deletedEntries, entry.ID)
		}
	}
	// update all of the existing operatoroperation maps to point to non-deleted entries
	for _, operation := range affectedOperatorOperations {
		if operation.DisabledCommandsProfile.Name == input.Input.Name {
			// if the operation's disabled command profile is about to be deleted, we need to update it
			if len(nonDeletedEntries) == 0 {
				if _, err := database.DB.Exec(`UPDATE operatoroperation SET base_disabled_commands_id = NULL 
					WHERE id=$1`, operation.ID); err != nil {
					logging.LogError(err, "Failed to set base disabled commands to NULL")
					c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
						Status: "error",
						Error:  err.Error(),
					})
					return
				}
			} else if _, err := database.DB.Exec(`UPDATE operatoroperation SET base_disabled_commands_id=$1 WHERE id=$2`,
				nonDeletedEntries[0], operation.ID); err != nil {
				logging.LogError(err, "Failed to set base disabled command to non-deleted entry")
				c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
					Status: "error",
					Error:  err.Error(),
				})
				return
			}
		}
	}
	if query, args, err := sqlx.Named(`DELETE FROM disabledcommandsprofile WHERE name=:name AND operation_id=:operation_id AND command_id IN (:ids)`, map[string]interface{}{
		"name":         input.Input.Name,
		"operation_id": operatorOperation.CurrentOperation.ID,
		"ids":          input.Input.Entries,
	}); err != nil {
		logging.LogError(err, "Failed to make named statement")
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if query, args, err := sqlx.In(query, args...); err != nil {
		logging.LogError(err, "Failed to do sqlx.In")
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else {
		query = database.DB.Rebind(query)
		if _, err := database.DB.Exec(query, args...); err != nil {
			logging.LogError(err, "Failed to exec sqlx.IN modified statement")
			c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileEntryResponse{
			Status:     "success",
			Name:       input.Input.Name,
			DeletedIDs: deletedEntries,
		})
		return
	}
}
