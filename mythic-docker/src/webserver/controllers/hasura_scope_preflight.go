package webcontroller

import (
	"container/list"
	"crypto/sha256"
	"encoding/hex"
	"errors"
	"fmt"
	"net/http"
	"sort"
	"strings"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/vektah/gqlparser/v2/ast"
	"github.com/vektah/gqlparser/v2/parser"
)

const (
	hasuraPreflightMaxQueryBytes = 128 * 1024
	hasuraPreflightMaxFields     = 2000
	hasuraPreflightMaxTokens     = 20000
	hasuraPreflightCacheSize     = 512
	hasuraPreflightCacheTTL      = 5 * time.Minute
)

var (
	errHasuraPreflightQueryTooLarge = errors.New("hasura query is too large for scope preflight")
	errHasuraPreflightTooComplex    = errors.New("hasura query is too complex for scope preflight")

	hasuraPreflightCache = newHasuraPreflightScopeCache(hasuraPreflightCacheSize, hasuraPreflightCacheTTL)
)

type hasuraScopePreflightError struct {
	Status         int
	Reason         string
	Message        string
	RequiredScopes []string
	MissingScopes  []string
}

type hasuraTableScopePolicy struct {
	ReadScopes        []string
	WriteScopes       []string
	SkipReadPreflight bool
	Relationships     map[string]string
}

type hasuraPreflightCacheKey struct {
	OperationName string
	QueryHash     string
}

type hasuraPreflightCacheEntry struct {
	Key       hasuraPreflightCacheKey
	Scopes    []string
	CreatedAt time.Time
}

type hasuraPreflightScopeCache struct {
	lock       sync.Mutex
	maxEntries int
	ttl        time.Duration
	entries    map[hasuraPreflightCacheKey]*list.Element
	order      *list.List
}

type hasuraScopeCollector struct {
	doc          *ast.QueryDocument
	required     map[string]struct{}
	fieldCount   int
	fragmentSeen map[string]struct{}
}

func newHasuraPreflightScopeCache(maxEntries int, ttl time.Duration) *hasuraPreflightScopeCache {
	return &hasuraPreflightScopeCache{
		maxEntries: maxEntries,
		ttl:        ttl,
		entries:    make(map[hasuraPreflightCacheKey]*list.Element),
		order:      list.New(),
	}
}

func (c *hasuraPreflightScopeCache) get(key hasuraPreflightCacheKey, now time.Time) ([]string, bool) {
	c.lock.Lock()
	defer c.lock.Unlock()
	element, ok := c.entries[key]
	if !ok {
		return nil, false
	}
	entry := element.Value.(*hasuraPreflightCacheEntry)
	if now.Sub(entry.CreatedAt) > c.ttl {
		c.order.Remove(element)
		delete(c.entries, key)
		return nil, false
	}
	c.order.MoveToFront(element)
	return append([]string{}, entry.Scopes...), true
}

func (c *hasuraPreflightScopeCache) set(key hasuraPreflightCacheKey, scopes []string, now time.Time) {
	c.lock.Lock()
	defer c.lock.Unlock()
	if element, ok := c.entries[key]; ok {
		entry := element.Value.(*hasuraPreflightCacheEntry)
		entry.Scopes = append([]string{}, scopes...)
		entry.CreatedAt = now
		c.order.MoveToFront(element)
		return
	}
	entry := &hasuraPreflightCacheEntry{
		Key:       key,
		Scopes:    append([]string{}, scopes...),
		CreatedAt: now,
	}
	element := c.order.PushFront(entry)
	c.entries[key] = element
	for len(c.entries) > c.maxEntries {
		oldest := c.order.Back()
		if oldest == nil {
			return
		}
		oldestEntry := oldest.Value.(*hasuraPreflightCacheEntry)
		delete(c.entries, oldestEntry.Key)
		c.order.Remove(oldest)
	}
}

func (c *hasuraPreflightScopeCache) reset() {
	c.lock.Lock()
	defer c.lock.Unlock()
	c.entries = make(map[hasuraPreflightCacheKey]*list.Element)
	c.order.Init()
}

func hasuraScopePreflight(input authentication.HasuraRequest, claims *mythicjwt.CustomClaims) *hasuraScopePreflightError {
	query := strings.TrimSpace(input.Request.Query)
	// bail out quickly for UI related things or things with mythicjwt.SCOPE_ALL
	if query == "" || mythicjwt.AllowsScope(claims.Scopes, mythicjwt.SCOPE_ALL) {
		return nil
	}
	requiredScopes, err := requiredHasuraScopesForRequest(input.Request.OperationName, query)
	if err != nil {
		return &hasuraScopePreflightError{
			Status:  http.StatusUnauthorized,
			Reason:  "scope_preflight_failed",
			Message: err.Error(),
		}
	}
	if len(requiredScopes) == 0 {
		return nil
	}

	effectiveScopes := mythicjwt.EffectiveScopes(claims.Scopes)
	effectiveLookup := make(map[string]struct{}, len(effectiveScopes))
	for _, scope := range effectiveScopes {
		effectiveLookup[scope] = struct{}{}
	}

	missingScopes := make([]string, 0)
	for _, requiredScope := range requiredScopes {
		if _, ok := effectiveLookup[requiredScope]; !ok {
			missingScopes = append(missingScopes, requiredScope)
		}
	}
	if len(missingScopes) == 0 {
		return nil
	}
	logging.LogDebug("Denied Hasura direct request by API token scope preflight",
		"operation_name", input.Request.OperationName,
		"required_scopes", requiredScopes,
		"missing_scopes", missingScopes,
		"apitokens_id", claims.APITokensID,
		"operator_id", claims.UserID)
	return &hasuraScopePreflightError{
		Status:         http.StatusUnauthorized,
		Reason:         "missing_scope",
		Message:        fmt.Sprintf("This token does not have the required Hasura scope: %s.", strings.Join(missingScopes, ", ")),
		RequiredScopes: requiredScopes,
		MissingScopes:  missingScopes,
	}
}

func requiredHasuraScopesForRequest(operationName string, query string) ([]string, error) {
	if len(query) > hasuraPreflightMaxQueryBytes {
		return nil, errHasuraPreflightQueryTooLarge
	}
	cacheKey := hasuraPreflightCacheKey{
		OperationName: operationName,
		QueryHash:     hasuraPreflightQueryHash(query),
	}
	now := time.Now()
	if scopes, ok := hasuraPreflightCache.get(cacheKey, now); ok {
		return scopes, nil
	}

	doc, err := parser.ParseQueryWithTokenLimit(&ast.Source{
		Name:  "hasura.graphql",
		Input: query,
	}, hasuraPreflightMaxTokens)
	if err != nil {
		return nil, fmt.Errorf("failed to parse Hasura GraphQL query for scope preflight: %w", err)
	}
	operation, err := selectHasuraPreflightOperation(doc, operationName)
	if err != nil {
		return nil, err
	}
	collector := hasuraScopeCollector{
		doc:          doc,
		required:     make(map[string]struct{}),
		fragmentSeen: make(map[string]struct{}),
	}
	if err = collector.collectOperation(operation); err != nil {
		return nil, err
	}
	requiredScopes := collector.requiredScopes()
	hasuraPreflightCache.set(cacheKey, requiredScopes, now)
	return requiredScopes, nil
}

func hasuraPreflightQueryHash(query string) string {
	hash := sha256.Sum256([]byte(query))
	return hex.EncodeToString(hash[:])
}

func selectHasuraPreflightOperation(doc *ast.QueryDocument, operationName string) (*ast.OperationDefinition, error) {
	if operationName != "" {
		for _, operation := range doc.Operations {
			if operation.Name == operationName {
				return operation, nil
			}
		}
		return nil, fmt.Errorf("Hasura GraphQL operation %q was not found", operationName)
	}
	if len(doc.Operations) == 1 {
		return doc.Operations[0], nil
	}
	return nil, errors.New("Hasura GraphQL operationName is required when a request contains multiple operations")
}

func (c *hasuraScopeCollector) collectOperation(operation *ast.OperationDefinition) error {
	if operation.Operation == ast.Subscription {
		return nil
	}
	for _, selection := range operation.SelectionSet {
		if err := c.collectRootSelection(selection, operation.Operation); err != nil {
			return err
		}
	}
	return nil
}

func (c *hasuraScopeCollector) collectRootSelection(selection ast.Selection, operation ast.Operation) error {
	switch typedSelection := selection.(type) {
	case *ast.Field:
		if err := c.countField(); err != nil {
			return err
		}
		rootPolicy, ok := hasuraRootFieldPolicy(typedSelection.Name, operation)
		if !ok {
			return nil
		}
		c.addScopes(rootPolicy.Scopes)
		return c.collectSelectionSet(rootPolicy.TableName, typedSelection.SelectionSet)
	case *ast.FragmentSpread:
		return c.collectFragmentSpread(typedSelection, "", operation)
	case *ast.InlineFragment:
		return c.collectRootSelectionSet(typedSelection.SelectionSet, operation)
	default:
		return nil
	}
}

func (c *hasuraScopeCollector) collectRootSelectionSet(selectionSet ast.SelectionSet, operation ast.Operation) error {
	for _, selection := range selectionSet {
		if err := c.collectRootSelection(selection, operation); err != nil {
			return err
		}
	}
	return nil
}

func (c *hasuraScopeCollector) collectSelectionSet(tableName string, selectionSet ast.SelectionSet) error {
	if tableName == "" {
		return nil
	}
	for _, selection := range selectionSet {
		if err := c.collectSelection(tableName, selection); err != nil {
			return err
		}
	}
	return nil
}

func (c *hasuraScopeCollector) collectSelection(tableName string, selection ast.Selection) error {
	switch typedSelection := selection.(type) {
	case *ast.Field:
		if err := c.countField(); err != nil {
			return err
		}
		if hasuraFieldKeepsTableContext(typedSelection.Name) {
			return c.collectSelectionSet(tableName, typedSelection.SelectionSet)
		}
		relationshipTable, ok := hasuraRelationshipTable(tableName, typedSelection.Name)
		if !ok {
			return nil
		}
		c.addScopes(hasuraReadScopesForTable(relationshipTable))
		return c.collectSelectionSet(relationshipTable, typedSelection.SelectionSet)
	case *ast.FragmentSpread:
		return c.collectFragmentSpread(typedSelection, tableName, "")
	case *ast.InlineFragment:
		return c.collectSelectionSet(tableName, typedSelection.SelectionSet)
	default:
		return nil
	}
}

func (c *hasuraScopeCollector) collectFragmentSpread(fragmentSpread *ast.FragmentSpread, tableName string, operation ast.Operation) error {
	fragment := c.doc.Fragments.ForName(fragmentSpread.Name)
	if fragment == nil {
		return fmt.Errorf("Hasura GraphQL fragment %q was not found", fragmentSpread.Name)
	}
	seenKey := tableName + "\x00" + string(operation) + "\x00" + fragmentSpread.Name
	if _, ok := c.fragmentSeen[seenKey]; ok {
		return nil
	}
	c.fragmentSeen[seenKey] = struct{}{}
	if tableName == "" {
		return c.collectRootSelectionSet(fragment.SelectionSet, operation)
	}
	return c.collectSelectionSet(tableName, fragment.SelectionSet)
}

func (c *hasuraScopeCollector) countField() error {
	c.fieldCount++
	if c.fieldCount > hasuraPreflightMaxFields {
		return errHasuraPreflightTooComplex
	}
	return nil
}

func (c *hasuraScopeCollector) addScopes(scopes []string) {
	for _, scope := range scopes {
		if scope == "" {
			continue
		}
		c.required[scope] = struct{}{}
	}
}

func (c *hasuraScopeCollector) requiredScopes() []string {
	scopes := make([]string, 0, len(c.required))
	for scope := range c.required {
		scopes = append(scopes, scope)
	}
	sort.Strings(scopes)
	return scopes
}

type hasuraRootPolicy struct {
	TableName string
	Scopes    []string
}

func hasuraRootFieldPolicy(fieldName string, operation ast.Operation) (hasuraRootPolicy, bool) {
	tableName, access, ok := hasuraRootFieldTable(fieldName, operation)
	if !ok {
		return hasuraRootPolicy{}, false
	}
	policy, ok := hasuraTableScopePolicies[tableName]
	if !ok {
		return hasuraRootPolicy{TableName: tableName}, true
	}
	if access == "write" {
		return hasuraRootPolicy{TableName: tableName, Scopes: policy.WriteScopes}, true
	}
	if policy.SkipReadPreflight {
		return hasuraRootPolicy{TableName: tableName}, true
	}
	return hasuraRootPolicy{TableName: tableName, Scopes: policy.ReadScopes}, true
}

func hasuraRootFieldTable(fieldName string, operation ast.Operation) (string, string, bool) {
	if strings.HasPrefix(fieldName, "__") {
		return "", "", false
	}
	switch operation {
	case ast.Query:
		if tableName, ok := hasuraQueryRootTable(fieldName); ok {
			return tableName, "read", true
		}
	case ast.Mutation:
		if tableName, ok := hasuraMutationRootTable(fieldName); ok {
			return tableName, "write", true
		}
	}
	return "", "", false
}

func hasuraQueryRootTable(fieldName string) (string, bool) {
	if _, ok := hasuraTableScopePolicies[fieldName]; ok {
		return fieldName, true
	}
	if tableName := strings.TrimSuffix(fieldName, "_by_pk"); tableName != fieldName {
		if _, ok := hasuraTableScopePolicies[tableName]; ok {
			return tableName, true
		}
	}
	if tableName := strings.TrimSuffix(fieldName, "_aggregate"); tableName != fieldName {
		if _, ok := hasuraTableScopePolicies[tableName]; ok {
			return tableName, true
		}
	}
	return "", false
}

func hasuraMutationRootTable(fieldName string) (string, bool) {
	for _, prefix := range []string{"insert_", "update_", "delete_"} {
		if !strings.HasPrefix(fieldName, prefix) {
			continue
		}
		tableName := strings.TrimPrefix(fieldName, prefix)
		for _, suffix := range []string{"_by_pk", "_one", "_many"} {
			tableName = strings.TrimSuffix(tableName, suffix)
		}
		if _, ok := hasuraTableScopePolicies[tableName]; ok {
			return tableName, true
		}
	}
	return "", false
}

func hasuraReadScopesForTable(tableName string) []string {
	policy, ok := hasuraTableScopePolicies[tableName]
	if !ok || policy.SkipReadPreflight {
		return nil
	}
	return policy.ReadScopes
}

func hasuraRelationshipTable(tableName string, fieldName string) (string, bool) {
	policy, ok := hasuraTableScopePolicies[tableName]
	if !ok {
		return "", false
	}
	if policy.Relationships == nil {
		return "", false
	}
	if relationshipTable, ok := policy.Relationships[fieldName]; ok {
		return relationshipTable, true
	}
	if relationshipName := strings.TrimSuffix(fieldName, "_aggregate"); relationshipName != fieldName {
		if relationshipTable, ok := policy.Relationships[relationshipName]; ok {
			return relationshipTable, true
		}
	}
	return "", false
}

func hasuraFieldKeepsTableContext(fieldName string) bool {
	switch fieldName {
	case "nodes", "returning":
		return true
	default:
		return false
	}
}

func writeHasuraScopePreflightError(c interface {
	Header(string, string)
	JSON(int, interface{})
}, preflightError *hasuraScopePreflightError) {
	status := preflightError.Status
	if status == 0 {
		status = http.StatusUnauthorized
	}
	if len(preflightError.MissingScopes) > 0 {
		c.Header("WWW-Authenticate", fmt.Sprintf(`Bearer error="insufficient_scope", scope="%s"`, strings.Join(preflightError.MissingScopes, " ")))
	}
	c.JSON(status, map[string]interface{}{
		"error":           preflightError.Reason,
		"message":         preflightError.Message,
		"required_scopes": preflightError.RequiredScopes,
		"missing_scopes":  preflightError.MissingScopes,
	})
}

var hasuraTableScopePolicies = map[string]hasuraTableScopePolicy{
	"agentstorage": {},
	"apitokens": {
		ReadScopes:  []string{mythicjwt.SCOPE_APITOKEN_READ},
		WriteScopes: []string{mythicjwt.SCOPE_APITOKEN_WRITE},
		Relationships: map[string]string{
			"c2profile_file_hosts": "c2profile_file_host",
			"callbackgraphedges":   "callbackgraphedge",
			"chat_channels":        "chat_channel",
			"chat_messages":        "chat_message",
			"credentials":          "credential",
			"filemeta":             "filemeta",
			"keylogs":              "keylog",
			"loadedcommands":       "loadedcommands",
			"mythictrees":          "mythictree",
			"operationeventlogs":   "operationeventlog",
			"operations":           "operation",
			"operatoroperations":   "operatoroperation",
			"operators":            "operator",
			"payloads":             "payload",
			"responses":            "response",
			"tags":                 "tag",
			"tagtypes":             "tagtype",
			"taskartifacts":        "taskartifact",
			"tasks":                "task",
		},
	},
	"attack": {
		Relationships: map[string]string{
			"attackcommands": "attackcommand",
			"attacktasks":    "attacktask",
		},
	},
	"attackcommand": {},
	"attacktask": {
		ReadScopes:  []string{mythicjwt.SCOPE_TASK_READ},
		WriteScopes: []string{mythicjwt.SCOPE_TASK_WRITE},
	},
	"browserscript": {
		ReadScopes:  []string{mythicjwt.SCOPE_OPERATOR_READ},
		WriteScopes: []string{mythicjwt.SCOPE_OPERATOR_WRITE},
	},
	"buildparameter": {
		Relationships: map[string]string{
			"buildparameterinstances": "buildparameterinstance",
		},
	},
	"buildparameterinstance": {
		ReadScopes:  []string{mythicjwt.SCOPE_PAYLOAD_READ},
		WriteScopes: []string{mythicjwt.SCOPE_PAYLOAD_READ},
	},
	"c2profile": {
		Relationships: map[string]string{
			"c2profile_file_hosts":         "c2profile_file_host",
			"c2profileparameters":          "c2profileparameters",
			"c2profileparametersinstances": "c2profileparametersinstance",
			"callbackc2profiles":           "callbackc2profiles",
			"callbackgraphedges":           "callbackgraphedge",
			"payloadc2profiles":            "payloadc2profiles",
			"payloadtypec2profiles":        "payloadtypec2profile",
		},
	},
	"c2profile_file_host": {
		ReadScopes: []string{mythicjwt.SCOPE_FILE_READ},
	},
	"c2profileparameters": {
		Relationships: map[string]string{
			"c2profileparametersinstances": "c2profileparametersinstance",
		},
	},
	"c2profileparametersinstance": {
		ReadScopes:  []string{mythicjwt.SCOPE_PAYLOAD_READ},
		WriteScopes: []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
	},
	"callback": {
		ReadScopes:  []string{mythicjwt.SCOPE_CALLBACK_READ},
		WriteScopes: []string{mythicjwt.SCOPE_CALLBACK_WRITE},
		Relationships: map[string]string{
			"apitokens":                         "apitokens",
			"c2profileparametersinstances":      "c2profileparametersinstance",
			"callbackc2profiles":                "callbackc2profiles",
			"callbackgraphedges":                "callbackgraphedge",
			"callbackgraphedgesByDestinationId": "callbackgraphedge",
			"callbackports":                     "callbackport",
			"callbacktokens":                    "callbacktoken",
			"loadedcommands":                    "loadedcommands",
			"mythictrees":                       "mythictree",
			"tags":                              "tag",
			"tasks":                             "task",
		},
	},
	"callbackc2profiles": {
		ReadScopes: []string{mythicjwt.SCOPE_CALLBACK_READ},
	},
	"callbackgraphedge": {
		ReadScopes: []string{mythicjwt.SCOPE_CALLBACK_READ},
	},
	"callbackport": {
		ReadScopes: []string{mythicjwt.SCOPE_CALLBACK_READ},
	},
	"callbacktoken": {
		ReadScopes:  []string{mythicjwt.SCOPE_CALLBACK_READ},
		WriteScopes: []string{mythicjwt.SCOPE_CALLBACK_WRITE},
	},
	"chat_channel": {
		SkipReadPreflight: true,
		Relationships: map[string]string{
			"apitokens":   "apitokens",
			"messages":    "chat_message",
			"read_states": "chat_read_state",
			"requests":    "chat_request",
		},
	},
	"chat_message": {
		SkipReadPreflight: true,
		Relationships: map[string]string{
			"chat_request":       "chat_request",
			"read_states":        "chat_read_state",
			"requests_as_prompt": "chat_request",
		},
	},
	"chat_read_state": {
		SkipReadPreflight: true,
	},
	"chat_request": {
		ReadScopes: []string{mythicjwt.SCOPE_CHAT_AI_READ},
		Relationships: map[string]string{
			"chat_requests": "chat_request",
		},
	},
	"command": {
		Relationships: map[string]string{
			"attackcommands":           "attackcommand",
			"browserscripts":           "browserscript",
			"commandparameters":        "commandparameters",
			"disabledcommandsprofiles": "disabledcommandsprofile",
			"loadedcommands":           "loadedcommands",
			"payloadcommands":          "payloadcommand",
			"tasks":                    "task",
		},
	},
	"commandparameters": {},
	"consuming_container": {
		Relationships: map[string]string{
			"chat_channels":                 "chat_channel",
			"chat_messages":                 "chat_message",
			"chat_requests":                 "chat_request",
			"eventgroupconsumingcontainers": "eventgroupconsumingcontainer",
			"operator_aliases":              "operator_alias",
		},
	},
	"credential": {
		ReadScopes: []string{mythicjwt.SCOPE_CREDENTIAL_READ},
		Relationships: map[string]string{
			"tags": "tag",
		},
	},
	"custombrowser": {},
	"disabledcommandsprofile": {
		ReadScopes:  []string{mythicjwt.SCOPE_OPERATION_READ},
		WriteScopes: []string{mythicjwt.SCOPE_OPERATION_WRITE},
		Relationships: map[string]string{
			"operatoroperations": "operatoroperation",
		},
	},
	"eventgroup": {
		ReadScopes: []string{mythicjwt.SCOPE_EVENTING_READ},
		Relationships: map[string]string{
			"eventgroupapprovals":           "eventgroupapproval",
			"eventgroupconsumingcontainers": "eventgroupconsumingcontainer",
			"eventgroupinstances":           "eventgroupinstance",
			"eventsteps":                    "eventstep",
			"filemeta":                      "filemeta",
		},
	},
	"eventgroupapproval": {
		ReadScopes: []string{mythicjwt.SCOPE_EVENTING_READ},
	},
	"eventgroupconsumingcontainer": {
		ReadScopes: []string{mythicjwt.SCOPE_EVENTING_READ},
	},
	"eventgroupinstance": {
		ReadScopes: []string{mythicjwt.SCOPE_EVENTING_READ},
		Relationships: map[string]string{
			"eventstepinstances": "eventstepinstance",
		},
	},
	"eventstep": {
		ReadScopes: []string{mythicjwt.SCOPE_EVENTING_READ},
		Relationships: map[string]string{
			"eventstepinstances": "eventstepinstance",
		},
	},
	"eventstepinstance": {
		ReadScopes: []string{mythicjwt.SCOPE_EVENTING_READ},
		Relationships: map[string]string{
			"apitokens":            "apitokens",
			"c2profile_file_hosts": "c2profile_file_host",
			"callbacks":            "callback",
			"filemeta":             "filemeta",
			"payloads":             "payload",
			"responses":            "response",
			"tags":                 "tag",
			"tagtypes":             "tagtype",
			"taskartifacts":        "taskartifact",
			"tasks":                "task",
		},
	},
	"filemeta": {
		ReadScopes:  []string{mythicjwt.SCOPE_FILE_READ},
		WriteScopes: []string{mythicjwt.SCOPE_FILE_WRITE},
		Relationships: map[string]string{
			"c2profile_file_hosts": "c2profile_file_host",
			"copies_of_file":       "filemeta",
			"eventgroups":          "eventgroup",
			"payloads":             "payload",
			"tags":                 "tag",
		},
	},
	"global_setting": {},
	"invite_link":    {},
	"keylog": {
		ReadScopes: []string{mythicjwt.SCOPE_RESPONSE_READ},
		Relationships: map[string]string{
			"tags": "tag",
		},
	},
	"loadedcommands": {
		ReadScopes:  []string{mythicjwt.SCOPE_CALLBACK_READ},
		WriteScopes: []string{mythicjwt.SCOPE_CALLBACK_WRITE},
	},
	"mythic_server_migration_tracking": {},
	"mythictree": {
		ReadScopes:  []string{mythicjwt.SCOPE_BROWSER_READ},
		WriteScopes: []string{mythicjwt.SCOPE_BROWSER_WRITE},
		Relationships: map[string]string{
			"filemeta": "filemeta",
			"tags":     "tag",
		},
	},
	"operation": {
		ReadScopes: []string{mythicjwt.SCOPE_OPERATION_READ},
		Relationships: map[string]string{
			"buildparameterinstances":      "buildparameterinstance",
			"c2profile_file_hosts":         "c2profile_file_host",
			"c2profileparametersinstances": "c2profileparametersinstance",
			"callbackgraphedges":           "callbackgraphedge",
			"callbackports":                "callbackport",
			"callbacks":                    "callback",
			"chat_channels":                "chat_channel",
			"chat_messages":                "chat_message",
			"chat_read_states":             "chat_read_state",
			"chat_requests":                "chat_request",
			"credentials":                  "credential",
			"disabledcommandsprofiles":     "disabledcommandsprofile",
			"eventgroupapprovals":          "eventgroupapproval",
			"eventgroupinstances":          "eventgroupinstance",
			"eventgroups":                  "eventgroup",
			"eventstepinstances":           "eventstepinstance",
			"eventsteps":                   "eventstep",
			"filemeta":                     "filemeta",
			"invite_links":                 "invite_link",
			"keylogs":                      "keylog",
			"mythictrees":                  "mythictree",
			"operationeventlogs":           "operationeventlog",
			"operatoroperations":           "operatoroperation",
			"operators":                    "operator",
			"payloadonhosts":               "payloadonhost",
			"payloads":                     "payload",
			"responses":                    "response",
			"tags":                         "tag",
			"tagtypes":                     "tagtype",
			"taskartifacts":                "taskartifact",
		},
	},
	"operationeventlog": {
		ReadScopes:  []string{mythicjwt.SCOPE_EVENTLOG_READ},
		WriteScopes: []string{mythicjwt.SCOPE_EVENTLOG_WRITE},
	},
	"operator": {
		ReadScopes:  []string{mythicjwt.SCOPE_OPERATOR_READ},
		WriteScopes: []string{mythicjwt.SCOPE_OPERATOR_WRITE},
		Relationships: map[string]string{
			"apitokens":                        "apitokens",
			"apitokensByCreatedBy":             "apitokens",
			"browserscripts":                   "browserscript",
			"c2profile_file_hosts":             "c2profile_file_host",
			"callbacks":                        "callback",
			"callbacksByLockedOperatorId":      "callback",
			"chatChannelsByCreatedBy":          "chat_channel",
			"chatChannelsByLockedBy":           "chat_channel",
			"chatMessagesByOperatorId":         "chat_message",
			"chat_channels":                    "chat_channel",
			"chat_messages":                    "chat_message",
			"chat_read_states":                 "chat_read_state",
			"chat_requests":                    "chat_request",
			"credentials":                      "credential",
			"eventgroupapprovals":              "eventgroupapproval",
			"eventgroupinstances":              "eventgroupinstance",
			"eventgroupinstancesByCancelledBy": "eventgroupinstance",
			"eventgroups":                      "eventgroup",
			"eventstepinstances":               "eventstepinstance",
			"eventstepinstancesByUserInteractionResolvedBy": "eventstepinstance",
			"eventsteps":                   "eventstep",
			"filemeta":                     "filemeta",
			"global_settings":              "global_setting",
			"invite_links":                 "invite_link",
			"loadedcommands":               "loadedcommands",
			"operationeventlogs":           "operationeventlog",
			"operations":                   "operation",
			"operator_aliases":             "operator_alias",
			"operatoroperations":           "operatoroperation",
			"payloads":                     "payload",
			"tasks":                        "task",
			"tasksByCommentOperatorId":     "task",
			"tasksByOpsecPostBypassUserId": "task",
			"tasksByOpsecPreBypassUserId":  "task",
		},
	},
	"operator_alias": {
		ReadScopes: []string{mythicjwt.SCOPE_OPERATOR_READ},
	},
	"operatoroperation": {
		ReadScopes: []string{mythicjwt.SCOPE_OPERATION_READ},
	},
	"payload": {
		ReadScopes: []string{mythicjwt.SCOPE_PAYLOAD_READ},
		Relationships: map[string]string{
			"apitokens":                    "apitokens",
			"buildparameterinstances":      "buildparameterinstance",
			"c2profileparametersinstances": "c2profileparametersinstance",
			"callbacks":                    "callback",
			"payload_build_steps":          "payload_build_step",
			"payloadc2profiles":            "payloadc2profiles",
			"payloadcommands":              "payloadcommand",
			"payloadonhosts":               "payloadonhost",
			"payloads":                     "payload",
			"staginginfos":                 "staginginfo",
			"tags":                         "tag",
		},
	},
	"payload_build_step": {
		ReadScopes: []string{mythicjwt.SCOPE_PAYLOAD_READ},
	},
	"payloadc2profiles": {
		ReadScopes: []string{mythicjwt.SCOPE_PAYLOAD_READ},
	},
	"payloadcommand": {
		ReadScopes:  []string{mythicjwt.SCOPE_PAYLOAD_READ},
		WriteScopes: []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
	},
	"payloadonhost": {
		ReadScopes:  []string{mythicjwt.SCOPE_PAYLOAD_READ},
		WriteScopes: []string{mythicjwt.SCOPE_PAYLOAD_WRITE},
	},
	"payloadtype": {
		Relationships: map[string]string{
			"browserscripts":        "browserscript",
			"buildparameters":       "buildparameter",
			"commands":              "command",
			"operator_aliases":      "operator_alias",
			"payload_build_steps":   "payload_build_step",
			"payloads":              "payload",
			"payloadtypec2profiles": "payloadtypec2profile",
		},
	},
	"payloadtypec2profile": {},
	"response": {
		ReadScopes: []string{mythicjwt.SCOPE_RESPONSE_READ},
		Relationships: map[string]string{
			"operation": "operation",
			"tags":      "tag",
		},
	},
	"staginginfo": {},
	"tag": {
		ReadScopes:  []string{mythicjwt.SCOPE_TAG_READ},
		WriteScopes: []string{mythicjwt.SCOPE_TAG_WRITE},
	},
	"tagtype": {
		ReadScopes:  []string{mythicjwt.SCOPE_TAG_READ},
		WriteScopes: []string{mythicjwt.SCOPE_TAG_WRITE},
		Relationships: map[string]string{
			"tags": "tag",
		},
	},
	"task": {
		ReadScopes:  []string{mythicjwt.SCOPE_TASK_READ},
		WriteScopes: []string{mythicjwt.SCOPE_TASK_WRITE},
		Relationships: map[string]string{
			"apitokens":      "apitokens",
			"attacktasks":    "attacktask",
			"callbackports":  "callbackport",
			"callbacktokens": "callbacktoken",
			"credentials":    "credential",
			"filemeta":       "filemeta",
			"keylogs":        "keylog",
			"mythictrees":    "mythictree",
			"payloadonhosts": "payloadonhost",
			"payloads":       "payload",
			"responses":      "response",
			"tags":           "tag",
			"taskartifacts":  "taskartifact",
			"tasks":          "task",
			"tokens":         "token",
		},
	},
	"taskartifact": {
		ReadScopes:  []string{mythicjwt.SCOPE_TASK_READ},
		WriteScopes: []string{mythicjwt.SCOPE_TASK_WRITE},
		Relationships: map[string]string{
			"tags": "tag",
		},
	},
	"token": {
		ReadScopes:  []string{mythicjwt.SCOPE_RESPONSE_READ},
		WriteScopes: []string{mythicjwt.SCOPE_RESPONSE_WRITE},
		Relationships: map[string]string{
			"operation":      "operation",
			"callbacktokens": "callbacktoken",
			"tasks":          "task",
		},
	},
	"translationcontainer": {
		Relationships: map[string]string{
			"payloadtypes": "payloadtype",
		},
	},
}
