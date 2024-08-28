package webcontroller

import (
	"errors"
	"fmt"
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
	"net/http"
	"strings"
	"sync"
)

var (
	hasuraClaimsCache     = make(map[int]map[string]interface{})
	hasuraClaimsCacheLock = sync.RWMutex{}
)

func UpdateHasuraClaims(c *gin.Context, invalidateAllOthers bool) error {
	if invalidateAllOthers {
		hasuraClaimsCacheLock.Lock()
		hasuraClaimsCache = make(map[int]map[string]interface{})
		hasuraClaimsCacheLock.Unlock()
		return nil
	}
	input, ok := c.Get("hasura")
	if !ok {
		return errors.New("no hasura claims found")
	}
	hasuraInput := input.(authentication.HasuraRequest)
	claims, err := authentication.GetClaims(c)
	if err != nil {
		return err
	}
	c.Set("GraphQLName", hasuraInput.Request.OperationName)
	c.Set("user_id", claims.UserID)
	c.Set("hasura_claims", claims)
	hasuraClaims := make(map[string]interface{})
	//logging.LogTrace("JWT claims", "claims", claims, "user", claims.UserID)
	hasuraClaims["x-hasura-user-id"] = fmt.Sprintf("%d", claims.UserID)
	hasuraOperations := []string{}
	hasuraAdminOperations := []string{}
	user, err := database.GetUserFromID(claims.UserID)
	//logging.LogTrace("user info", "user", user)
	if err != nil {
		logging.LogError(err, "Failed to fetch operator based on JWT UserID")
		return err
	}
	c.Set("username", user.Username)
	if !user.CurrentOperationID.Valid {
		hasuraClaims["x-hasura-current-operation-id"] = "0"
		hasuraClaims["x-hasura-current_operation"] = "null"
		hasuraClaims["x-hasura-role"] = "spectator"
	}
	if claims.APITokensID > 0 {
		hasuraClaims["x-hasura-apitokens-id"] = fmt.Sprintf("%d", claims.APITokensID)
	} else {
		hasuraClaims["x-hasura-apitokens-id"] = "0"
	}

	allOperations, err := database.GetOperationsForUser(claims.UserID)
	if err != nil {
		logging.LogError(err, "Failed to get all operations for user when generating hasura claims")
		return err
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

	// short circuit and always provide spectator role in this case
	if claims.AuthMethod == mythicjwt.AUTH_METHOD_GRAPHQL_SPECTATOR {
		hasuraClaims["x-hasura-role"] = "spectator"
		hasuraClaims["x-hasura-current-operation-id"] = fmt.Sprintf("%d", claims.OperationID)
	}
	hasuraClaimsCacheLock.Lock()
	hasuraClaimsCache[claims.UserID] = hasuraClaims
	hasuraClaimsCacheLock.Unlock()
	return nil
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
	//logging.LogDebug("hasura webhook info", "headers", c.Request.Header)
	input, ok := c.Get("hasura")
	if !ok {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No hasura found"})
		return
	}
	hasuraInput := input.(authentication.HasuraRequest)
	//logging.LogInfo("hasura information", "hasuraRequest", hasuraInput)
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	c.Set("GraphQLName", hasuraInput.Request.OperationName)
	c.Set("user_id", claims.UserID)
	c.Set("hasura_claims", claims)
	hasuraClaimsCacheLock.RLock()
	hasuraClaims, ok := hasuraClaimsCache[claims.UserID]
	hasuraClaimsCacheLock.RUnlock()
	if ok {
		c.JSON(http.StatusOK, hasuraClaims)
		return
	}
	err = UpdateHasuraClaims(c, false)
	if err != nil {
		logging.LogError(err, "failed to update hasura claims")
		c.JSON(http.StatusForbidden, gin.H{"error": "Authentication Failed"})
		return
	}
	hasuraClaimsCacheLock.RLock()
	hasuraClaims, ok = hasuraClaimsCache[claims.UserID]
	hasuraClaimsCacheLock.RUnlock()
	if ok {
		c.JSON(http.StatusOK, hasuraClaims)
		return
	}
	// we successfully updated but for some reason the userID still isn't in our dictionary
	logging.LogError(err, "failed to update hasura claims")
	c.JSON(http.StatusForbidden, gin.H{"error": "Missing Hasura Claims"})
	return
}
