package webcontroller

import (
	"fmt"
	"net/http"
	"net/http/httptest"
	"os"
	"path/filepath"
	"regexp"
	"sort"
	"strings"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"gopkg.in/yaml.v3"
)

func TestRequiredHasuraScopesForRequest(t *testing.T) {
	tests := []struct {
		name          string
		operationName string
		query         string
		wantScopes    []string
	}{
		{
			name: "direct root and nested relationship",
			query: `query GetTasks {
				task {
					id
					responses {
						id
					}
				}
			}`,
			wantScopes: []string{mythicjwt.SCOPE_RESPONSE_READ, mythicjwt.SCOPE_TASK_READ},
		},
		{
			name: "aggregate root and nested aggregate relationship nodes",
			query: `query {
				task_aggregate {
					nodes {
						responses_aggregate {
							nodes {
								id
							}
						}
					}
				}
			}`,
			wantScopes: []string{mythicjwt.SCOPE_RESPONSE_READ, mythicjwt.SCOPE_TASK_READ},
		},
		{
			name: "aliases fragments and inline fragments",
			query: `query GetPayloads {
				payloadAlias: payload {
					...PayloadParts
					... on payload {
						tags {
							id
						}
					}
				}
			}
			fragment PayloadParts on payload {
				payloadcommands {
					id
				}
			}`,
			wantScopes: []string{mythicjwt.SCOPE_PAYLOAD_READ, mythicjwt.SCOPE_TAG_READ},
		},
		{
			name:          "operation name selects one operation",
			operationName: "Files",
			query: `query Tasks {
				task {
					id
				}
			}
			query Files {
				filemeta {
					id
				}
			}`,
			wantScopes: []string{mythicjwt.SCOPE_FILE_READ},
		},
		{
			name: "mutations require write scopes",
			query: `mutation {
				insert_task_one(object: {id: 1}) {
					id
				}
				update_filemeta_by_pk(pk_columns: {id: 1}, _set: {comment: "x"}) {
					id
				}
				delete_tag_by_pk(id: 1) {
					id
				}
			}`,
			wantScopes: []string{mythicjwt.SCOPE_FILE_WRITE, mythicjwt.SCOPE_TAG_WRITE, mythicjwt.SCOPE_TASK_WRITE},
		},
		{
			name: "actions are left to action middleware",
			query: `query {
				scopeCheck(resource: "task", action: "read") {
					allowed
				}
			}`,
			wantScopes: []string{},
		},
		{
			name: "mixed chat roots keep current Hasura behavior",
			query: `query {
				chat_channel {
					id
					messages {
						id
					}
				}
			}`,
			wantScopes: []string{},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resetHasuraPreflightCacheForTest()
			gotScopes, err := requiredHasuraScopesForRequest(tt.operationName, tt.query)
			if err != nil {
				t.Fatalf("requiredHasuraScopesForRequest() error = %v", err)
			}
			assertStringSlicesEqual(t, gotScopes, tt.wantScopes)
		})
	}
}

func TestRequiredHasuraScopesForRequestRejectsAmbiguousOperation(t *testing.T) {
	resetHasuraPreflightCacheForTest()
	_, err := requiredHasuraScopesForRequest("", `query One { task { id } } query Two { filemeta { id } }`)
	if err == nil {
		t.Fatal("expected error for multiple operations without operationName")
	}
	if !strings.Contains(err.Error(), "operationName is required") {
		t.Fatalf("unexpected error: %v", err)
	}
}

func TestRequiredHasuraScopesForRequestLimitsParserWork(t *testing.T) {
	resetHasuraPreflightCacheForTest()
	largeQuery := strings.Repeat("x", hasuraPreflightMaxQueryBytes+1)
	_, err := requiredHasuraScopesForRequest("", largeQuery)
	if err != errHasuraPreflightQueryTooLarge {
		t.Fatalf("expected query-too-large error, got %v", err)
	}

	fields := make([]string, 0, hasuraPreflightMaxFields+1)
	for i := 0; i <= hasuraPreflightMaxFields; i++ {
		fields = append(fields, fmt.Sprintf("id%d: id", i))
	}
	_, err = requiredHasuraScopesForRequest("", fmt.Sprintf("query { task { %s } }", strings.Join(fields, " ")))
	if err != errHasuraPreflightTooComplex {
		t.Fatalf("expected too-complex error, got %v", err)
	}
}

func TestHasuraScopePreflightAuthorization(t *testing.T) {
	tests := []struct {
		name        string
		query       string
		scopes      []string
		wantDenied  bool
		wantMissing []string
	}{
		{
			name:   "read scope allows read query",
			query:  `query { task { id } }`,
			scopes: []string{mythicjwt.SCOPE_TASK_READ},
		},
		{
			name:   "write scope includes read",
			query:  `query { task { id } }`,
			scopes: []string{mythicjwt.SCOPE_TASK_WRITE},
		},
		{
			name:   "resource wildcard allows write mutation",
			query:  `mutation { update_task_by_pk(pk_columns: {id: 1}, _set: {comment: "x"}) { id } }`,
			scopes: []string{"task.*"},
		},
		{
			name:   "all scope fast path skips parsing",
			query:  `this is not graphql`,
			scopes: []string{mythicjwt.SCOPE_ALL},
		},
		{
			name:        "missing nested relationship scope denies",
			query:       `query { task { id responses { id } } }`,
			scopes:      []string{mythicjwt.SCOPE_TASK_READ},
			wantDenied:  true,
			wantMissing: []string{mythicjwt.SCOPE_RESPONSE_READ},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			resetHasuraPreflightCacheForTest()
			err := hasuraScopePreflight(authentication.HasuraRequest{
				Request: authentication.HasuraRequestGraphQL{
					Query: tt.query,
				},
			}, &mythicjwt.CustomClaims{Scopes: tt.scopes})
			if tt.wantDenied {
				if err == nil {
					t.Fatal("expected preflight denial")
				}
				assertStringSlicesEqual(t, err.MissingScopes, tt.wantMissing)
				return
			}
			if err != nil {
				t.Fatalf("unexpected preflight denial: %+v", err)
			}
		})
	}
}

func TestHasuraPreflightCacheStoresScopesNotAuthorization(t *testing.T) {
	resetHasuraPreflightCacheForTest()
	query := `query { task { id } }`
	if _, err := requiredHasuraScopesForRequest("", query); err != nil {
		t.Fatalf("priming requiredHasuraScopesForRequest() error = %v", err)
	}
	if gotEntries := hasuraPreflightCacheEntryCountForTest(); gotEntries != 1 {
		t.Fatalf("cache entries = %d, want 1", gotEntries)
	}
	denied := hasuraScopePreflight(authentication.HasuraRequest{
		Request: authentication.HasuraRequestGraphQL{Query: query},
	}, &mythicjwt.CustomClaims{Scopes: []string{mythicjwt.SCOPE_FILE_READ}})
	if denied == nil {
		t.Fatal("expected cached scope extraction to still deny a token missing task.read")
	}
	assertStringSlicesEqual(t, denied.MissingScopes, []string{mythicjwt.SCOPE_TASK_READ})

	allowed := hasuraScopePreflight(authentication.HasuraRequest{
		Request: authentication.HasuraRequestGraphQL{Query: query},
	}, &mythicjwt.CustomClaims{Scopes: []string{mythicjwt.SCOPE_TASK_READ}})
	if allowed != nil {
		t.Fatalf("expected allowed preflight after cached extraction, got %+v", allowed)
	}
}

func TestHasuraPreflightCacheEvictsAndExpires(t *testing.T) {
	cache := newHasuraPreflightScopeCache(2, time.Minute)
	now := time.Now()
	key1 := hasuraPreflightCacheKey{QueryHash: "1"}
	key2 := hasuraPreflightCacheKey{QueryHash: "2"}
	key3 := hasuraPreflightCacheKey{QueryHash: "3"}
	cache.set(key1, []string{mythicjwt.SCOPE_TASK_READ}, now)
	cache.set(key2, []string{mythicjwt.SCOPE_FILE_READ}, now)
	cache.set(key3, []string{mythicjwt.SCOPE_PAYLOAD_READ}, now)
	if _, ok := cache.get(key1, now); ok {
		t.Fatal("expected oldest cache entry to be evicted")
	}
	if scopes, ok := cache.get(key3, now); !ok || len(scopes) != 1 || scopes[0] != mythicjwt.SCOPE_PAYLOAD_READ {
		t.Fatalf("expected newest cache entry to be present, got scopes=%v ok=%v", scopes, ok)
	}

	expiringCache := newHasuraPreflightScopeCache(2, time.Millisecond)
	expiringCache.set(key1, []string{mythicjwt.SCOPE_TASK_READ}, now)
	if _, ok := expiringCache.get(key1, now.Add(time.Second)); ok {
		t.Fatal("expected cache entry to expire")
	}
}

func TestHasuraScopePolicyMatchesMetadataScopeClaims(t *testing.T) {
	metadataGlob := filepath.Join("..", "..", "..", "..", "hasura-docker", "metadata", "databases", "default", "tables", "*.yaml")
	tableFiles, err := filepath.Glob(metadataGlob)
	if err != nil {
		t.Fatalf("failed to glob Hasura metadata: %v", err)
	}
	if len(tableFiles) == 0 {
		t.Fatalf("no Hasura table metadata found at %s", metadataGlob)
	}
	for _, tableFile := range tableFiles {
		if filepath.Base(tableFile) == "tables.yaml" {
			continue
		}
		tableName, readScopes, writeScopes := metadataScopesForTable(t, tableFile)
		policy, ok := hasuraTableScopePolicies[tableName]
		if !ok {
			t.Fatalf("missing Hasura preflight policy for table %q from %s", tableName, tableFile)
		}
		if !policy.SkipReadPreflight {
			assertStringSetEqual(t, policy.ReadScopes, readScopes, "read scopes for "+tableName)
		}
		assertStringSetEqual(t, policy.WriteScopes, writeScopes, "write scopes for "+tableName)
	}
}

func TestGetHasuraClaimsRunsPreflightBeforeClaimsCache(t *testing.T) {
	gin.SetMode(gin.TestMode)
	resetHasuraPreflightCacheForTest()
	hasuraClaimsCacheLock.Lock()
	hasuraClaimsCache = map[string]map[string]interface{}{
		fmt.Sprintf("%d-%s-%d-%d-%s", 7, mythicjwt.AUTH_METHOD_API, 0, 99, mythicjwt.SCOPE_FILE_READ): {
			"x-hasura-user-id": "7",
			"x-hasura-role":    "operator",
		},
	}
	hasuraClaimsCacheLock.Unlock()
	defer func() {
		hasuraClaimsCacheLock.Lock()
		hasuraClaimsCache = make(map[string]map[string]interface{})
		hasuraClaimsCacheLock.Unlock()
	}()

	recorder := httptest.NewRecorder()
	context, _ := gin.CreateTestContext(recorder)
	context.Request = httptest.NewRequest(http.MethodPost, "/graphql/webhook", nil)
	context.Set("hasura", authentication.HasuraRequest{
		Request: authentication.HasuraRequestGraphQL{
			Query: `query { task { id } }`,
		},
	})
	context.Set(authentication.ContextKeyClaims, &mythicjwt.CustomClaims{
		UserID:      7,
		AuthMethod:  mythicjwt.AUTH_METHOD_API,
		APITokensID: 99,
		Scopes:      []string{mythicjwt.SCOPE_FILE_READ},
	})

	GetHasuraClaims(context)

	if recorder.Code != http.StatusUnauthorized {
		t.Fatalf("GetHasuraClaims() status = %d, want %d; body=%s", recorder.Code, http.StatusUnauthorized, recorder.Body.String())
	}
	if !strings.Contains(recorder.Body.String(), mythicjwt.SCOPE_TASK_READ) {
		t.Fatalf("expected response body to mention missing task.read scope, got %s", recorder.Body.String())
	}
}

func metadataScopesForTable(t *testing.T, tableFile string) (string, []string, []string) {
	t.Helper()
	contents, err := os.ReadFile(tableFile)
	if err != nil {
		t.Fatalf("failed to read %s: %v", tableFile, err)
	}
	var metadata map[string]interface{}
	if err = yaml.Unmarshal(contents, &metadata); err != nil {
		t.Fatalf("failed to parse %s: %v", tableFile, err)
	}
	tableInfo, ok := metadata["table"].(map[string]interface{})
	if !ok {
		t.Fatalf("table metadata missing table block in %s", tableFile)
	}
	tableName, ok := tableInfo["name"].(string)
	if !ok || tableName == "" {
		t.Fatalf("table metadata missing table name in %s", tableFile)
	}
	readScopes := metadataScopesFromPermissionBlocks(metadata["select_permissions"])
	writeScopes := metadataScopesFromPermissionBlocks(metadata["insert_permissions"], metadata["update_permissions"], metadata["delete_permissions"])
	return tableName, readScopes, writeScopes
}

func metadataScopesFromPermissionBlocks(blocks ...interface{}) []string {
	scopeExpression := regexp.MustCompile(`(?i)X-Hasura-Scope-([A-Za-z0-9_-]+)-(read|write)-[A-Za-z]+`)
	scopes := map[string]struct{}{}
	for _, block := range blocks {
		for _, match := range scopeExpression.FindAllStringSubmatch(fmt.Sprint(block), -1) {
			scopes[strings.ToLower(match[1])+"."+strings.ToLower(match[2])] = struct{}{}
		}
	}
	result := make([]string, 0, len(scopes))
	for scope := range scopes {
		result = append(result, scope)
	}
	sort.Strings(result)
	return result
}

func resetHasuraPreflightCacheForTest() {
	hasuraPreflightCache.reset()
}

func hasuraPreflightCacheEntryCountForTest() int {
	hasuraPreflightCache.lock.Lock()
	defer hasuraPreflightCache.lock.Unlock()
	return len(hasuraPreflightCache.entries)
}

func assertStringSlicesEqual(t *testing.T, got []string, want []string) {
	t.Helper()
	if len(got) != len(want) {
		t.Fatalf("got %v, want %v", got, want)
	}
	for i := range got {
		if got[i] != want[i] {
			t.Fatalf("got %v, want %v", got, want)
		}
	}
}

func assertStringSetEqual(t *testing.T, got []string, want []string, label string) {
	t.Helper()
	gotCopy := append([]string{}, got...)
	wantCopy := append([]string{}, want...)
	sort.Strings(gotCopy)
	sort.Strings(wantCopy)
	assertStringSlicesEqual(t, gotCopy, wantCopy)
}
