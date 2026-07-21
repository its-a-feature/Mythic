package webcontroller

import (
	"net/http"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
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
		"admin":                          currentOperation.CurrentOperator.Admin,
		"view_mode":                      currentOperation.ViewMode,
		"view_utc_time":                  currentOperation.CurrentOperator.ViewUtcTime,
		"current_utc_time":               time.Now().UTC(),
	}
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return

}

func GetWhoamiWebhook(c *gin.Context) {
	user, err := GetUserIDFromGin(c)
	if err != nil {
		logging.LogError(err, "Failed to get UserID")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get UserID"})
		return
	}
	operator, err := database.GetUserFromID(user)
	if err != nil {
		logging.LogError(err, "Failed to get operator")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get operator"})
		return
	}
	currentOperation, err := database.GetUserCurrentOperation(user)
	if err != nil {
		logging.LogError(err, "Failed to get current operation")
		c.JSON(http.StatusUnauthorized, gin.H{"status": "error", "error": "Failed to get current operation"})
		return
	}
	claims := currentClaimsOrNil(c)
	apiTokenInfo := buildWhoamiAPITokenInfo(c, claims)
	operations := buildWhoamiOperations(user)
	scopes := []string{}
	effectiveScopes := []string{}
	authMethod := ""
	eventStepInstanceID := 0
	if claims != nil {
		authMethod = claims.AuthMethod
		scopes = claims.Scopes
		effectiveScopes = mythicjwt.EffectiveScopes(claims.Scopes)
		eventStepInstanceID = claims.EventStepInstanceID
	}
	//logging.LogInfo("got whoami info", "currentOperation", currentOperation)
	c.JSON(http.StatusOK, gin.H{
		"status":               "success",
		"current_operation":    currentOperation.CurrentOperation.Name,
		"current_operation_id": currentOperation.CurrentOperation.ID,
		"username":             operator.Username,
		"email":                operator.Email.String,
		"account_type":         operator.AccountType,
		"user_id":              operator.ID,
		"admin":                operator.Admin,
		"active":               operator.Active,
		"deleted":              operator.Deleted,
		"view_mode":            currentOperation.ViewMode,
		"last_login":           operator.LastLogin.Time.UTC().Format(time.RFC3339),
		"current_utc_time":     time.Now().UTC().Format(time.RFC3339),
		"auth_method":          authMethod,
		"apitoken":             apiTokenInfo,
		"eventstepinstance_id": eventStepInstanceID,
		"scopes":               scopes,
		"effective_scopes":     effectiveScopes,
		"operations":           operations,
		"scope_info":           buildScopeIntrospectionResponse(c, claims),
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

func buildWhoamiOperations(userID int) []gin.H {
	operationSummaries := []gin.H{}
	operations, err := database.GetOperationsForUser(userID)
	if err != nil {
		return operationSummaries
	}
	for _, operation := range *operations {
		operationSummaries = append(operationSummaries, gin.H{
			"id":        operation.CurrentOperation.ID,
			"name":      operation.CurrentOperation.Name,
			"admin_id":  operation.CurrentOperation.AdminID,
			"view_mode": operation.ViewMode,
		})
	}
	return operationSummaries
}

func buildWhoamiAPITokenInfo(c *gin.Context, claims *mythicjwt.CustomClaims) gin.H {
	apiTokenID := 0
	authenticatedWithAPIToken := false
	if claims != nil {
		apiTokenID = claims.APITokensID
		authenticatedWithAPIToken = claims.APITokensID > 0
	}
	info := gin.H{
		"authenticated_with_apitoken": authenticatedWithAPIToken,
		"apitokens_id":                apiTokenID,
		"apitoken_name":               nil,
		"apitoken_type":               nil,
		"apitoken_created_by":         nil,
		"apitoken_creation_time":      nil,
		"apitoken_active":             nil,
		"apitoken_deleted":            nil,
		"apitoken_scopes":             []string{},
	}
	if apiTokenID <= 0 {
		return info
	}
	apiToken := databaseStructs.Apitokens{}
	if cachedAPIToken, ok := c.Get(authentication.ContextKeyAPIToken); ok {
		if typedAPIToken, ok := cachedAPIToken.(databaseStructs.Apitokens); ok && typedAPIToken.ID == apiTokenID {
			apiToken = typedAPIToken
		}
	}
	if apiToken.ID == 0 {
		err := database.DB.Get(&apiToken, `SELECT
			id, token_type, active, creation_time, operator_id, "name", scopes, created_by, deleted, eventstepinstance_id
			FROM apitokens
			WHERE id=$1`, apiTokenID)
		if err != nil {
			logging.LogError(err, "Failed to get API token info for whoami", "apitokens_id", apiTokenID)
			return info
		}
	}
	info["apitoken_name"] = apiToken.Name
	info["apitoken_type"] = apiToken.TokenType
	info["apitoken_created_by"] = apiToken.CreatedBy
	info["apitoken_creation_time"] = apiToken.CreationTime.UTC().Format(time.RFC3339)
	info["apitoken_active"] = apiToken.Active
	info["apitoken_deleted"] = apiToken.Deleted
	info["apitoken_scopes"] = []string(apiToken.Scopes)
	return info
}

func buildScopeIntrospectionResponse(c *gin.Context, claims *mythicjwt.CustomClaims) gin.H {
	if claims == nil {
		return gin.H{}
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
		"apitokens_id":         claims.APITokensID,
		"operator_id":          claims.UserID,
		"current_operation_id": claims.OperationID,
		"eventstepinstance_id": claims.EventStepInstanceID,
		"scopes":               claims.Scopes,
		"effective_scopes":     effectiveScopes,
		"scope_descriptions":   scopeDescriptions,
		"available_scopes":     mythicjwt.ScopeDefinitions(),
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
	// current_operation_name is retained as a compatibility alias for older clients.
	user := map[string]interface{}{
		"current_operation":              currentOperation.CurrentOperation.Name,
		"current_operation_name":         currentOperation.CurrentOperation.Name,
		"current_operation_id":           currentOperation.OperationID,
		"current_operation_banner_text":  currentOperation.CurrentOperation.BannerText,
		"current_operation_banner_color": currentOperation.CurrentOperation.BannerColor,
		"current_operation_complete":     currentOperation.CurrentOperation.Complete,
		"username":                       currentOperation.CurrentOperator.Username,
		"id":                             currentOperation.CurrentOperator.ID,
		"user_id":                        currentOperation.CurrentOperator.ID,
		"admin":                          currentOperation.CurrentOperator.Admin,
		"view_mode":                      currentOperation.ViewMode,
		"view_utc_time":                  currentOperation.CurrentOperator.ViewUtcTime,
		"current_utc_time":               time.Now().UTC(),
	}
	c.Set(authentication.ContextKeyUserID, currentOperation.CurrentOperator.ID)
	c.Set(authentication.ContextKeyUsername, currentOperation.CurrentOperator.Username)
	c.JSON(http.StatusOK, gin.H{"access_token": accessToken, "refresh_token": refreshToken, "user": user})
	return
}
