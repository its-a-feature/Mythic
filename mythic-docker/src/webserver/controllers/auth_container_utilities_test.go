package webcontroller

import "testing"

func TestValidAuthRedirectURL(t *testing.T) {
	for _, raw := range []string{"https://idp.example/login?state=a%20b#next", "http://localhost:8080/login"} {
		if !ValidAuthRedirectURL(raw) {
			t.Errorf("rejected web redirect %q", raw)
		}
	}
	for _, raw := range []string{"javascript:alert(1)", "java\nscript:alert(1)", "data:text/html,<script>alert(1)</script>", "//idp.example/login", "/login", "https:login", "https:///login", " https://idp.example", "https://idp.example\\@evil.example", "https://user:password@idp.example", "https://idp.example/\x00", ""} {
		if ValidAuthRedirectURL(raw) {
			t.Errorf("accepted unsafe redirect %q", raw)
		}
	}
}
