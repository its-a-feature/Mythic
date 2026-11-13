package webcontroller

import (
	"bytes"
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"net/http"
	"slices"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	"github.com/its-a-feature/Mythic/logging"
)

// GetHasuraClaims checks HTTP operations before Hasura executes them, then
// supplies row/column claims. Authentication middleware caches the identity in
// this same request; native WebSockets only authenticate at connection setup.
func GetHasuraClaims(c *gin.Context) {
	input, cached := c.Get("hasura")
	if !cached {
		// ExtractToken normally decoded the envelope in the authentication
		// middleware. An Authorization header on the hook itself skips that path.
		var request authentication.HasuraRequest
		if err := c.ShouldBindJSON(&request); err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid Hasura request"})
			return
		}
		input = request
		c.Set("hasura", request)
	}
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication Failed"})
		return
	}
	if claims.FileUUID != "" {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "file credentials cannot execute GraphQL"})
		return
	}
	scopes, err := authentication.GetScopesSetFromClaims(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication Failed"})
		return
	}
	// check permissions for each table requested
	raw := bytes.TrimSpace(input.(authentication.HasuraRequest).Request)
	if len(raw) > 0 && !bytes.Equal(raw, []byte("null")) {
		// Hasura's POST hook includes the whole HTTP batch. Authorize every
		// entry before returning any claims, so no earlier mutation can execute
		// when a later entry is denied. Null/absent requests are connection auth.
		requests := []authorization.GraphQLRequest{}
		if raw[0] == '[' {
			err = json.Unmarshal(raw, &requests)
		} else {
			requests = make([]authorization.GraphQLRequest, 1)
			err = json.Unmarshal(raw, &requests[0])
		}
		if err != nil || len(requests) == 0 {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Invalid GraphQL request"})
			return
		}
		c.Set("graphql_requests", requests)
		c.Set("GraphQLName", requests[0].OperationName)
		// Share target facts across aliases and batch entries. Only the model's
		// compiled parameterized lookup can reach the database, never client SQL.
		targets := map[string]string{}
		resolve := func(lookup authorization.ValueLookup, id interface{}) (string, error) {
			key := fmt.Sprintf("%s/%v/%d", lookup.Query, id, claims.OperationID)
			if value, cachedQuery := targets[key]; cachedQuery {
				return value, nil
			}
			if len(targets) >= 128 {
				return "", fmt.Errorf("too many explicit authorization targets")
			}
			var value string
			err = database.DB.GetContext(c.Request.Context(), &value, lookup.Query, id, claims.OperationID)
			if err != nil && !errors.Is(err, sql.ErrNoRows) {
				return "", err
			}
			targets[key] = value
			return value, nil
		}
		principal := authorization.Principal{APITokenID: claims.APITokensID, OperationID: claims.OperationID, Scopes: scopes}
		for i := range requests {
			err = requests[i].Authorize(authorization.Current, principal, resolve)
			if err != nil {
				// Hasura accepts only 200/401 from its auth hook and replaces this
				// body with a generic denial. scopeCheck remains the diagnostic API.
				logging.LogDebug("Failed to authorize request", "error", err)
				c.JSON(http.StatusUnauthorized, gin.H{"error": err.Error()})
				return
			}
		}
	}
	// assuming you have all permissions, now construct the hasura claims for subsequent row-filtering
	operation, err := authentication.GetRequestOperation(c)
	if err != nil {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication Failed"})
		return
	}
	role := operation.ViewMode
	if role == "" {
		role = "spectator"
	}
	if role == "lead" {
		role = "operation_admin"
	}
	if operation.CurrentOperator.Admin {
		role = "mythic_admin"
	}
	if !slices.Contains([]string{"spectator", "operation_admin", "operator", "mythic_admin"}, role) {
		c.JSON(http.StatusUnauthorized, gin.H{"error": "invalid Hasura session role"})
		return
	}
	grantedOperationIDs := "{}"
	if claims.APITokensID > 0 {
		// apitokens are only valid for a single operation
		grantedOperationIDs = fmt.Sprintf("{%d}", claims.OperationID)
	} else {
		// Interactive sessions have validity across all their membership operations
		err = database.DB.GetContext(c.Request.Context(), &grantedOperationIDs,
			`SELECT COALESCE(array_agg(id ORDER BY id),ARRAY[]::integer[])::text FROM operation`)
		if err != nil {
			c.JSON(http.StatusUnauthorized, gin.H{"error": "Authentication Failed"})
			return
		}
	}
	values := map[string]string{
		"x-hasura-user-id":              fmt.Sprint(claims.UserID),
		"x-hasura-current-operation-id": fmt.Sprint(claims.OperationID),
		"x-hasura-current_operation":    operation.CurrentOperation.Name,
		"x-hasura-apitokens-id":         fmt.Sprint(claims.APITokensID),
		"x-hasura-role":                 role,
	}
	permissions := map[string]bool{}
	for _, definition := range authorization.ScopeDefinitions() {
		permissions[definition.Name] = true
	}
	// Include model field declarations in the session claims as well.
	for _, table := range authorization.Current.Tables {
		for _, rule := range table.Policy.FieldReads {
			permissions[rule.Permission] = true
		}
	}
	grantedActorIDs := fmt.Sprintf("{%d}", claims.UserID)
	for permission := range permissions {
		operationIDs, actorIDs := "{}", "{}"
		if scopes[authorization.SCOPE_ALL] || scopes[permission] {
			operationIDs = grantedOperationIDs
			actorIDs = grantedActorIDs
		}
		values[authorization.ClaimName(permission, true)] = operationIDs
		values[authorization.ClaimName(permission, false)] = actorIDs
	}
	// WebSockets retain these connection-time claims until they disconnect.
	c.JSON(http.StatusOK, values)
	//logging.LogDebug("hasura claims", "value", values)
}
