package rabbitmq

import (
	"database/sql"
	"regexp"
	"testing"
	"time"

	"github.com/DATA-DOG/go-sqlmock"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
)

func TestPayloadTypeCannotRespondForAnotherPayloadTypeTask(t *testing.T) {
	mock := installAgentstorageMock(t)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT command_payload_type")).
		WithArgs(42).
		WillReturnRows(sqlmock.NewRows([]string{"command_payload_type"}).AddRow("bravo"))

	resetRabbitMQContainerNoncesForTest()
	now := time.Now().UTC()
	body := []byte(`{"task_id":42,"success":true}`)
	token, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{
		OperationID: 7, ContainerPrincipal: "alpha", SourceScopes: []string{mythicjwt.SCOPE_TASK_WRITE},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer InvalidateRabbitMQAuthContextToken(token)
	message := signedContainerDelivery(t, "secret", "alpha", PT_TASK_CREATE_TASKING_RESPONSE, body, now, "alpha-for-bravo-task")
	message.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = token
	policy := RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainerAuthContext,
		RequiredScopes:    []string{mythicjwt.SCOPE_TASK_WRITE},
		ContainerIdentity: extractTaskResponseIdentity,
	}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy(PT_TASK_CREATE_TASKING_RESPONSE, policy, message, "secret", now); err == nil {
		t.Fatal("alpha was allowed to submit a response for bravo's task")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestPayloadTypeCannotReturnAnotherPayloadTypeBuild(t *testing.T) {
	mock := installAgentstorageMock(t)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT payloadtype.name")).
		WithArgs("payload-uuid").
		WillReturnRows(sqlmock.NewRows([]string{"name"}).AddRow("bravo"))

	resetRabbitMQContainerNoncesForTest()
	now := time.Now().UTC()
	body := []byte(`{"uuid":"payload-uuid","success":true}`)
	token, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{
		OperationID: 7, ContainerPrincipal: "alpha", SourceScopes: []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
	})
	if err != nil {
		t.Fatal(err)
	}
	defer InvalidateRabbitMQAuthContextToken(token)
	message := signedContainerDelivery(t, "secret", "alpha", PT_BUILD_RESPONSE_ROUTING_KEY, body, now, "alpha-for-bravo-build")
	message.Headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER] = token
	policy := RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainerAuthContext,
		RequiredScopes:    []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
		ContainerIdentity: extractPayloadBuildResponseIdentity,
	}
	if _, err := authorizeRabbitMQRPCRequestWithPolicy(PT_BUILD_RESPONSE_ROUTING_KEY, policy, message, "secret", now); err == nil {
		t.Fatal("alpha was allowed to return bravo's payload build")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestPayloadTypeCannotCompleteTaskWithAnotherPayloadTypeParent(t *testing.T) {
	mock := installAgentstorageMock(t)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT parent.command_payload_type")).
		WithArgs(42, 84).
		WillReturnError(sql.ErrNoRows)

	if _, err := extractTaskCompletionResponseIdentity([]byte(`{"task_id":42,"parent_task_id":84}`)); err == nil {
		t.Fatal("completion response mixed task ownership across payload types")
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestTaskResponseIdentityUsesCommandDispatchPayloadType(t *testing.T) {
	mock := installAgentstorageMock(t)
	mock.ExpectQuery(regexp.QuoteMeta("SELECT command_payload_type")).
		WithArgs(42).
		WillReturnRows(sqlmock.NewRows([]string{"command_payload_type"}).AddRow("command-augment"))

	identity, err := extractTaskResponseIdentity([]byte(`{"task_id":42}`))
	if err != nil || identity != "command-augment" {
		t.Fatalf("dispatch identity = %q, err = %v", identity, err)
	}
	if err := mock.ExpectationsWereMet(); err != nil {
		t.Fatal(err)
	}
}

func TestC2StatusUsesSignedC2IdentityWithoutOperationContext(t *testing.T) {
	resetRabbitMQContainerNoncesForTest()
	now := time.Now().UTC()
	body := []byte(`{"c2_profile":"alpha","server_running":true}`)
	policy := RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainer,
		ContainerIdentity: extractC2StatusIdentity,
	}
	message := signedContainerDelivery(t, "secret", "alpha", MYTHIC_RPC_C2_UPDATE_STATUS, body, now, "c2-status-alpha")
	if _, err := authorizeRabbitMQRPCRequestWithPolicy(MYTHIC_RPC_C2_UPDATE_STATUS, policy, message, "secret", now); err != nil {
		t.Fatalf("identity-bound C2 status was rejected without an operation context: %v", err)
	}
	resetRabbitMQContainerNoncesForTest()
	forged := signedContainerDelivery(t, "secret", "bravo", MYTHIC_RPC_C2_UPDATE_STATUS, body, now, "c2-status-bravo")
	if _, err := authorizeRabbitMQRPCRequestWithPolicy(MYTHIC_RPC_C2_UPDATE_STATUS, policy, forged, "secret", now); err == nil {
		t.Fatal("bravo was allowed to update alpha's C2 status")
	}
}

func TestRabbitMQAuthContextsExpire(t *testing.T) {
	token, err := GenerateRabbitMQAuthContextToken(RabbitMQAuthContext{OperationID: 7})
	if err != nil {
		t.Fatal(err)
	}
	rabbitMQAuthContextMutex.Lock()
	entry := rabbitMQAuthContextStore[token]
	entry.Expires = time.Now().UTC().Add(-time.Second)
	rabbitMQAuthContextStore[token] = entry
	rabbitMQAuthContextMutex.Unlock()

	if _, err := ValidateRabbitMQAuthContextToken(token); err == nil {
		t.Fatal("expired RabbitMQ auth context was accepted")
	}
	rabbitMQAuthContextMutex.RLock()
	_, exists := rabbitMQAuthContextStore[token]
	rabbitMQAuthContextMutex.RUnlock()
	if exists {
		t.Fatal("expired RabbitMQ auth context was not removed")
	}
}

func TestAuthContextIdentityExtractorIsValidPolicy(t *testing.T) {
	if err := validateRabbitMQRPCPolicy("response", RabbitMQRPCPolicy{
		Authentication:    RabbitMQAuthenticationContainerAuthContext,
		ContainerIdentity: func([]byte) (string, error) { return "alpha", nil },
	}); err != nil {
		t.Fatalf("target-bound auth-context policy rejected: %v", err)
	}
}

func TestContainerCapabilitiesRefreshBeforeAuthContextExpiry(t *testing.T) {
	now := time.Now().UTC()
	containerOnStartLock.Lock()
	previousScan := containerCapabilityLastScan
	previousIssued := containerOperationCapabilityLastIssued
	containerCapabilityLastScan = map[string]time.Time{"alpha": now}
	containerOperationCapabilityLastIssued = map[string]time.Time{
		containerOperationCapabilityKey("alpha", 7): now,
	}
	containerOnStartLock.Unlock()
	t.Cleanup(func() {
		containerOnStartLock.Lock()
		containerCapabilityLastScan = previousScan
		containerOperationCapabilityLastIssued = previousIssued
		containerOnStartLock.Unlock()
	})

	if containerOperationCapabilityNeedsRefresh("alpha", 7, now.Add(containerCapabilityRefreshInterval-time.Second)) {
		t.Fatal("container capability refreshed before its renewal window")
	}
	if !containerOperationCapabilityNeedsRefresh("alpha", 7, now.Add(containerCapabilityRefreshInterval)) {
		t.Fatal("container capability was not renewed before the auth context expires")
	}
	if !containerOperationCapabilityNeedsRefresh("alpha", 8, now) {
		t.Fatal("new operation did not request its initial capability")
	}
	if !containerCapabilityNeedsScan("bravo", now) {
		t.Fatal("new container did not request its initial capability")
	}
}
