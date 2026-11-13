package authentication

import (
	"database/sql"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

// GetRequestUser reuses the owner loaded during authentication. The selected
// operation on this in-memory copy is the credential's operation, never an
// instruction to update the owner's globally selected operation.
func GetRequestUser(c *gin.Context) (*databaseStructs.Operator, error) {
	if cached, ok := c.Get(ContextKeyRequestOwner); ok {
		return cached.(*databaseStructs.Operator), nil
	}
	claims, err := GetClaims(c)
	if err != nil {
		return nil, err
	}
	// GetClaims loads and caches the owner for API tokens and interactive JWTs.
	// Recheck that cache before a fallback read for direct file credentials.
	if cached, ok := c.Get(ContextKeyRequestOwner); ok {
		return cached.(*databaseStructs.Operator), nil
	}
	owner, err := database.GetUserFromID(claims.UserID)
	if err != nil {
		return nil, err
	}
	if claims.APITokensID > 0 {
		owner.CurrentOperationID = sql.NullInt64{Int64: int64(claims.OperationID), Valid: claims.OperationID > 0}
	}
	c.Set(ContextKeyRequestOwner, owner)
	c.Set(ContextKeyUserID, claims.UserID)
	c.Set(ContextKeyUsername, owner.Username)
	return owner, nil
}

// GetRequestOperation adds request caching to the shared database lookup. The
// identity is already cached by authentication, and token claims select its
// bound operation independently of the owner's interactive selection.
func GetRequestOperation(c *gin.Context) (*databaseStructs.Operatoroperation, error) {
	if cached, ok := c.Get(ContextKeyOperatorOperationStruct); ok {
		return cached.(*databaseStructs.Operatoroperation), nil
	}
	owner, err := GetRequestUser(c)
	if err != nil {
		return nil, err
	}
	claims, err := GetClaims(c)
	if err != nil {
		return nil, err
	}
	result, err := database.GetUserOperation(owner, claims.OperationID)
	if err != nil {
		return nil, err
	}
	c.Set(ContextKeyOperatorOperationStruct, result)
	return result, nil
}

// GetScopesSetFromClaims is built once per request; no trimming, lowercasing, wildcard
// expansion, or catalog traversal belongs in repeated permission checks.
func GetScopesSetFromClaims(c *gin.Context) (map[string]bool, error) {
	if cached, ok := c.Get(ContextKeyGetScopesSetFromClaims); ok {
		return cached.(map[string]bool), nil
	}
	claims, err := GetClaims(c)
	if err != nil {
		return nil, err
	}
	scopes := map[string]bool{}
	for _, scope := range claims.Scopes {
		scopes[scope] = true
	}
	c.Set(ContextKeyGetScopesSetFromClaims, scopes)
	return scopes, nil
}
