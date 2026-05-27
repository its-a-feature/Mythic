package rabbitmq

import (
	"testing"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
)

func TestValidateRabbitMQAuthContextResponseToken(t *testing.T) {
	if err := ValidateRabbitMQAuthContextResponseToken("", ""); err != nil {
		t.Fatalf("empty request and response token should be valid: %v", err)
	}

	authToken, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{
		OperationID:  1,
		SourceScopes: []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
	})
	if err != nil {
		t.Fatalf("failed to generate auth context token: %v", err)
	}
	defer InvalidateRabbitMQAuthContextToken(authToken)

	if err := ValidateRabbitMQAuthContextResponseToken(authToken, authToken); err != nil {
		t.Fatalf("matching valid token should be accepted: %v", err)
	}
	if err := ValidateRabbitMQAuthContextResponseToken(authToken, ""); err == nil {
		t.Fatal("missing response token should be rejected")
	}
	if err := ValidateRabbitMQAuthContextResponseToken(authToken, "mctx_other"); err == nil {
		t.Fatal("mismatched response token should be rejected")
	}
	if err := ValidateRabbitMQAuthContextResponseToken("", authToken); err == nil {
		t.Fatal("unexpected response token should be rejected")
	}

	InvalidateRabbitMQAuthContextToken(authToken)
	if err := ValidateRabbitMQAuthContextResponseToken(authToken, authToken); err == nil {
		t.Fatal("invalidated response token should be rejected")
	}
}
