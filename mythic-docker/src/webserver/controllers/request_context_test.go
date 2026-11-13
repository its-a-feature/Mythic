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
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestAdministrativeHandlersReuseRequestCaller(t *testing.T) {
	// An authenticated non-admin must reach the handler's permission denial
	// using its cached caller. There is no database for a redundant account read.
	for _, test := range []struct {
		name, input, denied string
		handler             gin.HandlerFunc
	}{
		{name: "create invite", input: `{"input":{}}`, denied: "You are not an administrator", handler: CreateInviteLink},
		{name: "list invites", denied: "You are not an administrator", handler: GetOutstandingInviteLinks},
		{name: "update invite", input: `{"input":{"code":"fixture-code","total":2}}`, denied: "You are not an administrator", handler: UpdateInviteLink},
		{name: "create account", input: `{"input":{"input":{"username":"fixture-account","password":"fixture-password"}}}`, denied: "Only admins can create new operators", handler: CreateOperatorWebhook},
		{name: "create operation", input: `{"input":{"name":"fixture-operation"}}`, denied: "Only admins are allowed to create new operations", handler: CreateOperationWebhook},
	} {
		t.Run(test.name, func(t *testing.T) {
			response := httptest.NewRecorder()
			c, _ := gin.CreateTestContext(response)
			c.Request = httptest.NewRequest(http.MethodPost, "/fixture", strings.NewReader(test.input))
			c.Request.Header.Set("Content-Type", "application/json")
			c.Set(authentication.ContextKeyClaims, &mythicjwt.CustomClaims{UserID: 7, OperationID: 9})
			c.Set(authentication.ContextKeyRequestOwner, &databaseStructs.Operator{ID: 7, Active: true})
			test.handler(c)
			var result map[string]interface{}
			if err := json.Unmarshal(response.Body.Bytes(), &result); err != nil {
				t.Fatal(err)
			}
			if response.Code != http.StatusOK || result["status"] != "error" || result["error"] != test.denied {
				t.Fatalf("handler did not reuse the caller for authorization: %d %v", response.Code, result)
			}
		})
	}
}
