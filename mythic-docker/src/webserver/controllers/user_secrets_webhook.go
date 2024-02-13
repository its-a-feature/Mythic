package webcontroller

import (
	"github.com/its-a-feature/Mythic/rabbitmq"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

type UpdateSecretsInput struct {
	Input UpdateUserSecrets `json:"input" binding:"required"`
}

type UpdateUserSecrets struct {
	Secrets map[string]interface{} `json:"secrets" binding:"required"`
}

type UpdateSecretsResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}
type GetSecretsResponse struct {
	Status  string                 `json:"status"`
	Error   string                 `json:"error"`
	Secrets map[string]interface{} `json:"secrets"`
}

func GetSecretsWebhook(c *gin.Context) {
	// get the associated database information
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, GetSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get target user information from database")
		c.JSON(http.StatusOK, GetSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, GetSecretsResponse{
		Status:  "success",
		Secrets: user.Secrets.StructValue(),
	})
	return

}
func UpdateSecretsWebhook(c *gin.Context) {
	// get variables from the POST request
	var input UpdateSecretsInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, UpdateSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, UpdateSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	mythicJsonText := rabbitmq.GetMythicJSONTextFromStruct(input.Input.Secrets)
	_, err = database.DB.Exec(`UPDATE operator SET secrets=$1 WHERE id=$2`, mythicJsonText, userID)
	if err != nil {
		logging.LogError(nil, "Failed to update password")
		c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
			Status: "error",
			Error:  "Failed to set new password",
		})
		return
	}
	c.JSON(http.StatusOK, UpdateOperatorPasswordResponse{
		Status: "success",
	})
	return

}
