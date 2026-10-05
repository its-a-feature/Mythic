package rabbitmq

import (
	"crypto/sha256"
	"encoding/hex"
	"testing"
	"time"

	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	amqp "github.com/rabbitmq/amqp091-go"
)

func TestContainerAuthenticationRejectsMissingAndForgedIdentity(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	masterSecret := "deployment-secret"
	body := []byte(`{"payload_type":{"name":"alpha"}}`)
	policy := RabbitMQRPCPolicy{
		Authentication: RabbitMQAuthenticationContainer,
		ContainerIdentity: func(body []byte) (string, error) {
			return "alpha", nil
		},
	}
	now := time.Unix(1_800_000_000, 0).UTC()

	unsigned := amqp.Delivery{UserId: "mythic_user", Body: body}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("pt_sync", policy, unsigned, masterSecret, now); err == nil {
		t.Fatal("protected container route accepted an unsigned request")
	}

	message := signedContainerDelivery(t, masterSecret, "alpha", "pt_sync", body, now, "nonce-alpha")
	ctx, err := authorizeRabbitMQRPCRequestWithPolicy("pt_sync", policy, message, masterSecret, now)
	if err != nil {
		t.Fatalf("valid container request rejected: %v", err)
	}
	if ctx.ContainerPrincipal != "alpha" {
		t.Fatalf("principal = %q, want alpha", ctx.ContainerPrincipal)
	}

	resetRabbitMQContainerNoncesForTest()
	forged := signedContainerDelivery(t, masterSecret, "attacker", "pt_sync", body, now, "nonce-forged")
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("pt_sync", policy, forged, masterSecret, now); err == nil {
		t.Fatal("container attacker was allowed to sync alpha")
	}
}

func TestContainerSecretDerivationProtocolVector(t *testing.T) {
	got := hex.EncodeToString(DeriveRabbitMQContainerSecret("deployment-secret", "alpha"))
	want := "038bbf5284523f2c1824b1da5f64fee15a31d5e3846dad29e3a9f31f723db138"
	if got != want {
		t.Fatalf("derived secret = %s, want %s", got, want)
	}
}

func TestContainerAuthenticationBindsRouteBodyFreshnessAndNonce(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	masterSecret := "deployment-secret"
	body := []byte(`{"c2_profile":{"name":"alpha"}}`)
	policy := RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainer,
		ContainerIdentity: func(body []byte) (string, error) { return "alpha", nil },
	}
	now := time.Unix(1_800_000_000, 0).UTC()
	message := signedContainerDelivery(t, masterSecret, "alpha", "c2_sync", body, now, "one-time")

	modified := message
	modified.Body = []byte(`{"c2_profile":{"name":"victim"}}`)
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("c2_sync", policy, modified, masterSecret, now); err == nil {
		t.Fatal("signature accepted after body modification")
	}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("other_route", policy, message, masterSecret, now); err == nil {
		t.Fatal("signature accepted on a different route")
	}
	stale := signedContainerDelivery(t, masterSecret, "alpha", "c2_sync", body, now.Add(-10*time.Minute), "stale")
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("c2_sync", policy, stale, masterSecret, now); err == nil {
		t.Fatal("stale signature accepted")
	}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("c2_sync", policy, message, masterSecret, now); err != nil {
		t.Fatalf("first use of nonce rejected: %v", err)
	}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("c2_sync", policy, message, masterSecret, now); err == nil {
		t.Fatal("replayed nonce accepted")
	}
}

func TestContainerAuthenticationUsesDeliveryRoutingKeyInsteadOfPolicyQueue(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	now := time.Unix(1_800_000_000, 0).UTC()
	policy := RabbitMQRPCPolicy{Authentication: RabbitMQAuthenticationContainer}
	message := signedContainerDelivery(t, "secret", "alpha", "c2_sync", []byte(`{}`), now, "queue-route-split")
	message.RoutingKey = "c2_sync"

	if _, err := authorizeRabbitMQRPCRequestWithPolicy("mythic_consume_c2_sync", policy, message, "secret", now); err != nil {
		t.Fatalf("valid signature over delivery routing key was rejected: %v", err)
	}
}

func TestAuthenticationModeDoesNotTreatEmptyScopesAsPublic(t *testing.T) {
	policy := RabbitMQRPCPolicy{Authentication: RabbitMQAuthenticationContainerAuthContext}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("empty_scopes", policy, amqp.Delivery{}, "secret", time.Now()); err == nil {
		t.Fatal("authenticated route with no capability-specific scopes accepted no context")
	}
	if err := validateRabbitMQRPCPolicy("missing", RabbitMQRPCPolicy{}); err == nil {
		t.Fatal("route without an explicit authentication mode passed registration validation")
	}
	if err := validateRabbitMQRPCPolicy("invalid-container-scopes", RabbitMQRPCPolicy{
		Authentication: RabbitMQAuthenticationContainer,
		RequiredScopes: []string{mythicjwt.SCOPE_TASK_READ},
	}); err == nil {
		t.Fatal("container-only route accepted auth-context scopes")
	}
}

func TestExplicitPublicRouteRemainsCallable(t *testing.T) {
	policy := RabbitMQRPCPolicy{Authentication: RabbitMQAuthenticationPublic}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("public", policy, amqp.Delivery{}, "", time.Now()); err != nil {
		t.Fatalf("explicit public route rejected: %v", err)
	}
	if err := validateRabbitMQRPCPolicy("invalid-public", RabbitMQRPCPolicy{
		Authentication: RabbitMQAuthenticationPublic,
		RequiredScopes: []string{mythicjwt.SCOPE_TASK_READ},
	}); err == nil {
		t.Fatal("public route accepted an authorization requirement")
	}
}

func TestContainerAuthContextRequiresAndBindsContainerSignature(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	now := time.Unix(1_800_000_000, 0).UTC()
	policy := RabbitMQRPCPolicy{Authentication: RabbitMQAuthenticationContainerAuthContext}
	token, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{OperationID: 7})
	if err != nil {
		t.Fatal(err)
	}
	defer InvalidateRabbitMQAuthContextToken(token)

	unsigned := amqp.Delivery{Headers: amqp.Table{MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER: token}}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("rpc", policy, unsigned, "secret", now); err == nil {
		t.Fatal("valid auth context was accepted without a container signature")
	}

	signed := signedContainerDelivery(t, "secret", "alpha", "rpc", []byte(`{}`), now, "context-alpha")
	signed.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = token
	context, err := authorizeRabbitMQRPCRequestWithPolicy("rpc", policy, signed, "secret", now)
	if err != nil {
		t.Fatalf("signed container auth context rejected: %v", err)
	}
	if context.ContainerPrincipal != "alpha" || context.OperationID != 7 {
		t.Fatalf("context was not bound to alpha: %#v", context)
	}
	resetRabbitMQContainerNoncesForTest()
	bravo := signedContainerDelivery(t, "secret", "bravo", "rpc", []byte(`{}`), now, "context-bravo")
	bravo.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = token
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("rpc", policy, bravo, "secret", now); err == nil {
		t.Fatal("auth context bound on first use was reused by bravo")
	}

	boundToken, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{OperationID: 7, ContainerPrincipal: "bravo"})
	if err != nil {
		t.Fatal(err)
	}
	defer InvalidateRabbitMQAuthContextToken(boundToken)
	resetRabbitMQContainerNoncesForTest()
	signed.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = boundToken
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("rpc", policy, signed, "secret", now); err == nil {
		t.Fatal("alpha used an auth context bound to bravo")
	}
}

func TestContainerOperationRequiresOperationContext(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	now := time.Unix(1_800_000_000, 0).UTC()
	policy := RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainerOperation,
		ContainerIdentity: func([]byte) (string, error) { return "alpha", nil },
	}
	message := signedContainerDelivery(t, "secret", "alpha", "storage", []byte(`{}`), now, "storage-no-op")
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("storage", policy, message, "secret", now); err == nil {
		t.Fatal("agentstorage request without an operation context was accepted")
	}

	token, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{OperationID: 7, ContainerPrincipal: "alpha"})
	if err != nil {
		t.Fatal(err)
	}
	defer InvalidateRabbitMQAuthContextToken(token)
	message.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = token
	resetRabbitMQContainerNoncesForTest()
	ctx, err := authorizeRabbitMQRPCRequestWithPolicy("storage", policy, message, "secret", now)
	if err != nil {
		t.Fatalf("valid operation-scoped container request rejected: %v", err)
	}
	if ctx.OperationID != 7 || ctx.ContainerPrincipal != "alpha" {
		t.Fatalf("context = %#v, want operation 7 and alpha", ctx)
	}
}

func TestContainerOperationRejectsContextStolenFromAnotherContainer(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	now := time.Unix(1_800_000_000, 0).UTC()
	policy := RabbitMQRPCPolicy{Authentication: RabbitMQAuthenticationContainerOperation}
	token, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{
		OperationID: 7, ContainerPrincipal: "bravo",
	})
	if err != nil {
		t.Fatal(err)
	}
	defer InvalidateRabbitMQAuthContextToken(token)
	message := signedContainerDelivery(t, "secret", "alpha", "storage", []byte(`{}`), now, "stolen-context")
	message.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = token
	if _, err := authorizeRabbitMQRPCRequestWithPolicy("storage", policy, message, "secret", now); err == nil {
		t.Fatal("alpha combined its signature with bravo's operation context")
	}
}

func TestCommandSearchIsBoundToAuthenticatedPayloadType(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	now := time.Unix(1_800_000_000, 0).UTC()
	policy := RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainer,
		ContainerIdentity: extractCommandSearchIdentity,
	}
	body := []byte(`{"payload_type_name":"bravo"}`)
	message := signedContainerDelivery(t, "secret", "alpha", MYTHIC_RPC_COMMAND_SEARCH, body, now, "command-search")
	if _, err := authorizeRabbitMQRPCRequestWithPolicy(MYTHIC_RPC_COMMAND_SEARCH, policy, message, "secret", now); err == nil {
		t.Fatal("alpha searched bravo command metadata")
	}
}

func TestEveryRegisteredRabbitMQRouteHasExplicitPolicy(t *testing.T) {
	for _, queue := range RabbitMQConnection.RPCQueues {
		if queue.Authentication == "" {
			t.Errorf("RPC queue %s has no explicit authentication mode", queue.Queue)
		}
		if queue.Authentication == RabbitMQAuthenticationPublic {
			t.Errorf("RPC queue %s is unexpectedly public; add an explicit reviewed allowlist before exposing it", queue.Queue)
		}
		if err := validateRabbitMQRPCPolicy(queue.Queue, RabbitMQRPCPolicy{
			Authentication:    queue.Authentication,
			RequiredScopes:    queue.Scopes,
			ContainerIdentity: queue.ContainerIdentity,
		}); err != nil {
			t.Errorf("RPC queue %s has invalid policy: %v", queue.Queue, err)
		}
	}
	for _, queue := range RabbitMQConnection.DirectQueues {
		if queue.Authentication == "" {
			t.Errorf("direct queue %s has no explicit authentication mode", queue.Queue)
		}
		if queue.Authentication == RabbitMQAuthenticationPublic {
			t.Errorf("direct queue %s is unexpectedly public; add an explicit reviewed allowlist before exposing it", queue.Queue)
		}
		if err := validateRabbitMQRPCPolicy(queue.Queue, RabbitMQRPCPolicy{
			Authentication:    queue.Authentication,
			RequiredScopes:    queue.Scopes,
			ContainerIdentity: queue.ContainerIdentity,
		}); err != nil {
			t.Errorf("direct queue %s has invalid policy: %v", queue.Queue, err)
		}
	}
}

func TestSyncIdentityExtractors(t *testing.T) {
	tests := []struct {
		name      string
		extractor RabbitMQContainerIdentityExtractor
		body      string
		want      string
	}{
		{"payload", extractPayloadTypeSyncIdentity, `{"payload_type":{"name":"alpha"}}`, "alpha"},
		{"c2", extractC2SyncIdentity, `{"c2_profile":{"name":"alpha"}}`, "alpha"},
		{"consuming", extractConsumingContainerSyncIdentity, `{"consuming_container":{"name":"alpha"}}`, "alpha"},
		{"translation", extractTranslationContainerSyncIdentity, `{"name":"alpha"}`, "alpha"},
		{"custom browser", extractCustomBrowserSyncIdentity, `{"custombrowser":{"name":"alpha"}}`, "alpha"},
		{"on start", extractContainerOnStartResponseIdentity, `{"container_name":"alpha"}`, "alpha"},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			got, err := test.extractor([]byte(test.body))
			if err != nil || got != test.want {
				t.Fatalf("identity = %q, err = %v", got, err)
			}
		})
	}
}

func signedContainerDelivery(t *testing.T, masterSecret, principal, route string, body []byte, timestamp time.Time, nonce string) amqp.Delivery {
	t.Helper()
	nonceSeed := sha256.Sum256([]byte(nonce))
	nonce = hex.EncodeToString(nonceSeed[:24])
	bodyHash := sha256.Sum256(body)
	signature := SignRabbitMQContainerRequest(
		DeriveRabbitMQContainerSecret(masterSecret, principal),
		principal,
		route,
		timestamp.Unix(),
		nonce,
		hex.EncodeToString(bodyHash[:]),
	)
	return amqp.Delivery{
		UserId: principal,
		Body:   body,
		Headers: amqp.Table{
			MYTHIC_RABBITMQ_CONTAINER_PRINCIPAL_HEADER: principal,
			MYTHIC_RABBITMQ_CONTAINER_TIMESTAMP_HEADER: timestamp.Unix(),
			MYTHIC_RABBITMQ_CONTAINER_NONCE_HEADER:     nonce,
			MYTHIC_RABBITMQ_CONTAINER_SIGNATURE_HEADER: signature,
		},
	}
}

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
