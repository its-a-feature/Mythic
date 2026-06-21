package rabbitmq

import (
	"testing"
	"time"
)

func TestEvaluateCredentialValidityTransitions(t *testing.T) {
	now := time.Date(2026, 6, 16, 12, 0, 0, 0, time.UTC)
	evaluation := evaluateCredentialValidity(map[string]interface{}{
		"not_before":  now.Add(time.Hour).Format(time.RFC3339),
		"expires_at":  now.Add(2 * time.Hour).Format(time.RFC3339),
		"renew_until": now.Add(3 * time.Hour).Format(time.RFC3339),
	}, now)
	if !evaluation.HasLifecycle || !evaluation.NotYetValid || evaluation.Valid {
		t.Fatalf("expected not-yet-valid lifecycle evaluation: %#v", evaluation)
	}
	if evaluation.NextTransitionAt == nil || !evaluation.NextTransitionAt.Equal(now.Add(time.Hour)) {
		t.Fatalf("unexpected next transition: %#v", evaluation.NextTransitionAt)
	}

	evaluation = evaluateCredentialValidity(map[string]interface{}{
		"expires_at": now.Add(-time.Second).Format(time.RFC3339),
	}, now)
	if !evaluation.Expired || evaluation.Valid {
		t.Fatalf("expected expired credential: %#v", evaluation)
	}

	evaluation = evaluateCredentialValidity(map[string]interface{}{
		"not_before":  now.Add(-time.Hour).Format(time.RFC3339),
		"expires_at":  now.Add(time.Hour).Format(time.RFC3339),
		"renew_until": now.Add(-time.Second).Format(time.RFC3339),
	}, now)
	if !evaluation.RenewExpired || evaluation.Valid {
		t.Fatalf("expected renew-expired credential: %#v", evaluation)
	}
}

func TestApplyCredentialValidityToMetadata(t *testing.T) {
	now := time.Date(2026, 6, 16, 12, 0, 0, 0, time.UTC)
	metadata := map[string]interface{}{
		"expires_at": now.Add(time.Hour).Format(time.RFC3339),
	}
	evaluation := applyCredentialValidityToMetadata(metadata, now)
	if !evaluation.Valid {
		t.Fatalf("expected valid lifecycle evaluation: %#v", evaluation)
	}
	validity, ok := metadata[credentialValidityMetadataKey].(map[string]interface{})
	if !ok {
		t.Fatalf("validity metadata missing: %#v", metadata)
	}
	if validity["valid"] != true || validity["expired"] != false {
		t.Fatalf("unexpected validity metadata: %#v", validity)
	}
}
