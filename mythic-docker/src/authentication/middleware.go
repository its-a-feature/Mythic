package authentication

import (
	"fmt"
	"net"
	"net/http"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/rabbitmq"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/its-a-feature/Mythic/utils"
)

func JwtAuthMiddleware() gin.HandlerFunc {
	// verify that all authenticated requests have valid signatures and aren't expired
	return func(c *gin.Context) {
		err := TokenValid(c)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		c.Next()
	}
}

func IPBlockMiddleware() gin.HandlerFunc {
	// verify that xforward-for address is in range from utils.Config.AllowedIPBlocks
	return func(c *gin.Context) {
		ip := c.ClientIP()
		ipAddr := net.ParseIP(ip)
		if ipAddr == nil {
			logging.LogError(nil, "Failed to parse client IP", "client_ip", ip)
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		// make sure the ipAddr is in at least one of the alowed IP blocks
		for _, subnet := range utils.MythicConfig.AllowedIPBlocks {
			if subnet.Contains(ipAddr) {
				c.Next()
				return
			}
		}
		logging.LogError(nil, "Client IP not in allowed IP blocks", "client_ip", ipAddr)
		go rabbitmq.SendAllOperationsMessage(fmt.Sprintf("Client IP, %s, not in allowed IP blocks: %v", ipAddr.String(), utils.MythicConfig.AllowedIPBlocks),
			0, ipAddr.String(), database.MESSAGE_LEVEL_AUTH, true)
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		c.Abort()
		return
	}
}

func RBACMiddleware(allowedRoles []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		customClaims, err := GetClaims(c)
		if err != nil {
			logging.LogError(err, "Failed to get claims for RBACMiddleware")
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		operatorOperation, err := database.GetUserCurrentOperation(customClaims.UserID)
		if err != nil {
			logging.LogError(err, "Failed to get user current operation")
			c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
			c.Abort()
			return
		}
		if operatorOperation.CurrentOperator.Admin || utils.SliceContains(allowedRoles, operatorOperation.ViewMode) {
			c.Set("operatorOperation", operatorOperation)
			c.Set("apitokens-id", customClaims.APITokensID)
			c.Next()
			return
		}
		logging.LogError(nil, "Unauthorized view mode for operation")
		c.JSON(http.StatusUnauthorized, gin.H{"message": "Unauthorized"})
		c.Abort()
		return
	}
}

func RBACMiddlewareAll() gin.HandlerFunc {
	return RBACMiddleware([]string{
		database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
		database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR,
		database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR,
	})
}

func RBACMiddlewareNoSpectators() gin.HandlerFunc {
	return RBACMiddleware([]string{
		database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
		database.OPERATOR_OPERATION_VIEW_MODE_OPERATOR,
	})
}

func RBACMiddlewareOperationAdmin() gin.HandlerFunc {
	return RBACMiddleware([]string{
		database.OPERATOR_OPERATION_VIEW_MODE_LEAD,
	})
}
func RBACMiddlewareAdmin() gin.HandlerFunc {
	return RBACMiddleware([]string{})
}

type MissingScopeError struct {
	RequiredScope string
	GrantedScopes []string
	Resource      string
	Action        string
	Route         string
}

func (m MissingScopeError) Response() gin.H {
	return gin.H{
		"error":          "missing_scope",
		"message":        fmt.Sprintf("This API token does not have the required scope: %s", m.RequiredScope),
		"required_scope": m.RequiredScope,
		"granted_scopes": m.GrantedScopes,
		"resource":       m.Resource,
		"action":         m.Action,
		"route":          m.Route,
	}
}

func scopeDefinitionParts(scope string) (string, string) {
	for _, definition := range mythicjwt.ScopeDefinitions() {
		if definition.Name == scope {
			return definition.Resource, definition.Access
		}
	}
	return "", ""
}

func TokenScopeMiddleware(requiredScopes []string) gin.HandlerFunc {
	return func(c *gin.Context) {
		for _, requiredScope := range requiredScopes {
			missingScope := enforceTokenScope(c, requiredScope)
			if missingScope != nil {
				c.JSON(http.StatusForbidden, missingScope.Response())
				c.Abort()
				return
			}
		}
		c.Next()
	}
}

func enforceTokenScope(c *gin.Context, requiredScope string) *MissingScopeError {
	resource, action := scopeDefinitionParts(requiredScope)
	route := c.FullPath()
	if route == "" {
		route = c.Request.URL.Path
	}
	claims, err := GetClaims(c)
	if err != nil {
		return &MissingScopeError{
			RequiredScope: requiredScope,
			GrantedScopes: []string{},
			Resource:      resource,
			Action:        action,
			Route:         route,
		}
	}
	if !mythicjwt.AllowsScope(claims.Scopes, requiredScope) {
		return &MissingScopeError{
			RequiredScope: requiredScope,
			GrantedScopes: claims.Scopes,
			Resource:      resource,
			Action:        action,
			Route:         route,
		}
	}
	if claims.FileUUID != "" && claims.FileUUID != c.Param("file_uuid") {
		return &MissingScopeError{
			RequiredScope: requiredScope,
			GrantedScopes: claims.Scopes,
			Resource:      resource,
			Action:        action,
			Route:         route,
		}
	}
	return nil
}
