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
	NewPassword string `json:"new_password"`
	OldPassword string `json:"old_password"`
	Email       string `json:"email"`
}

type UpdateOperatorPasswordResponse struct {
	Status     string `json:"status"`
	Error      string `json:"error"`
	Email      string `json:"email"`
	OperatorID int    `json:"operator_id"`
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
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	callingUser, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get calling user information from database")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if callingUser.ID != input.Input.UserID && !callingUser.Admin {
		logging.LogError(err, "Cannot set the current password for another user if you're not an admin")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Cannot set the current password for another user if you're not an admin",
		})
		return
	}
	targetUser, err := database.GetUserFromID(input.Input.UserID)
	if err != nil {
		logging.LogError(err, "Failed to get target user information from database")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if input.Input.NewPassword != "" {
		if !callingUser.Admin && targetUser.ID != userID {
			c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
				Status: "error",
				Error:  "Only an admin or the account owner can update a password",
			})
			return
		}
		if !database.CheckUserPassword(*targetUser, input.Input.OldPassword) && !callingUser.Admin {
			logging.LogError(nil, "Calling user not admin and didn't supply the correct old password")
			c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
				Status: "error",
				Error:  "Calling user not admin and didn't supply the correct old password",
			})
			return
		}
		if len(input.Input.NewPassword) < 12 {
			logging.LogError(nil, "Tried to set password length < 12")
			c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
				Status: "error",
				Error:  "Passwords must be at least 12 characters long",
			})
			return
		}
		_, err = database.DB.Exec(`UPDATE operator SET password=$1 WHERE id=$2`,
			database.HashUserPassword(*targetUser, input.Input.NewPassword), input.Input.UserID)
		if err != nil {
			logging.LogError(nil, "Failed to update password")
			c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
				Status: "error",
				Error:  "Failed to set new password",
			})
			return
		}
	}
	if !callingUser.Admin && targetUser.ID != userID {
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Only an admin or the account owner can update an email",
		})
		return
	}
	if input.Input.Email != "" {
		targetUser.Email.Valid = true
		targetUser.Email.String = input.Input.Email
	} else {
		targetUser.Email.Valid = false
		targetUser.Email.String = ""
	}
	_, err = database.DB.Exec(`UPDATE operator SET email=$1 WHERE id=$2`,
		input.Input.Email, input.Input.UserID)
	if err != nil {
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}

	c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
		Status:     "success",
		Email:      targetUser.Email.String,
		OperatorID: targetUser.ID,
	})
	return
}
