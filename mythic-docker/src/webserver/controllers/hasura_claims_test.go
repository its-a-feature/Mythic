package webcontroller

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/authorization"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestHasuraClaimsPreflight(t *testing.T) {
	for _, test := range []struct {
		name, request, missing string
		status                 int
	}{
		{name: "allowed query", request: `{"query":"query ReadCredentials{credential{account}}","operationName":"ReadCredentials"}`, status: http.StatusOK},
		{name: "missing permission", request: `{"query":"{task{id}}"}`, missing: "task.read", status: http.StatusUnauthorized},
		{name: "allowed batch", request: `[{"query":"{credential{account}}"},{"query":"{credential{operation_id}}"}]`, status: http.StatusOK},
		{name: "denied batch", request: `[{"query":"{credential{account}}"},{"query":"{task{id}}"}]`, missing: "task.read", status: http.StatusUnauthorized},
		{name: "empty batch", request: `[]`, status: http.StatusUnauthorized},
		{name: "invalid request shape", request: `42`, status: http.StatusUnauthorized},
		{name: "websocket connection", request: `null`, status: http.StatusOK},
		{name: "permission introspection needs no resource scope", request: `{"query":"{scopeCheck(resource:\"task\",action:\"read\"){allowed reason}}"}`, status: http.StatusOK},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(response)
			c.Request = httptest.NewRequest(http.MethodPost, "/graphql/webhook", strings.NewReader(`{"headers":{"authorization":"Bearer original-credential"},"request":`+test.request+`}`))
			c.Request.Header.Set("Content-Type", "application/json")
			// Authentication and membership are already cached by middleware.
			// No database is configured, so accidental re-fetches fail this test.
			claims := &mythicjwt.CustomClaims{UserID: 7, OperationID: 9, APITokensID: 11, Scopes: []string{"credential.read"}}
			c.Set(authentication.ContextKeyClaims, claims)
			c.Set(authentication.ContextKeyOperatorOperationStruct, &databaseStructs.Operatoroperation{ViewMode: "operator"})
			GetHasuraClaims(c)
			if response.Code != test.status {
				t.Fatalf("unexpected status %d: %s", response.Code, response.Body)
			}
			var result map[string]string
			if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if test.missing != "" && !strings.Contains(result["error"], test.missing) {
				t.Fatalf("hook did not identify the denied scope for its logs: %v", result)
			}
			if test.status == http.StatusOK && (result["x-hasura-role"] != "operator" || result["x-hasura-user-id"] != "7" || result[authorization.ClaimName("credential.read", true)] != "{9}" || result[authorization.ClaimName("task.read", true)] != "{}") {
				t.Fatalf("unexpected session variables: %v", result)
			}
			if test.status != http.StatusOK && result["x-hasura-role"] != "" {
				t.Fatal("denied request received session claims")
			}
		})
	}
}
