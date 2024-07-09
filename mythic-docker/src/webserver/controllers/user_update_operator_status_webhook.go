package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdateOperatorStatusInput struct {
	Input UpdateOperatorStatus `json:"input" binding:"required"`
}

type UpdateOperatorStatus struct {
	UserID  int   `json:"operator_id" binding:"required"`
	Active  *bool `json:"active"`
	Admin   *bool `json:"admin"`
	Deleted *bool `json:"deleted"`
}

type UpdateOperatorStatusResponse struct {
	Status  string `json:"status"`
	Error   string `json:"error"`
	UserID  int    `json:"id"`
	Active  bool   `json:"active"`
	Admin   bool   `json:"admin"`
	Deleted bool   `json:"deleted"`
}

func UpdateOperatorStatusWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateOperatorStatusInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	callingUser, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get calling user information from database")
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if !callingUser.Admin {
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  "Must be an admin to update deleted, admin, or active status",
		})
		return
	}
	if callingUser.Deleted || !callingUser.Active {
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  "Can't use an inactive or deleted account to update operator status",
		})
		return
	}
	if input.Input.UserID == callingUser.ID {
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  "Can't update your own status",
		})
		return
	}
	targetUser, err := database.GetUserFromID(input.Input.UserID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  "Failed to get information on target user",
		})
		return
	}
	if input.Input.Deleted != nil {
		targetUser.Deleted = *input.Input.Deleted
	}
	if input.Input.Admin != nil {
		if targetUser.AccountType == databaseStructs.AccountTypeBot && *input.Input.Admin {
			c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
				Status: "error",
				Error:  "Bot accounts can't be admin",
			})
			return
		}
		targetUser.Admin = *input.Input.Admin
	}
	if input.Input.Active != nil {
		targetUser.Active = *input.Input.Active
	}
	_, err = database.DB.NamedExec(`UPDATE operator SET 
                    deleted=:deleted, "admin"=:admin, active=:active
                WHERE id=:id`,
		targetUser)
	if err != nil {
		logging.LogError(nil, "Failed to update password")
		c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
			Status: "error",
			Error:  "Failed to update operator",
		})
		return
	}
	err = UpdateHasuraClaims(c, true)
	if err != nil {
		logging.LogError(err, "Failed to update claims")
	}
	c.JSON(http.StatusOK, UpdateOperatorStatusResponse{
		Status:  "success",
		Admin:   targetUser.Admin,
		Active:  targetUser.Active,
		Deleted: targetUser.Deleted,
		UserID:  targetUser.ID,
	})
	return
}
