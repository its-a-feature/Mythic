package webcontroller

import (
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"net/http"
	"strings"
	"time"

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
	err := c.ShouldBindJSON(&input)
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": err.Error()})
		return
	}
	accessToken, refreshToken, userID, err := authentication.ValidateLogin(input.Username, input.Password, input.ScriptingVersion, c.ClientIP())
	if err != nil {
		logging.LogError(err, "Failed Authentication")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	currentOperation, err := database.GetUserCurrentOperation(userID)
	if err != nil {
		logging.LogError(err, "Failed get operation")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	user := map[string]interface{}{
		"current_operation":              currentOperation.CurrentOperation.Name,
		"current_operation_banner_text":  currentOperation.CurrentOperation.BannerText,
		"current_operation_banner_color": currentOperation.CurrentOperation.BannerColor,
		"current_operation_complete":     currentOperation.CurrentOperation.Complete,
		"current_operation_id":           currentOperation.CurrentOperation.ID,
		"username":                       currentOperation.CurrentOperator.Username,
		"id":                             currentOperation.CurrentOperator.ID,
		"user_id":                        currentOperation.CurrentOperator.ID,
		"view_utc_time":                  currentOperation.CurrentOperator.ViewUtcTime,
		"current_utc_time":               time.Now().UTC(),
	}
	// setting cookie max age to 2 days
	c.SetCookie("mythic", accessToken, 60*60*24*2, "/", strings.Split(c.Request.Host, ":")[0], true, true)
	c.SetSameSite(http.SameSiteStrictMode)
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return

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
			"status":                         "success",
			"current_operation":              currentOperation.CurrentOperation.Name,
			"current_operation_banner_text":  currentOperation.CurrentOperation.BannerText,
			"current_operation_banner_color": currentOperation.CurrentOperation.BannerColor,
			"current_operation_complete":     currentOperation.CurrentOperation.Complete,
			"current_operation_id":           currentOperation.CurrentOperation.ID,
			"user_id":                        currentOperation.CurrentOperator.ID,
			"id":                             currentOperation.CurrentOperator.ID,
			"current_utc_time":               time.Now().UTC(),
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
	accessToken, refreshToken, userID, err := mythicjwt.RefreshJWT(input.AccessToken, input.RefreshToken)
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
		"current_operation_name":         currentOperation.CurrentOperation.Name,
		"current_operation_id":           currentOperation.OperationID,
		"current_operation_banner_text":  currentOperation.CurrentOperation.BannerText,
		"current_operation_banner_color": currentOperation.CurrentOperation.BannerColor,
		"current_operation_complete":     currentOperation.CurrentOperation.Complete,
		"username":                       currentOperation.CurrentOperator.Username,
		"id":                             currentOperation.CurrentOperator.ID,
		"user_id":                        currentOperation.CurrentOperator.ID,
		"view_utc_time":                  currentOperation.CurrentOperator.ViewUtcTime,
		"current_utc_time":               time.Now().UTC(),
	}
	// setting cookie max age to 2 days
	c.Set("user_id", currentOperation.CurrentOperator.ID)
	c.Set("username", currentOperation.CurrentOperator.Username)
	c.SetCookie("mythic", accessToken, 60*60*24*2, "/", strings.Split(c.Request.Host, ":")[0], true, true)
	c.SetSameSite(http.SameSiteStrictMode)
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return

}
