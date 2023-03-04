package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

type GenerateAPITokenInput struct {
	Input GenerateAPIToken `json:"input" binding:"required"`
}

type GenerateAPIToken struct {
	TokenType string `json:"token_type" binding:"required"`
}

type GenerateAPITokenResponse struct {
	Status     string `json:"status"`
	TokenValue string `json:"token_value"`
	Error      string `json:"error"`
	ID         int    `json:"id"`
	OperatorID int    `json:"operator_id"`
}

func GenerateAPITokenWebhook(c *gin.Context) {
	// get variables from the POST request
	var input GenerateAPITokenInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, GenerateAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	}
	// get the associated database information
	// an api token is just the same as a JWT
	if userID, err := GetUserIDFromGin(c); err != nil {
		c.JSON(http.StatusOK, GenerateAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else if access_token, _, _, err := authentication.GenerateJWT(databaseStructs.Operator{
		ID: userID,
	}, authentication.AUTH_METHOD_API); err != nil {
		c.JSON(http.StatusOK, GenerateAPITokenResponse{
			Status: "error",
			Error:  err.Error(),
		})
		return
	} else {
		// save off the access_token as an API token and then return it
		apiToken := databaseStructs.Apitokens{
			TokenValue: access_token,
			OperatorID: userID,
			TokenType:  input.Input.TokenType,
			Active:     true,
		}
		if statement, err := database.DB.PrepareNamed(`INSERT INTO apitokens 
		(token_value, operator_id, token_type, active) 
		VALUES
		(:token_value, :operator_id, :token_type, :active)
		RETURNING id`); err != nil {
			c.JSON(http.StatusOK, GenerateAPITokenResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else if err := statement.Get(&apiToken.ID, apiToken); err != nil {
			c.JSON(http.StatusOK, GenerateAPITokenResponse{
				Status: "error",
				Error:  err.Error(),
			})
			return
		} else {
			c.JSON(http.StatusOK, GenerateAPITokenResponse{
				Status:     "success",
				TokenValue: access_token,
				OperatorID: userID,
				ID:         apiToken.ID,
			})
		}
	}
}
