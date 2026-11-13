package rabbitmq

import (
	"crypto/rand"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/google/uuid"

	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	amqp "github.com/rabbitmq/amqp091-go"
)

const rabbitMQAuthContextTokenPrefix = "mrtk_"

type RabbitMQAuthContext struct {
	ContextID           string   `json:"context_id"`
	OperatorID          int      `json:"operator_id"`
	OperationID         int      `json:"operation_id"`
	APITokensID         int      `json:"apitokens_id"`
	EventStepInstanceID int      `json:"eventstepinstance_id"`
	SourceScopes        []string `json:"source_scopes"`
	FileUUID            string   `json:"file_uuid,omitempty"`
	scopes              map[string]bool
}

func (authContext *RabbitMQAuthContext) ScopeSet() map[string]bool {
	if authContext.scopes == nil {
		authContext.scopes = map[string]bool{}
		for _, scope := range authContext.SourceScopes {
			authContext.scopes[scope] = true
		}
	}
	return authContext.scopes
}

type rabbitMQAuthContextEntry struct {
	Context RabbitMQAuthContext
	Created time.Time
}

type rabbitMQRPCScopePolicy struct {
	RequiredScopes        []string
	DynamicRequiredScopes func([]byte) []string
}

var (
	rabbitMQAuthContextStore   = map[string]rabbitMQAuthContextEntry{}
	rabbitMQAuthContextMutex   sync.RWMutex
	hostedFileAuthTokenByRowID = map[int]string{}
	hostedFileAuthRowIDByToken = map[string]int{}
	rabbitMQRPCScopePolicies   = map[string]rabbitMQRPCScopePolicy{
		MYTHIC_RPC_DIRECT_FILE_TOKEN_CREATE: {DynamicRequiredScopes: requiredScopesForDirectFileTokenCreate},
	}
)

func IsRabbitMQAuthContextToken(token string) bool {
	return strings.HasPrefix(token, rabbitMQAuthContextTokenPrefix)
}

func RegisterRabbitMQRPCScopePolicy(route string, requiredScopes []string) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	rabbitMQRPCScopePolicies[route] = rabbitMQRPCScopePolicy{RequiredScopes: requiredScopes}
}

func generateRabbitMQAuthContext(input RabbitMQAuthContext) (string, error) {
	if input.ContextID == "" {
		input.ContextID = uuid.NewString()
	}
	input.SourceScopes = append([]string{}, input.SourceScopes...)
	input.scopes = nil
	token, err := generateRabbitMQAuthContextToken()
	if err != nil {
		return "", err
	}
	rabbitMQAuthContextMutex.Lock()
	rabbitMQAuthContextStore[token] = rabbitMQAuthContextEntry{
		Context: input,
		Created: time.Now().UTC(),
	}
	rabbitMQAuthContextMutex.Unlock()
	return token, nil
}

func ValidateRabbitMQAuthContextToken(token string) (RabbitMQAuthContext, error) {
	rabbitMQAuthContextMutex.RLock()
	entry, ok := rabbitMQAuthContextStore[token]
	rabbitMQAuthContextMutex.RUnlock()
	if !ok {
		return RabbitMQAuthContext{}, errors.New("invalid RabbitMQ auth context")
	}
	contextCopy := entry.Context
	contextCopy.SourceScopes = append([]string{}, entry.Context.SourceScopes...)
	contextCopy.scopes = nil
	return contextCopy, nil
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
	// Only the in-process queue dispatcher can insert this Go value. AMQP
	// decoding cannot manufacture the type, so client header maps are not trusted.
	if resolved, ok := headers["mythic_resolved_authorization"].(RabbitMQAuthContext); ok {
		return resolved, nil
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
		len(authContext.SourceScopes) == 0
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
		authContext.SourceScopes = []string{authorization.SCOPE_ALL}
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
	requiredScopes, err := getRequiredScopesForRabbitMQRPC(queue, message.Body)
	if err != nil {
		return RabbitMQAuthContext{}, err
	}
	authContext, authContextErr := GetRabbitMQAuthContextFromHeaders(message.Headers)
	role, admin := "", false
	if authContextErr == nil && authContext.APITokensID > 0 {
		authority, err := database.GetAPITokenScopesWithOperationID(authContext.APITokensID, authContext.OperationID)
		if err != nil {
			return RabbitMQAuthContext{}, fmt.Errorf("RPC token is revoked or outside its operation: %w", err)
		}
		role, admin = authority.Role, authority.Admin
		allowed := map[string]bool{}
		for _, scope := range authority.Scopes {
			allowed[scope] = true
		}
		limited := []string{}
		for _, scope := range authContext.SourceScopes {
			if allowed[scope] {
				limited = append(limited, scope)
			}
		}
		authContext.SourceScopes = limited
		authContext.scopes = nil
	} else if authContextErr == nil && authContext.OperatorID > 0 && database.DB != nil {
		// Interactive/background user authority also follows current membership.
		var current struct {
			Role  string `db:"view_mode"`
			Admin bool   `db:"admin"`
		}
		err = database.DB.Get(&current, `SELECT 
    		o.admin,
    		COALESCE(m.view_mode,'') view_mode 
		 FROM operator o
		 LEFT JOIN operatoroperation m ON m.operator_id=o.id AND m.operation_id=$2
		 WHERE o.id=$1 AND 
		       o.active AND 
		       NOT o.deleted AND 
		       (o.admin OR m.id IS NOT NULL)`, authContext.OperatorID, authContext.OperationID)
		if err != nil {
			return RabbitMQAuthContext{}, err
		}
		role, admin = current.Role, current.Admin
	}
	if len(requiredScopes) == 0 {
		if authContextErr == nil && message.Headers != nil {
			message.Headers["mythic_resolved_authorization"] = authContext
		}
		return authContext, nil
	}
	if authContextErr != nil {
		return RabbitMQAuthContext{}, authContextErr
	}
	grants := authContext.ScopeSet()
	for _, requiredScope := range requiredScopes {
		if !grants[authorization.SCOPE_ALL] && !grants[requiredScope] {
			return RabbitMQAuthContext{}, fmt.Errorf("missing required scope %q for RabbitMQ RPC %s", requiredScope, queue)
		}
		if !admin && role == database.OPERATOR_OPERATION_VIEW_MODE_SPECTATOR && strings.HasSuffix(requiredScope, ".write") && requiredScope != authorization.SCOPE_APITOKEN_WRITE {
			return RabbitMQAuthContext{}, fmt.Errorf("owner role does not allow writes for %s", queue)
		}
		if !admin && role != "" && requiredScope == authorization.SCOPE_MYTHIC_WRITE {
			return RabbitMQAuthContext{}, fmt.Errorf("owner administrator authority is required for %s", queue)
		}
	}
	// Scope verification and the handler share this delivery-local result. The
	// dispatcher removes it before publishing a reply or completing the delivery.
	if message.Headers != nil {
		message.Headers["mythic_resolved_authorization"] = authContext
	}
	return authContext, nil
}

func getRequiredScopesForRabbitMQRPC(queue string, body []byte) ([]string, error) {
	rabbitMQAuthContextMutex.RLock()
	policy, ok := rabbitMQRPCScopePolicies[queue]
	rabbitMQAuthContextMutex.RUnlock()
	if !ok {
		return nil, fmt.Errorf("missing RabbitMQ RPC scope policy for %s", queue)
	}
	if policy.DynamicRequiredScopes != nil {
		return policy.DynamicRequiredScopes(body), nil
	}
	return policy.RequiredScopes, nil
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
		return []string{authorization.SCOPE_FILE_WRITE}
	}
	switch strings.ToLower(strings.TrimSpace(input.Action)) {
	case "upload", "both":
		return []string{authorization.SCOPE_FILE_WRITE}
	default:
		return []string{authorization.SCOPE_FILE_READ}
	}
}

func generateRabbitMQAuthContextToken() (string, error) {
	randomBytes := make([]byte, 32)
	if _, err := rand.Read(randomBytes); err != nil {
		return "", err
	}
	return rabbitMQAuthContextTokenPrefix + base64.RawURLEncoding.EncodeToString(randomBytes), nil
}
