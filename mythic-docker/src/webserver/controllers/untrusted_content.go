package webcontroller

import "github.com/gin-gonic/gin"

// UntrustedContentHeaders keeps uploaded documents and service icons inert,
// even when opened directly as a top-level document on the application origin.
func UntrustedContentHeaders(c *gin.Context) {
	c.Header("Content-Security-Policy", "sandbox; default-src 'none'; img-src data:; style-src 'unsafe-inline'; base-uri 'none'; form-action 'none'")
	c.Header("X-Content-Type-Options", "nosniff")
}
