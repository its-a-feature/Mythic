package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
)

type DeleteDisabledCommandProfileInput struct {
	Input DeleteDisabledCommandProfile `json:"input" binding:"required"`
}

type DeleteDisabledCommandProfile struct {
	Name string `json:"name" binding:"required"`
}

type DeleteDisabledCommandProfileResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
	Name   string `json:"name"`
}

func DeleteDisabledCommandProfileWebhook(c *gin.Context) {
	// get variables from the POST request
	var input DeleteDisabledCommandProfileInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	ginOperatorOperation, ok := c.Get("operatorOperation")
	if !ok {
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileResponse{
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
	if err := database.DB.Select(&affectedOperatorOperations, `SELECT
			operatoroperation.id,
			disabledcommandsprofile.name "disabledcommandsprofile.name"
			FROM operatoroperation 
			JOIN disabledcommandsprofile ON operatoroperation.base_disabled_commands_id = disabledcommandsprofile.id
			WHERE operatoroperation.operation_id=$1
			`, operatorOperation.CurrentOperation.ID); err != nil {
		c.JSON(http.StatusOK, DeleteDisabledCommandProfileResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else {
		for _, operation := range affectedOperatorOperations {
			if operation.DisabledCommandsProfile.Name == input.Input.Name {
				if _, err := database.DB.Exec(`UPDATE operatoroperation SET base_disabled_commands_id = NULL 
					WHERE id=$1`, operation.ID); err != nil {
					logging.LogError(err, "Failed to set base disabled commands to NULL")
					c.JSON(http.StatusOK, DeleteDisabledCommandProfileResponse{
						Status: "error",
						Error:  err.Error(),
					})
					return
				}
			}

		}
		if _, err := database.DB.Exec(`DELETE FROM disabledcommandsprofile WHERE name=$1 AND operation_id=$2`,
			input.Input.Name, operatorOperation.CurrentOperation.ID); err != nil {
			logging.LogError(err, "Failed to delete disabledcommandsprofile entries")
			c.JSON(http.StatusOK, DeleteDisabledCommandProfileResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
	}
	c.JSON(http.StatusOK, DeleteDisabledCommandProfileResponse{
		Status: "success",
		Name:   input.Input.Name,
	})
	return

}
