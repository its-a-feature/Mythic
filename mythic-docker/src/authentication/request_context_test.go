package authentication

import (
	"net/http/httptest"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestRequestAuthorizationReuse(t *testing.T) {
	c, _ := gin.CreateTestContext(httptest.NewRecorder())
	c.Request = httptest.NewRequest("GET", "/fixture", nil)
	claims := &mythicjwt.CustomClaims{UserID: 7, OperationID: 9, APITokensID: 11, Scopes: []string{"task.read"}}
	owner := &databaseStructs.Operator{ID: 7, Active: true}
	operation := &databaseStructs.Operatoroperation{OperatorID: 7, OperationID: 9, ViewMode: "operator", CurrentOperator: *owner}
	c.Set(ContextKeyClaims, claims)
	c.Set(ContextKeyRequestOwner, owner)
	c.Set(ContextKeyOperatorOperationStruct, operation)
	for i := 0; i < 3; i++ {
		cached, err := GetClaims(c)
		if err != nil || cached != claims {
			t.Fatal("claims were decoded again", err)
		}
		user, err := GetRequestUser(c)
		if err != nil || user != owner {
			t.Fatal("owner was queried again", err)
		}
		cachedOperation, err := GetRequestOperation(c)
		if err != nil || cachedOperation != operation {
			t.Fatal("operation membership was queried again", err)
		}
	}
	first, err := GetScopesSetFromClaims(c)
	if err != nil {
		t.Fatal(err)
	}
	first["fixture.cached"] = true
	second, err := GetScopesSetFromClaims(c)
	if err != nil || !second["fixture.cached"] {
		t.Fatal("scope set was rebuilt", err)
	}
	if second[" Task.Read "] {
		t.Fatal("runtime permission checks normalized an identifier")
	}
	initial := SetRabbitMQAuthContextForGin(c)
	if again := SetRabbitMQAuthContextForGin(c); again.ContextID != initial.ContextID {
		t.Fatal("RPC context was regenerated within one request")
	}
}
