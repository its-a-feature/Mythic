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

func TestHostedFileAuthContextTokenIndexInvalidation(t *testing.T) {
	rowID := 4242
	firstToken, err := RegisterHostedFileAuthContextToken(rowID, RabbitMQAuthContext{
		OperationID:  1,
		OperatorID:   2,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     "file-one",
	})
	if err != nil {
		t.Fatalf("failed to register first hosted file auth context token: %v", err)
	}
	if _, err := ValidateRabbitMQAuthContextToken(firstToken); err != nil {
		t.Fatalf("first hosted token should be valid: %v", err)
	}

	secondToken, err := RegisterHostedFileAuthContextToken(rowID, RabbitMQAuthContext{
		OperationID:  1,
		OperatorID:   2,
		SourceScopes: []string{mythicjwt.SCOPE_FILE_READ},
		FileUUID:     "file-two",
	})
	if err != nil {
		t.Fatalf("failed to register second hosted file auth context token: %v", err)
	}
	if _, err := ValidateRabbitMQAuthContextToken(firstToken); err == nil {
		t.Fatal("replacing row token should invalidate previous token")
	}
	secondContext, err := ValidateRabbitMQAuthContextToken(secondToken)
	if err != nil {
		t.Fatalf("second hosted token should be valid: %v", err)
	}
	if secondContext.FileUUID != "file-two" {
		t.Fatalf("second hosted token context FileUUID = %q, want file-two", secondContext.FileUUID)
	}

	InvalidateHostedFileAuthContextToken(rowID)
	if _, err := ValidateRabbitMQAuthContextToken(secondToken); err == nil {
		t.Fatal("row invalidation should invalidate current hosted token")
	}
}
