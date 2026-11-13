package authentication

import (
	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authorization"
)

// EffectiveScopeList is for API introspection only. Authorization uses GetScopesSetFromClaims;
// token grants are already concrete, and session catalog expansion is cached.
func EffectiveScopeList(c *gin.Context) ([]string, error) {
	if cached, ok := c.Get("request_effective_scopes"); ok {
		return cached.([]string), nil
	}
	claims, err := GetClaims(c)
	if err != nil {
		return nil, err
	}
	list := authorization.EffectiveScopes(claims.Scopes)
	c.Set("request_effective_scopes", list)
	return list, nil
}
