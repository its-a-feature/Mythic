package webcontroller

import (
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"strings"
	"testing"

	"github.com/gin-gonic/gin"
)

func TestUntrustedStaticContentHeaders(t *testing.T) {
	gin.SetMode(gin.TestMode)
	dir := t.TempDir()
	if err := os.WriteFile(filepath.Join(dir, "icon.svg"), []byte(`<svg xmlns="http://www.w3.org/2000/svg" onload="alert(1)"/>`), 0600); err != nil {
		t.Fatal(err)
	}
	router := gin.New()
	staticFiles := router.Group("/static")
	staticFiles.Use(UntrustedContentHeaders)
	staticFiles.Static("", dir)
	for _, method := range []string{http.MethodGet, http.MethodHead} {
		t.Run(method, func(t *testing.T) {
			response := httptest.NewRecorder()
			router.ServeHTTP(response, httptest.NewRequest(method, "/static/icon.svg", nil))
			if response.Code != http.StatusOK {
				t.Fatalf("status: %d", response.Code)
			}
			assertUntrustedHeaders(t, response)
		})
	}
}

func TestDirectViewAppliesUntrustedHeaders(t *testing.T) {
	router := gin.New()
	// Missing UUID exits before any database work, but must still set the policy.
	router.GET("/direct/view", FileDirectViewWebhook)
	response := httptest.NewRecorder()
	router.ServeHTTP(response, httptest.NewRequest(http.MethodGet, "/direct/view", nil))
	assertUntrustedHeaders(t, response)
}

func assertUntrustedHeaders(t *testing.T, response *httptest.ResponseRecorder) {
	t.Helper()
	policy := response.Header().Get("Content-Security-Policy")
	if !strings.HasPrefix(policy, "sandbox;") || !strings.Contains(policy, "default-src 'none'") || strings.Contains(policy, "allow-scripts") || strings.Contains(policy, "allow-same-origin") {
		t.Fatalf("unsafe policy: %q", policy)
	}
	if response.Header().Get("X-Content-Type-Options") != "nosniff" {
		t.Fatal("missing nosniff")
	}
}
