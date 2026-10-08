package rabbitmq

import (
	"container/heap"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/utils"
	amqp "github.com/rabbitmq/amqp091-go"
)

const rabbitMQAuthContextTokenPrefix = "mctx_"

const (
	MYTHIC_RABBITMQ_CONTAINER_PRINCIPAL_HEADER = "mythic-container-principal"
	MYTHIC_RABBITMQ_CONTAINER_TIMESTAMP_HEADER = "mythic-container-timestamp"
	MYTHIC_RABBITMQ_CONTAINER_NONCE_HEADER     = "mythic-container-nonce"
	MYTHIC_RABBITMQ_CONTAINER_SIGNATURE_HEADER = "mythic-container-signature"
	rabbitMQContainerSignatureVersion          = "v1"
	rabbitMQContainerSignatureMaxAge           = 2 * time.Minute
	rabbitMQContainerNonceGlobalLimit          = 100000
	rabbitMQContainerNoncePrincipalLimit       = 10000
	rabbitMQAuthContextTTL                     = 24 * time.Hour
	rabbitMQAuthContextLimit                   = 100000
	rabbitMQVerifiedPrincipalHeader            = "x-mythic-internal-verified-principal"
	rabbitMQVerifiedOperationIDHeader          = "x-mythic-internal-verified-operation-id"
)

type RabbitMQAuthContext struct {
	ContextID           string   `json:"context_id"`
	OperatorID          int      `json:"operator_id"`
	OperationID         int      `json:"operation_id"`
	APITokensID         int      `json:"apitokens_id"`
	EventStepInstanceID int      `json:"eventstepinstance_id"`
	SourceScopes        []string `json:"source_scopes"`
	FileUUID            string   `json:"file_uuid,omitempty"`
	ContainerPrincipal  string   `json:"container_principal,omitempty"`
}

type rabbitMQAuthContextEntry struct {
	Context RabbitMQAuthContext
	Created time.Time
	Expires time.Time
}

type rabbitMQOperationLifecycleState struct {
	Generation uint64
	Changing   bool
}

type rabbitMQContainerNonceEntry struct {
	Key       string
	Principal string
	Expires   time.Time
}

type rabbitMQContainerNonceExpiryHeap []rabbitMQContainerNonceEntry

func (h rabbitMQContainerNonceExpiryHeap) Len() int { return len(h) }
func (h rabbitMQContainerNonceExpiryHeap) Less(i, j int) bool {
	return h[i].Expires.Before(h[j].Expires)
}
func (h rabbitMQContainerNonceExpiryHeap) Swap(i, j int) { h[i], h[j] = h[j], h[i] }
func (h *rabbitMQContainerNonceExpiryHeap) Push(value interface{}) {
	*h = append(*h, value.(rabbitMQContainerNonceEntry))
}
func (h *rabbitMQContainerNonceExpiryHeap) Pop() interface{} {
	old := *h
	last := old[len(old)-1]
	*h = old[:len(old)-1]
	return last
}

type RabbitMQAuthenticationMode string

const (
	RabbitMQAuthenticationPublic               RabbitMQAuthenticationMode = "public"
	RabbitMQAuthenticationContainerAuthContext RabbitMQAuthenticationMode = "container_auth_context"
	RabbitMQAuthenticationContainer            RabbitMQAuthenticationMode = "container"
	RabbitMQAuthenticationContainerOperation   RabbitMQAuthenticationMode = "container_operation"
)

type RabbitMQContainerIdentityExtractor func([]byte) (string, error)

type RabbitMQRPCPolicy struct {
	Authentication        RabbitMQAuthenticationMode
	RequiredScopes        []string
	DynamicRequiredScopes func([]byte) []string
	ContainerIdentity     RabbitMQContainerIdentityExtractor
}

var (
	rabbitMQAuthContextStore       = map[string]rabbitMQAuthContextEntry{}
	rabbitMQAuthContextMutex       sync.RWMutex
	rabbitMQOperationLifecycleLock sync.Mutex
	rabbitMQOperationLifecycles    = map[int]rabbitMQOperationLifecycleState{}
	rabbitMQContainerNonces        = map[string]time.Time{}
	rabbitMQContainerNonceCounts   = map[string]int{}
	rabbitMQContainerNonceExpiries rabbitMQContainerNonceExpiryHeap
	rabbitMQContainerNonceLock     sync.Mutex
	hostedFileAuthTokenByRowID     = map[int]string{}
	hostedFileAuthRowIDByToken     = map[string]int{}
	rabbitMQRPCPolicies            = map[string]RabbitMQRPCPolicy{
		MYTHIC_RPC_DIRECT_FILE_TOKEN_CREATE: {
			Authentication:        RabbitMQAuthenticationContainerAuthContext,
			DynamicRequiredScopes: requiredScopesForDirectFileTokenCreate,
		},
	}
)

func IsRabbitMQAuthContextToken(token string) bool {
	return strings.HasPrefix(token, rabbitMQAuthContextTokenPrefix)
}

func RegisterRabbitMQRPCPolicy(route string, policy RabbitMQRPCPolicy) error {
	if err := validateRabbitMQRPCPolicy(route, policy); err != nil {
		return err
	}
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	rabbitMQRPCPolicies[route] = policy
	return nil
}

func generateRabbitMQAuthContext(input RabbitMQAuthContext) (string, error) {
	if input.ContextID == "" {
		input.ContextID = uuid.NewString()
	}
	normalizedScopes, err := mythicjwt.NormalizeAPITokenScopes(input.SourceScopes)
	if err != nil {
		return "", err
	}
	input.SourceScopes = normalizedScopes
	token, err := generateRabbitMQAuthContextToken()
	if err != nil {
		return "", err
	}
	now := time.Now().UTC()
	rabbitMQAuthContextMutex.Lock()
	if len(rabbitMQAuthContextStore) >= rabbitMQAuthContextLimit {
		cleanupExpiredRabbitMQAuthContextsLocked(now)
	}
	if len(rabbitMQAuthContextStore) >= rabbitMQAuthContextLimit {
		rabbitMQAuthContextMutex.Unlock()
		return "", errors.New("RabbitMQ auth context capacity reached")
	}
	rabbitMQAuthContextStore[token] = rabbitMQAuthContextEntry{
		Context: input,
		Created: now,
		Expires: now.Add(rabbitMQAuthContextTTL),
	}
	rabbitMQAuthContextMutex.Unlock()
	return token, nil
}

func ValidateRabbitMQAuthContextToken(token string) (RabbitMQAuthContext, error) {
	rabbitMQAuthContextMutex.Lock()
	entry, ok := rabbitMQAuthContextStore[token]
	if ok && !entry.Expires.After(time.Now().UTC()) {
		invalidateRabbitMQAuthContextTokenLocked(token)
		ok = false
	}
	rabbitMQAuthContextMutex.Unlock()
	if !ok {
		return RabbitMQAuthContext{}, errors.New("invalid RabbitMQ auth context")
	}
	contextCopy := entry.Context
	contextCopy.SourceScopes = append([]string{}, entry.Context.SourceScopes...)
	return contextCopy, nil
}

func cleanupExpiredRabbitMQAuthContextsLocked(now time.Time) {
	for token, entry := range rabbitMQAuthContextStore {
		if !entry.Expires.After(now) {
			invalidateRabbitMQAuthContextTokenLocked(token)
		}
	}
}

func invalidateRabbitMQAuthContextTokenLocked(token string) {
	delete(rabbitMQAuthContextStore, token)
	if rowID, ok := hostedFileAuthRowIDByToken[token]; ok {
		delete(hostedFileAuthRowIDByToken, token)
		delete(hostedFileAuthTokenByRowID, rowID)
	}
}

func InvalidateRabbitMQAuthContextToken(token string) {
	rabbitMQAuthContextMutex.Lock()
	invalidateRabbitMQAuthContextTokenLocked(token)
	rabbitMQAuthContextMutex.Unlock()
}

func RegisterHostedFileAuthContextToken(rowID int, authContext RabbitMQAuthContext) (string, error) {
	token, err := GenerateRabbitMQAuthContextToken(authContext)
	if err != nil {
		return "", err
	}
	rabbitMQAuthContextMutex.Lock()
	if oldToken, ok := hostedFileAuthTokenByRowID[rowID]; ok {
		invalidateRabbitMQAuthContextTokenLocked(oldToken)
	}
	hostedFileAuthTokenByRowID[rowID] = token
	hostedFileAuthRowIDByToken[token] = rowID
	rabbitMQAuthContextMutex.Unlock()
	return token, nil
}

func InvalidateHostedFileAuthContextToken(rowID int) {
	rabbitMQAuthContextMutex.Lock()
	if token, ok := hostedFileAuthTokenByRowID[rowID]; ok {
		invalidateRabbitMQAuthContextTokenLocked(token)
	}
	rabbitMQAuthContextMutex.Unlock()
}

func InvalidateRabbitMQAuthContextsForAPIToken(apitokenID int) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	for token, entry := range rabbitMQAuthContextStore {
		if entry.Context.APITokensID > 0 && entry.Context.APITokensID == apitokenID {
			invalidateRabbitMQAuthContextTokenLocked(token)
		}
	}
}

func InvalidateRabbitMQAuthContextsForEventStepInstance(eventStepInstanceID int) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	for token, entry := range rabbitMQAuthContextStore {
		if entry.Context.EventStepInstanceID > 0 && entry.Context.EventStepInstanceID == eventStepInstanceID {
			invalidateRabbitMQAuthContextTokenLocked(token)
		}
	}
}

func InvalidateRabbitMQAuthContextsForOperation(operationID int) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	for token, entry := range rabbitMQAuthContextStore {
		if entry.Context.OperationID == operationID {
			invalidateRabbitMQAuthContextTokenLocked(token)
		}
	}
}

func GetRabbitMQAuthContextFromHeaders(headers amqp.Table) (RabbitMQAuthContext, error) {
	emptyContext := RabbitMQAuthContext{}
	if headers == nil {
		return emptyContext, errors.New("missing RabbitMQ auth context")
	}
	value, ok := headers[MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER]
	if !ok {
		return emptyContext, errors.New(fmt.Sprintf("missing RabbitMQ auth context - no %s header", MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER))
	}
	token := ""
	switch typedValue := value.(type) {
	case string:
		token = typedValue
	case []byte:
		token = string(typedValue)
	default:
		token = fmt.Sprintf("%v", typedValue)
	}
	if token == "" {
		return emptyContext, errors.New("missing RabbitMQ auth context - token is empty string")
	}
	return ValidateRabbitMQAuthContextToken(token)
}

func GenerateRabbitMQAuthTokenHeaderFromFields(operatorID int, operationID int,
	apitokenID int, eventstepInstanceID int, scopes []string) (amqp.Table, error) {
	token, err := generateRabbitMQAuthContext(RabbitMQAuthContext{
		OperatorID:          operatorID,
		OperationID:         operationID,
		APITokensID:         apitokenID,
		EventStepInstanceID: eventstepInstanceID,
		SourceScopes:        append([]string{}, scopes...),
	})
	if err != nil {
		return nil, err
	}
	return amqp.Table{MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER: token}, nil
}

func GenerateRabbitMQAuthTokenHeader(authContext RabbitMQAuthContext) (amqp.Table, error) {
	token, err := GenerateRabbitMQAuthContextToken(authContext)
	if err != nil {
		return nil, err
	}
	if token == "" {
		return nil, nil
	}
	return amqp.Table{MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER: token}, nil
}

func GenerateRabbitMQAuthContextToken(authContext RabbitMQAuthContext) (string, error) {
	if authContext.IsEmpty() {
		return "", nil
	}
	authContext.SourceScopes = append([]string{}, authContext.SourceScopes...)
	token, err := generateRabbitMQAuthContext(authContext)
	if err != nil {
		return "", err
	}
	return token, nil
}

func ValidateRabbitMQAuthContextResponseToken(expectedToken string, responseToken string) error {
	if expectedToken == "" && responseToken == "" {
		return nil
	}
	if expectedToken == "" {
		return errors.New("unexpected RabbitMQ auth context in response")
	}
	if responseToken == "" {
		return errors.New("missing RabbitMQ auth context in response")
	}
	if responseToken != expectedToken {
		return errors.New("mismatched RabbitMQ auth context in response")
	}
	_, err := ValidateRabbitMQAuthContextToken(responseToken)
	return err
}

func (authContext RabbitMQAuthContext) IsEmpty() bool {
	return authContext.ContextID == "" &&
		authContext.OperatorID == 0 &&
		authContext.OperationID == 0 &&
		authContext.APITokensID == 0 &&
		authContext.EventStepInstanceID == 0 &&
		authContext.FileUUID == "" &&
		len(authContext.SourceScopes) == 0 &&
		authContext.ContainerPrincipal == ""
}

func GetRabbitMQAuthContextForTaskID(taskID int) (RabbitMQAuthContext, error) {
	task := databaseStructs.Task{}
	err := database.DB.Get(&task, `SELECT 
			task.operator_id, task.operation_id, task.eventstepinstance_id, task.apitokens_id,
			COALESCE(apitokens.scopes, ARRAY[]::text[]) "apitoken.scopes",
			COALESCE(apitokens.id, 0) "apitoken.id",
			COALESCE(apitokens.active, false) "apitoken.active",
			COALESCE(apitokens.deleted, true) "apitoken.deleted"
			FROM task
			LEFT JOIN apitokens ON task.apitokens_id = apitokens.id
			WHERE task.id=$1`, taskID)
	if err != nil {
		return RabbitMQAuthContext{}, err
	}
	authContext := RabbitMQAuthContext{
		OperatorID:  task.OperatorID,
		OperationID: task.OperationID,
	}
	if !task.APITokensID.Valid || task.APITokensID.Int64 == 0 {
		authContext.SourceScopes = []string{mythicjwt.SCOPE_ALL}
	}
	if task.APIToken.ID > 0 {
		authContext.APITokensID = task.APIToken.ID
		if task.APIToken.Active && !task.APIToken.Deleted {
			authContext.SourceScopes = append([]string{}, task.APIToken.Scopes...)
		}
	}
	if task.EventStepInstanceID.Valid {
		authContext.EventStepInstanceID = int(task.EventStepInstanceID.Int64)
	}
	return authContext, nil
}

func authorizeRabbitMQRPCRequest(queue string, message amqp.Delivery) (RabbitMQAuthContext, error) {
	rabbitMQAuthContextMutex.RLock()
	policy, ok := rabbitMQRPCPolicies[queue]
	rabbitMQAuthContextMutex.RUnlock()
	if !ok {
		return RabbitMQAuthContext{}, fmt.Errorf("missing RabbitMQ RPC authentication policy for %s", queue)
	}
	authContext, err := authorizeRabbitMQRPCRequestWithPolicy(queue, policy, message, utils.MythicConfig.ContainerIdentitySecret, time.Now().UTC())
	if err != nil {
		return RabbitMQAuthContext{}, err
	}
	if authContext.OperationID > 0 {
		active := false
		if err := database.DB.Get(&active, `SELECT EXISTS (
			SELECT 1 FROM operation WHERE id=$1 AND complete=false AND deleted=false
		)`, authContext.OperationID); err != nil {
			return RabbitMQAuthContext{}, fmt.Errorf("validate RabbitMQ operation context: %w", err)
		}
		if !active {
			InvalidateRabbitMQAuthContextsForOperation(authContext.OperationID)
			return RabbitMQAuthContext{}, errors.New("RabbitMQ operation context is no longer active")
		}
	}
	return authContext, nil
}

func BeginRabbitMQOperationCapabilityLifecycleChange(operationID int) {
	rabbitMQOperationLifecycleLock.Lock()
	state := rabbitMQOperationLifecycles[operationID]
	state.Generation++
	state.Changing = true
	rabbitMQOperationLifecycles[operationID] = state
	rabbitMQOperationLifecycleLock.Unlock()
}

func EndRabbitMQOperationCapabilityLifecycleChange(operationID int) {
	rabbitMQOperationLifecycleLock.Lock()
	state := rabbitMQOperationLifecycles[operationID]
	state.Generation++
	state.Changing = false
	rabbitMQOperationLifecycles[operationID] = state
	rabbitMQOperationLifecycleLock.Unlock()
}

func snapshotRabbitMQOperationCapabilityLifecycle(operationID int) (uint64, bool) {
	rabbitMQOperationLifecycleLock.Lock()
	defer rabbitMQOperationLifecycleLock.Unlock()
	state := rabbitMQOperationLifecycles[operationID]
	return state.Generation, !state.Changing
}

func authorizeRabbitMQRPCRequestWithPolicy(queue string, policy RabbitMQRPCPolicy, message amqp.Delivery, masterSecret string, now time.Time) (RabbitMQAuthContext, error) {
	if err := validateRabbitMQRPCPolicy(queue, policy); err != nil {
		return RabbitMQAuthContext{}, err
	}
	if policy.Authentication == RabbitMQAuthenticationPublic {
		return RabbitMQAuthContext{}, nil
	}

	authContext := RabbitMQAuthContext{}
	if policy.Authentication == RabbitMQAuthenticationContainerAuthContext || policy.Authentication == RabbitMQAuthenticationContainerOperation {
		var err error
		authContext, err = GetRabbitMQAuthContextFromHeaders(message.Headers)
		if err != nil {
			return RabbitMQAuthContext{}, err
		}
		if policy.Authentication == RabbitMQAuthenticationContainerOperation && authContext.OperationID <= 0 {
			return RabbitMQAuthContext{}, errors.New("RabbitMQ request requires an operation-scoped auth context")
		}
	}

	if policy.Authentication == RabbitMQAuthenticationContainer ||
		policy.Authentication == RabbitMQAuthenticationContainerAuthContext ||
		policy.Authentication == RabbitMQAuthenticationContainerOperation {
		signedRoute := message.RoutingKey
		if signedRoute == "" {
			// Direct callers may not provide delivery metadata.
			signedRoute = queue
		}
		principal, err := authenticateRabbitMQContainerRequest(signedRoute, message, masterSecret, now)
		if err != nil {
			return RabbitMQAuthContext{}, err
		}
		if policy.ContainerIdentity != nil {
			claimedIdentity, err := policy.ContainerIdentity(message.Body)
			if err != nil {
				return RabbitMQAuthContext{}, fmt.Errorf("extract container identity for %s: %w", queue, err)
			}
			if claimedIdentity != principal {
				return RabbitMQAuthContext{}, fmt.Errorf("authenticated container %q cannot act as %q", principal, claimedIdentity)
			}
		}
		if authContext.ContainerPrincipal != "" && authContext.ContainerPrincipal != principal {
			return RabbitMQAuthContext{}, fmt.Errorf("auth context is bound to container %q, not %q", authContext.ContainerPrincipal, principal)
		}
		if (policy.Authentication == RabbitMQAuthenticationContainerAuthContext ||
			policy.Authentication == RabbitMQAuthenticationContainerOperation) && authContext.ContainerPrincipal == "" {
			authContext, err = bindRabbitMQAuthContextToPrincipal(message.Headers, principal)
			if err != nil {
				return RabbitMQAuthContext{}, err
			}
		}
		if policy.Authentication == RabbitMQAuthenticationContainerOperation {
			if authContext.ContainerPrincipal == "" || authContext.ContainerPrincipal != principal {
				return RabbitMQAuthContext{}, fmt.Errorf("operation context is not bound to authenticated container %q", principal)
			}
		}
		authContext.ContainerPrincipal = principal
	}

	requiredScopes := policy.RequiredScopes
	if policy.DynamicRequiredScopes != nil {
		requiredScopes = policy.DynamicRequiredScopes(message.Body)
	}
	for _, requiredScope := range requiredScopes {
		if !mythicjwt.AllowsScope(authContext.SourceScopes, requiredScope) {
			return RabbitMQAuthContext{}, fmt.Errorf("missing required scope %q for RabbitMQ RPC %s", requiredScope, queue)
		}
	}
	return authContext, nil
}

func bindRabbitMQAuthContextToPrincipal(headers amqp.Table, principal string) (RabbitMQAuthContext, error) {
	token, err := rabbitMQHeaderString(headers, MYTHIC_RABBITMQ_AUTH_CONTEXT_HEADER)
	if err != nil || token == "" {
		return RabbitMQAuthContext{}, errors.New("missing RabbitMQ auth context")
	}
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	entry, ok := rabbitMQAuthContextStore[token]
	if !ok {
		return RabbitMQAuthContext{}, errors.New("invalid RabbitMQ auth context")
	}
	if !entry.Expires.After(time.Now().UTC()) {
		invalidateRabbitMQAuthContextTokenLocked(token)
		return RabbitMQAuthContext{}, errors.New("expired RabbitMQ auth context")
	}
	if entry.Context.ContainerPrincipal != "" && entry.Context.ContainerPrincipal != principal {
		return RabbitMQAuthContext{}, fmt.Errorf("auth context is bound to container %q, not %q", entry.Context.ContainerPrincipal, principal)
	}
	entry.Context.ContainerPrincipal = principal
	rabbitMQAuthContextStore[token] = entry
	contextCopy := entry.Context
	contextCopy.SourceScopes = append([]string{}, entry.Context.SourceScopes...)
	return contextCopy, nil
}

func validateRabbitMQRPCPolicy(route string, policy RabbitMQRPCPolicy) error {
	switch policy.Authentication {
	case RabbitMQAuthenticationPublic:
		if len(policy.RequiredScopes) > 0 || policy.DynamicRequiredScopes != nil || policy.ContainerIdentity != nil {
			return fmt.Errorf("public RabbitMQ route %s cannot declare authorization requirements", route)
		}
	case RabbitMQAuthenticationContainerAuthContext:
	case RabbitMQAuthenticationContainer:
		if len(policy.RequiredScopes) > 0 || policy.DynamicRequiredScopes != nil {
			return fmt.Errorf("container-only RabbitMQ route %s cannot declare auth-context scopes", route)
		}
	case RabbitMQAuthenticationContainerOperation:
	default:
		return fmt.Errorf("RabbitMQ route %s must declare an explicit authentication mode", route)
	}
	return nil
}

func DeriveRabbitMQContainerSecret(masterSecret, principal string) []byte {
	mac := hmac.New(sha256.New, []byte(masterSecret))
	mac.Write([]byte("mythic-container-principal:v1:"))
	mac.Write([]byte(principal))
	return mac.Sum(nil)
}

func SignRabbitMQContainerRequest(secret []byte, principal, route string, timestamp int64, nonce, bodyHash string) string {
	canonical := fmt.Sprintf("%s\n%s\n%s\n%d\n%s\n%s", rabbitMQContainerSignatureVersion, principal, route, timestamp, nonce, bodyHash)
	mac := hmac.New(sha256.New, secret)
	mac.Write([]byte(canonical))
	return hex.EncodeToString(mac.Sum(nil))
}

func authenticateRabbitMQContainerRequest(route string, message amqp.Delivery, masterSecret string, now time.Time) (string, error) {
	if message.UserId == "" {
		return "", errors.New("missing broker-validated RabbitMQ user_id")
	}
	if masterSecret == "" {
		return "", errors.New("container authentication is unavailable: RabbitMQ master secret is empty")
	}
	principal, err := rabbitMQHeaderString(message.Headers, MYTHIC_RABBITMQ_CONTAINER_PRINCIPAL_HEADER)
	if err != nil || principal == "" {
		return "", errors.New("missing authenticated container principal")
	}
	if !isCanonicalContainerPrincipal(principal) {
		return "", errors.New("invalid authenticated container principal")
	}
	if message.UserId != principal {
		return "", fmt.Errorf("broker principal %q does not match signed container principal %q", message.UserId, principal)
	}
	nonce, err := rabbitMQHeaderString(message.Headers, MYTHIC_RABBITMQ_CONTAINER_NONCE_HEADER)
	if err != nil || len(nonce) != 48 {
		return "", errors.New("missing or invalid container request nonce")
	}
	if _, err := hex.DecodeString(nonce); err != nil {
		return "", errors.New("missing or invalid container request nonce")
	}
	signature, err := rabbitMQHeaderString(message.Headers, MYTHIC_RABBITMQ_CONTAINER_SIGNATURE_HEADER)
	if err != nil || len(signature) != sha256.Size*2 {
		return "", errors.New("missing container request signature")
	}
	timestamp, err := rabbitMQHeaderInt64(message.Headers, MYTHIC_RABBITMQ_CONTAINER_TIMESTAMP_HEADER)
	if err != nil {
		return "", errors.New("missing or invalid container request timestamp")
	}
	requestTime := time.Unix(timestamp, 0).UTC()
	if requestTime.Before(now.Add(-rabbitMQContainerSignatureMaxAge)) || requestTime.After(now.Add(rabbitMQContainerSignatureMaxAge)) {
		return "", errors.New("container request signature is outside the allowed clock window")
	}
	bodyHash := sha256.Sum256(message.Body)
	expected := SignRabbitMQContainerRequest(
		DeriveRabbitMQContainerSecret(masterSecret, principal), principal, route, timestamp, nonce, hex.EncodeToString(bodyHash[:]))
	expectedBytes, expectedErr := hex.DecodeString(expected)
	providedBytes, providedErr := hex.DecodeString(signature)
	if expectedErr != nil || providedErr != nil || !hmac.Equal(expectedBytes, providedBytes) {
		return "", errors.New("invalid container request signature")
	}
	if !consumeRabbitMQContainerNonce(principal, nonce, now) {
		return "", errors.New("replayed container request nonce")
	}
	return principal, nil
}

func isCanonicalContainerPrincipal(principal string) bool {
	if principal == "" || len(principal) > 128 || principal != strings.ToLower(strings.TrimSpace(principal)) {
		return false
	}
	for index, character := range principal {
		if character >= 'a' && character <= 'z' || character >= '0' && character <= '9' {
			continue
		}
		if index > 0 && (character == '-' || character == '_' || character == '.') {
			continue
		}
		return false
	}
	return true
}

func consumeRabbitMQContainerNonce(principal, nonce string, now time.Time) bool {
	key := principal + "\x00" + nonce
	rabbitMQContainerNonceLock.Lock()
	defer rabbitMQContainerNonceLock.Unlock()
	for rabbitMQContainerNonceExpiries.Len() > 0 && !rabbitMQContainerNonceExpiries[0].Expires.After(now) {
		expired := heap.Pop(&rabbitMQContainerNonceExpiries).(rabbitMQContainerNonceEntry)
		if currentExpiry, ok := rabbitMQContainerNonces[expired.Key]; ok && currentExpiry.Equal(expired.Expires) {
			delete(rabbitMQContainerNonces, expired.Key)
			rabbitMQContainerNonceCounts[expired.Principal]--
			if rabbitMQContainerNonceCounts[expired.Principal] <= 0 {
				delete(rabbitMQContainerNonceCounts, expired.Principal)
			}
		}
	}
	if _, exists := rabbitMQContainerNonces[key]; exists {
		return false
	}
	if len(rabbitMQContainerNonces) >= rabbitMQContainerNonceGlobalLimit ||
		rabbitMQContainerNonceCounts[principal] >= rabbitMQContainerNoncePrincipalLimit {
		return false
	}
	expires := now.Add(rabbitMQContainerSignatureMaxAge)
	rabbitMQContainerNonces[key] = expires
	rabbitMQContainerNonceCounts[principal]++
	heap.Push(&rabbitMQContainerNonceExpiries, rabbitMQContainerNonceEntry{Key: key, Principal: principal, Expires: expires})
	return true
}

func resetRabbitMQContainerNoncesForTest() {
	rabbitMQContainerNonceLock.Lock()
	rabbitMQContainerNonces = map[string]time.Time{}
	rabbitMQContainerNonceCounts = map[string]int{}
	rabbitMQContainerNonceExpiries = nil
	rabbitMQContainerNonceLock.Unlock()
}

func rabbitMQHeaderString(headers amqp.Table, name string) (string, error) {
	if headers == nil {
		return "", fmt.Errorf("missing %s header", name)
	}
	value, ok := headers[name]
	if !ok {
		return "", fmt.Errorf("missing %s header", name)
	}
	switch typed := value.(type) {
	case string:
		return typed, nil
	case []byte:
		return string(typed), nil
	default:
		return "", fmt.Errorf("invalid %s header type", name)
	}
}

func rabbitMQHeaderInt64(headers amqp.Table, name string) (int64, error) {
	if headers == nil {
		return 0, fmt.Errorf("missing %s header", name)
	}
	value, ok := headers[name]
	if !ok {
		return 0, fmt.Errorf("missing %s header", name)
	}
	switch typed := value.(type) {
	case int64:
		return typed, nil
	case int32:
		return int64(typed), nil
	case int:
		return int64(typed), nil
	default:
		return 0, fmt.Errorf("invalid %s header type", name)
	}
}

func attachVerifiedRabbitMQRequestContext(message *amqp.Delivery, authContext RabbitMQAuthContext) {
	if message.Headers == nil {
		message.Headers = amqp.Table{}
	}
	delete(message.Headers, rabbitMQVerifiedPrincipalHeader)
	delete(message.Headers, rabbitMQVerifiedOperationIDHeader)
	if authContext.ContainerPrincipal != "" {
		message.Headers[rabbitMQVerifiedPrincipalHeader] = authContext.ContainerPrincipal
	}
	if authContext.OperationID > 0 {
		message.Headers[rabbitMQVerifiedOperationIDHeader] = int64(authContext.OperationID)
	}
}

func getVerifiedRabbitMQRequestContext(message amqp.Delivery) (RabbitMQAuthContext, error) {
	principal, err := rabbitMQHeaderString(message.Headers, rabbitMQVerifiedPrincipalHeader)
	if err != nil || principal == "" {
		return RabbitMQAuthContext{}, errors.New("missing internally verified container principal")
	}
	operationID, err := rabbitMQHeaderInt64(message.Headers, rabbitMQVerifiedOperationIDHeader)
	if err != nil || operationID <= 0 {
		return RabbitMQAuthContext{}, errors.New("missing internally verified operation context")
	}
	return RabbitMQAuthContext{ContainerPrincipal: principal, OperationID: int(operationID)}, nil
}

func rabbitMQAuthErrorResponse(err error) map[string]interface{} {
	return map[string]interface{}{
		"success":    false,
		"auth_error": true,
		"error":      err.Error(),
	}
}

func requiredScopesForDirectFileTokenCreate(body []byte) []string {
	input := struct {
		Action string `json:"action"`
	}{}
	if err := json.Unmarshal(body, &input); err != nil {
		return []string{mythicjwt.SCOPE_FILE_WRITE}
	}
	switch strings.ToLower(strings.TrimSpace(input.Action)) {
	case "upload", "both":
		return []string{mythicjwt.SCOPE_FILE_WRITE}
	default:
		return []string{mythicjwt.SCOPE_FILE_READ}
	}
}

func generateRabbitMQAuthContextToken() (string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return rabbitMQAuthContextTokenPrefix + base64.RawURLEncoding.EncodeToString(randomBytes), nil
}
