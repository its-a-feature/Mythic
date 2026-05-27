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
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	amqp "github.com/rabbitmq/amqp091-go"
)

const rabbitMQAuthContextTokenPrefix = "mctx_"

type RabbitMQAuthContext struct {
	ContextID           string   `json:"context_id"`
	OperatorID          int      `json:"operator_id"`
	OperationID         int      `json:"operation_id"`
	APITokensID         int      `json:"apitokens_id"`
	EventStepInstanceID int      `json:"eventstepinstance_id"`
	SourceScopes        []string `json:"source_scopes"`
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
	rabbitMQAuthContextStore = map[string]rabbitMQAuthContextEntry{}
	rabbitMQAuthContextMutex sync.RWMutex
	rabbitMQRPCScopePolicies = map[string]rabbitMQRPCScopePolicy{
		MYTHIC_RPC_DIRECT_FILE_TOKEN_CREATE: {DynamicRequiredScopes: requiredScopesForDirectFileTokenCreate},
	}
)

func RegisterRabbitMQRPCScopePolicy(route string, requiredScopes []string) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	rabbitMQRPCScopePolicies[route] = rabbitMQRPCScopePolicy{RequiredScopes: requiredScopes}
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
	return contextCopy, nil
}

func InvalidateRabbitMQAuthContextToken(token string) {
	rabbitMQAuthContextMutex.Lock()
	delete(rabbitMQAuthContextStore, token)
	rabbitMQAuthContextMutex.Unlock()
}

func InvalidateRabbitMQAuthContextsForAPIToken(apitokenID int) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	for token, entry := range rabbitMQAuthContextStore {
		if entry.Context.APITokensID > 0 && entry.Context.APITokensID == apitokenID {
			delete(rabbitMQAuthContextStore, token)
		}
	}
}

func InvalidateRabbitMQAuthContextsForEventStepInstance(eventStepInstanceID int) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	for token, entry := range rabbitMQAuthContextStore {
		if entry.Context.EventStepInstanceID > 0 && entry.Context.EventStepInstanceID == eventStepInstanceID {
			delete(rabbitMQAuthContextStore, token)
		}
	}
}

func InvalidateRabbitMQAuthContextsForOperation(operationID int) {
	rabbitMQAuthContextMutex.Lock()
	defer rabbitMQAuthContextMutex.Unlock()
	for token, entry := range rabbitMQAuthContextStore {
		if entry.Context.OperationID == operationID {
			delete(rabbitMQAuthContextStore, token)
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
	requiredScopes, err := getRequiredScopesForRabbitMQRPC(queue, message.Body)
	if err != nil {
		return RabbitMQAuthContext{}, err
	}
	authContext, authContextErr := GetRabbitMQAuthContextFromHeaders(message.Headers)
	if len(requiredScopes) == 0 {
		return authContext, nil
	}
	if authContextErr != nil {
		return RabbitMQAuthContext{}, authContextErr
	}
	for _, requiredScope := range requiredScopes {
		if !mythicjwt.AllowsScope(authContext.SourceScopes, requiredScope) {
			return RabbitMQAuthContext{}, fmt.Errorf("missing required scope %q for RabbitMQ RPC %s", requiredScope, queue)
		}
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
