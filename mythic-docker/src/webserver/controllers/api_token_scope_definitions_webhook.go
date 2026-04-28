package webcontroller

import (
	"net/http"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
)

type APITokenScopeDefinitionOutput struct {
	Status             string                      `json:"status"`
	Error              string                      `json:"error"`
	Scopes             []mythicjwt.ScopeDefinition `json:"scopes"`
	GrantableWildcards []string                    `json:"grantable_wildcards"`
}

func APITokenScopeDefinitionsWebhook(c *gin.Context) {
	claims, err := authentication.GetClaims(c)
	if err != nil {
		c.JSON(http.StatusForbidden, APITokenScopeDefinitionOutput{
			Status: "error",
			Error:  "Authentication Failed",
		})
		return
	}
	c.JSON(http.StatusOK, APITokenScopeDefinitionOutput{
		Status:             "success",
		Scopes:             mythicjwt.GrantableScopeDefinitions(claims.Scopes),
		GrantableWildcards: mythicjwt.GrantableWildcardScopes(claims.Scopes),
	})
}
