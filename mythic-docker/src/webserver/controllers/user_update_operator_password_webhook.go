package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdateOperatorPasswordInput struct {
	Input UpdateOperatorPassword `json:"input" binding:"required"`
}

type UpdateOperatorPassword struct {
	UserID      int    `json:"user_id" binding:"required"`
	NewPassword string `json:"new_password" binding:"required"`
	OldPassword string `json:"old_password"`
}

type UpdateOperatorPasswordResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}

func UpdateOperatorPasswordWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateOperatorPasswordInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	if userID, err := GetUserIDFromGin(c); err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if callingUser, err := database.GetUserFromID(userID); err != nil {
		logging.LogError(err, "Failed to get calling user information from database")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if callingUser.ID != input.Input.UserID && !callingUser.Admin {
		logging.LogError(err, "Cannot set the current password for another user if you're not an admin")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Cannot set the current password for another user if you're not an admin",
		})
		return
	} else if targetUser, err := database.GetUserFromID(input.Input.UserID); err != nil {
		logging.LogError(err, "Failed to get target user information from database")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if !database.CheckUserPassword(*targetUser, input.Input.OldPassword) && !callingUser.Admin {
		logging.LogError(nil, "Calling user not admin and didn't supply the correct old password")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Calling user not admin and didn't supply the correct old password",
		})
		return
	} else if len(input.Input.NewPassword) < 12 {
		logging.LogError(nil, "Tried to set password length < 12")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Passwords must be at least 12 characters long",
		})
		return

	} else if _, err := database.DB.Exec(`UPDATE operator SET password=$1 WHERE id=$2`,
		database.HashUserPassword(*targetUser, input.Input.NewPassword), input.Input.UserID); err != nil {
		logging.LogError(nil, "Failed to update password")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Failed to set new password",
		})
		return
	} else {
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "success",
		})
		return
	}
}
