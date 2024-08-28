package webcontroller

import (
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
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
	OperatorID int                    `json:"operator_id"`
	Secrets    map[string]interface{} `json:"secrets" binding:"required"`
}

type UpdateSecretsResponse struct {
	Status string `json:"status"`
	Error  string `json:"error"`
}
type GetSecretsInput struct {
	Input GetUserSecrets `json:"input" binding:"required"`
}
type GetUserSecrets struct {
	OperatorID int `json:"operator_id"`
}
type GetSecretsResponse struct {
	Status  string                 `json:"status"`
	Error   string                 `json:"error"`
	Secrets map[string]interface{} `json:"secrets"`
}

func GetSecretsWebhook(c *gin.Context) {
	// get the associated database information
	var input GetSecretsInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		logging.LogError(err, "Failed to get required parameters")
		c.JSON(http.StatusOK, GetSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get userID from JWT")
		c.JSON(http.StatusOK, GetSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	me, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get target user information from database")
		c.JSON(http.StatusOK, GetSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	if input.Input.OperatorID > 0 && input.Input.OperatorID != me.ID {
		if !me.Admin {
			c.JSON(http.StatusOK, GetSecretsResponse{
				Status: "error",
				Error:  "You are not allowed to access this resource",
			})
			return
		}
		targetOperator, err := database.GetUserFromID(input.Input.OperatorID)
		if err != nil {
			logging.LogError(err, "Failed to get target operator information from database")
			c.JSON(http.StatusOK, GetSecretsResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		if targetOperator.AccountType != databaseStructs.AccountTypeBot {
			c.JSON(http.StatusOK, GetSecretsResponse{
				Status: "error",
				Error:  "only admin accounts can access the secrets of a bot account",
			})
			return
		}
		c.JSON(http.StatusOK, GetSecretsResponse{
			Status:  "success",
			Secrets: targetOperator.Secrets.StructValue(),
		})
		return
	}
	c.JSON(http.StatusOK, GetSecretsResponse{
		Status:  "success",
		Secrets: me.Secrets.StructValue(),
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
	me, err := database.GetUserFromID(userID)
	if err != nil {
		logging.LogError(err, "Failed to get user from database")
		c.JSON(http.StatusOK, UpdateSecretsResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	mythicJsonText := rabbitmq.GetMythicJSONTextFromStruct(input.Input.Secrets)
	if input.Input.OperatorID > 0 && input.Input.OperatorID != me.ID {
		if !me.Admin {
			c.JSON(http.StatusOK, UpdateSecretsResponse{
				Status: "error",
				Error:  "You are not allowed to access this resource",
			})
			return
		}
		targetOperator, err := database.GetUserFromID(input.Input.OperatorID)
		if err != nil {
			logging.LogError(err, "Failed to get target operator information from database")
			c.JSON(http.StatusOK, UpdateSecretsResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		}
		if targetOperator.AccountType != databaseStructs.AccountTypeBot {
			c.JSON(http.StatusOK, UpdateSecretsResponse{
				Status: "error",
				Error:  "only admin accounts can access the secrets of a bot account",
			})
			return
		}
		userID = targetOperator.ID
	}
	_, err = database.DB.Exec(`UPDATE operator SET secrets=$1 WHERE id=$2`, mythicJsonText, userID)
	if err != nil {
		logging.LogError(nil, "Failed to update secrets")
		c.JSON(http.StatusOK, UpdateSecretsResponse{
			Status: "error",
			Error:  "Failed to set new secrets",
		})
		return
	}
	c.JSON(http.StatusOK, UpdateSecretsResponse{
		Status: "success",
	})
	return

}
