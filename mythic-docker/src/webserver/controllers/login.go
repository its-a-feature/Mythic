package webcontroller

import (
	"net/http"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"

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
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return

}

func GetMeWebhook(c *gin.Context) {
	user, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get UserID")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get UserID"})
		return
	}
	currentOperation, err := database.GetUserCurrentOperation(user)
	if err != nil {
		logging.LogError(err, "Failed to get current operation")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get current operation"})
		return
	}
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
		"scope_info":                     buildScopeIntrospectionResponse(c, currentClaimsOrNil(c)),
	})
	return
}

func currentClaimsOrNil(c *gin.Context) *mythicjwt.CustomClaims {
	claims, err := authentication.GetClaims(c)
	if err != nil {
		return nil
	}
	return claims
}

func buildScopeIntrospectionResponse(c *gin.Context, claims *mythicjwt.CustomClaims) gin.H {
	if claims == nil {
		return gin.H{}
	}
	operationIDs := []int{}
	if operations, err := database.GetOperationsForUser(claims.UserID); err == nil {
		for _, operation := range *operations {
			operationIDs = append(operationIDs, operation.CurrentOperation.ID)
		}
	}
	effectiveScopes := mythicjwt.EffectiveScopes(claims.Scopes)
	hasAllScopes := mythicjwt.AllowsScope(claims.Scopes, mythicjwt.SCOPE_ALL)
	scopeDescriptions := []mythicjwt.ScopeDefinition{}
	for _, definition := range mythicjwt.ScopeDefinitions() {
		if hasAllScopes || mythicjwt.AllowsScope(effectiveScopes, definition.Name) {
			scopeDescriptions = append(scopeDescriptions, definition)
		}
	}
	return gin.H{
		"auth_method":          claims.AuthMethod,
		"apitoken_id":          claims.APITokensID,
		"operator_id":          claims.UserID,
		"current_operation_id": claims.OperationID,
		"scopes":               claims.Scopes,
		"effective_scopes":     effectiveScopes,
		"scope_descriptions":   scopeDescriptions,
		"available_scopes":     mythicjwt.ScopeDefinitions(),
		"operation_ids":        operationIDs,
		"hasura_scope_claims":  mythicjwt.HasuraScopeRequirements(),
		"limitations": []string{
			"Scopes apply within the operations available to the authenticated operator.",
			"Write scopes include read access for the same resource.",
			"Unregistered routes still rely on Mythic's existing role and operation checks.",
		},
	}
}

type RefreshJWTInput struct {
	AccessToken  string `json:"access_token" binding:"required"`
	RefreshToken string `json:"refresh_token" binding:"required"`
}

func RefreshJWT(c *gin.Context) {
	var input RefreshJWTInput
	err := c.ShouldBindJSON(&input)
	if err != nil {
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
	c.Set(authentication.ContextKeyUserID, currentOperation.CurrentOperator.ID)
	c.Set(authentication.ContextKeyUsername, currentOperation.CurrentOperator.Username)
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return
}
