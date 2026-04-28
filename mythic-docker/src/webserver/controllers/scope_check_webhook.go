package webcontroller

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
)

type ScopeCheckInput struct {
	Input ScopeCheck `json:"input" binding:"required"`
}

type ScopeCheck struct {
	Resource    string `json:"resource" binding:"required"`
	Action      string `json:"action" binding:"required"`
	OperationID int    `json:"operation_id"`
}

func ScopeCheckWebhook(c *gin.Context) {
	var input ScopeCheckInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"status": "error", "error": err.Error()})
		return
	}
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusForbidden, gin.H{"status": "error", "error": "Authentication Failed"})
		return
	}
	requiredScope := fmt.Sprintf("%s.%s",
		strings.ToLower(strings.TrimSpace(input.Input.Resource)),
		strings.ToLower(strings.TrimSpace(input.Input.Action)))
	if !mythicjwt.IsKnownScopeOrAlias(requiredScope) || strings.HasSuffix(requiredScope, ".*") || requiredScope == mythicjwt.SCOPE_ALL {
		c.JSON(http.StatusOK, gin.H{
			"status": "error",
			"error":  fmt.Sprintf("unknown scope %q", requiredScope),
		})
		return
	}

	allowedByScope := mythicjwt.AllowsScope(claims.Scopes, requiredScope)
	allowedByOperation := true
	if input.Input.OperationID > 0 {
		allowedByOperation = false
		if operations, err := database.GetOperationsForUser(claims.UserID); err == nil {
			for _, operation := range *operations {
				if operation.CurrentOperation.ID == input.Input.OperationID {
					allowedByOperation = true
					break
				}
			}
		}
	}

	allowed := allowedByScope && allowedByOperation
	reason := "allowed"
	if !allowedByScope {
		reason = "missing_scope"
	} else if !allowedByOperation {
		reason = "operation_not_available"
	}
	c.JSON(http.StatusOK, gin.H{
		"status":           "success",
		"allowed":          allowed,
		"reason":           reason,
		"required_scope":   requiredScope,
		"granted_scopes":   claims.Scopes,
		"effective_scopes": mythicjwt.EffectiveScopes(claims.Scopes),
		"resource":         input.Input.Resource,
		"action":           input.Input.Action,
		"operation_id":     input.Input.OperationID,
		"message":          scopeCheckMessage(allowed, reason, requiredScope),
	})
}

func scopeCheckMessage(allowed bool, reason string, requiredScope string) string {
	if allowed {
		return "This token has the required scope."
	}
	switch reason {
	case "missing_scope":
		return fmt.Sprintf("This token does not have the required scope: %s.", requiredScope)
	case "operation_not_available":
		return "This token's operator does not have access to the requested operation."
	default:
		return "This token is not allowed to perform the requested action."
	}
}
