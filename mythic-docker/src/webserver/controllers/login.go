package webcontroller

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

type LoginInput struct {
	Username         string `json:"username" binding:"required"`
	Password         string `json:"password" binding:"required"`
	ScriptingVersion string `json:"scripting_version"`
}

func Login(c *gin.Context) {
	var input LoginInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	} else if accessToken, refreshToken, userID, err := authentication.ValidateLogin(input.Username, input.Password, input.ScriptingVersion, c.ClientIP()); err != nil {
		logging.LogError(err, "Failed Authentication")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	} else if currentOperation, err := database.GetUserCurrentOperation(userID); err != nil {
		logging.LogError(err, "Failed get operation")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	} else {
		user := map[string]interface{}{
			"current_operation":    currentOperation.CurrentOperation.Name,
			"current_operation_id": currentOperation.CurrentOperation.ID,
			"username":             currentOperation.CurrentOperator.Username,
			"id":                   currentOperation.CurrentOperator.ID,
			"user_id":              currentOperation.CurrentOperator.ID,
		}
		// setting cookie max age to 2 days
		c.SetCookie("mythic", accessToken, 60*60*24*2, "/", strings.Split(c.Request.Host, ":")[0], false, false)
		c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
		return
	}

}

func GetMe(c *gin.Context) {
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Failed to get claims from JWT"})
		return
	}
	c.JSON(http.StatusOK, claims)
}

func GetMeWebhook(c *gin.Context) {
	if user, err := GetUserIDFromGin(c); err != nil {
		logging.LogError(err, "Failed to get UserID")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get UserID"})
		return
	} else if currentOperation, err := database.GetUserCurrentOperation(user); err != nil {
		logging.LogError(err, "Failed to get current operation")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get current operation"})
		return
	} else {
		//logging.LogInfo("got mewebhook info", "currentOperation", currentOperation)
		c.JSON(http.StatusOK, gin.H{
			"status":               "success",
			"current_operation":    currentOperation.CurrentOperation.Name,
			"current_operation_id": currentOperation.CurrentOperation.ID,
			"user_id":              currentOperation.CurrentOperator.ID,
			"id":                   currentOperation.CurrentOperator.ID,
		})
		return
	}

}

type RefreshJWTInput struct {
	AccessToken  string `json:"access_token" binding:"required"`
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func RefreshJWT(c *gin.Context) {
	var input RefreshJWTInput
	if err := c.ShouldBindJSON(&input); err != nil {
		logging.LogError(err, "Failed to find parameters for Refresh")
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	accessToken, refreshToken, userID, err := authentication.RefreshJWT(input.AccessToken, input.RefreshToken)
	if err != nil {
		logging.LogError(err, "Failed to use refresh token")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	currentOperation, err := database.GetUserCurrentOperation(userID)
	if err != nil {
		logging.LogError(err, "Failed to get user current operation")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	user := map[string]interface{}{
		"current_operation_name": currentOperation.CurrentOperation.Name,
		"current_operation_id":   currentOperation.OperationID,
		"username":               currentOperation.CurrentOperator.Username,
		"id":                     currentOperation.CurrentOperator.ID,
		"user_id":                currentOperation.CurrentOperator.ID,
	}
	// setting cookie max age to 2 days
	c.Set("user_id", currentOperation.CurrentOperator.ID)
	c.Set("username", currentOperation.CurrentOperator.Username)
	c.SetCookie("mythic", accessToken, 60*60*24*2, "/", strings.Split(c.Request.Host, ":")[0], false, false)
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return

}

func GetHasuraClaims(c *gin.Context) {
	/*
		x-hasura-user-id <-- user.ID
		x-hasura-current_operation <-- operation name ("null" if not set)
		x-hasura-current-operation-id <-- operation id ("0" if not set)
		x-hasura-role <-- view mode for current operation
			operator, spectator, operation_admin, mythic_admin
		x-hasura-operations <-- "{" + "," separated list of operation ids, + "}"
		x-hasura-admin-operations <-- "{" + "," separated list of operation ids, + "}"
	*/
	/*
		if err := authentication.TokenValid(c); err != nil {
			c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
			return
		}
	*/
	//logging.LogDebug("hasura webhook info", "headers", c.Request.Header)
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	hasuraClaims := make(map[string]interface{})
	//logging.LogTrace("JWT claims", "claims", claims, "user", claims.UserID)
	hasuraClaims["x-hasura-user-id"] = fmt.Sprintf("%d", claims.UserID)
	hasuraOperations := []string{}
	hasuraAdminOperations := []string{}
	user, err := database.GetUserFromID(claims.UserID)
	//logging.LogTrace("user info", "user", user)
	if err != nil {
		logging.LogError(err, "Failed to fetch operator based on JWT UserID")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	c.Set("username", user.Username)
	if !user.CurrentOperationID.Valid {
		hasuraClaims["x-hasura-current-operation-id"] = "0"
		hasuraClaims["x-hasura-current_operation"] = "null"
		hasuraClaims["x-hasura-role"] = "spectator"
	}
	allOperations, err := database.GetOperationsForUser(claims.UserID)
	if err != nil {
		logging.LogError(err, "Failed to get all operations for user when generating hasura claims")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}

	for _, operatorOperation := range *allOperations {
		//logging.LogInfo("operatorOperation info", "operatorOperation", operatorOperation)
		if operatorOperation.CurrentOperation.AdminID == claims.UserID {
			hasuraAdminOperations = append(hasuraAdminOperations, fmt.Sprintf("%d", operatorOperation.CurrentOperation.ID))
		}
		hasuraOperations = append(hasuraOperations, fmt.Sprintf("%d", operatorOperation.CurrentOperation.ID))
		if operatorOperation.CurrentOperation.ID == int(user.CurrentOperationID.Int64) {
			hasuraClaims["x-hasura-role"] = operatorOperation.ViewMode
			if hasuraClaims["x-hasura-role"] == "lead" {
				hasuraClaims["x-hasura-role"] = "operation_admin"
			}
		}
		if user.CurrentOperationID.Valid && (int(user.CurrentOperationID.Int64) == operatorOperation.CurrentOperation.ID) {
			hasuraClaims["x-hasura-current-operation-id"] = fmt.Sprintf("%d", user.CurrentOperationID.Int64)
			hasuraClaims["x-hasura-current_operation"] = user.CurrentOperation.Name
		}
	}

	if user.Admin {
		hasuraClaims["x-hasura-role"] = "mythic_admin"
	}
	hasuraClaims["x-hasura-operations"] = fmt.Sprintf("{%s}", strings.Join(hasuraOperations, ","))
	hasuraClaims["x-hasura-admin-operations"] = fmt.Sprintf("{%s}", strings.Join(hasuraAdminOperations, ","))
	//logging.LogTrace("hasura claims", "claims", hasuraClaims)
	c.JSON(http.StatusOK, hasuraClaims)
	return
}
