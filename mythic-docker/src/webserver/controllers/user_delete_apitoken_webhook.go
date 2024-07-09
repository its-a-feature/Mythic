package webcontroller

import (
	"github.com/its-a-feature/Mythic/logging"
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

type DeleteAPITokenInput struct {
	Input DeleteAPIToken `json:"input" binding:"required"`
}

type DeleteAPIToken struct {
	APITokenID int `json:"apitokens_id" binding:"required"`
}

type DeleteAPITokenResponse struct {
	Status     string `json:"status"`
	Error      string `json:"error"`
	ID         int    `json:"id"`
	OperatorID int    `json:"operator_id"`
	Name       string `json:"name"`
}

func DeleteAPITokenWebhook(c *gin.Context) {
	// get variables from the POST request
	var input DeleteAPITokenInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusOK, DeleteAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	// an api token is just the same as a JWT
	userID, err := GetUserIDFromGin(c)
	if err != nil {
		c.JSON(http.StatusOK, DeleteAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	user, err := database.GetUserFromID(userID)
	if err != nil {
		c.JSON(http.StatusOK, DeleteAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	apiToken := databaseStructs.Apitokens{}
	err = database.DB.Get(&apiToken, `SELECT * FROM apitokens WHERE id=$1`, input.Input.APITokenID)
	if err != nil {
		logging.LogError(err, "failed to find apitoken to delete")
		c.JSON(http.StatusOK, DeleteAPITokenResponse{
			Status: "error",
			Error:  "Failed to find apitoken",
		})
		return
	}
	if apiToken.OperatorID != userID {
		if apiToken.CreatedBy != userID && !user.Admin {
			c.JSON(http.StatusOK, DeleteAPITokenResponse{
				Status: "error",
				Error:  "Cannot delete an apitoken you didn't create if you're not an admin",
			})
			return
		}
	}
	apiToken.Deleted = true
	apiToken.Active = false
	_, err = database.DB.NamedExec(`UPDATE apitokens SET deleted=:deleted, active=:active WHERE id=:id`, apiToken)
	if err != nil {
		c.JSON(http.StatusOK, DeleteAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	c.JSON(http.StatusOK, DeleteAPITokenResponse{
		Status:     "success",
		OperatorID: apiToken.OperatorID,
		ID:         apiToken.ID,
		Name:       apiToken.Name,
	})
	return
}
