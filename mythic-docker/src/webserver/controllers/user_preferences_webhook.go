package webcontroller

import (
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdatePreferencesInput struct {
	Input UpdateUserPreferences `json:"input" binding:"required"`
}

type UpdateUserPreferences struct {
	Preferences map[string]interface{} `json:"preferences" binding:"required"`
}

type UpdatePreferencesResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}
type GetPreferencesResponse struct {
	Status      string                 `json:"status"`
	Error       string                 `json:"error"`
	Preferences map[string]interface{} `json:"preferences"`
}

func GetPreferencesWebhook(c *gin.Context) {
	// get the associated database information
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, GetPreferencesResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	me, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get target user information from database")
		c.JSON(http.StatusOK, GetPreferencesResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, GetPreferencesResponse{
		Status:      "success",
		Preferences: me.Preferences.StructValue(),
	})
	return

}
func UpdatePreferencesWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdatePreferencesInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdatePreferencesResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, UpdatePreferencesResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	mythicJsonText := rabbitmq.GetMythicJSONTextFromStruct(input.Input.Preferences)
	_, err = database.DB.Exec(`UPDATE operator SET preferences=$1 WHERE id=$2`, mythicJsonText, userID)
	if err != nil {
		logging.LogError(nil, "Failed to update secrets")
		c.JSON(http.StatusOK, UpdatePreferencesResponse{
			Status: "error",
			Error:  "Failed to set new preferences",
		})
		return
	}
	c.JSON(http.StatusOK, UpdatePreferencesResponse{
		Status: "success",
	})
	return

}
