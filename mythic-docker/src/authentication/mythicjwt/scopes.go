package mythicjwt

import (
	"fmt"
	"sort"
	"strings"
)

const (
	SCOPE_ALL = "*"

	SCOPE_APITOKEN_READ  = "apitoken.read"
	SCOPE_APITOKEN_WRITE = "apitoken.write"

	SCOPE_C2_READ  = "c2.read"
	SCOPE_C2_WRITE = "c2.write"

	SCOPE_CALLBACK_READ  = "callback.read"
	SCOPE_CALLBACK_WRITE = "callback.write"

	SCOPE_CONTAINER_FILE_READ  = "container_file.read"
	SCOPE_CONTAINER_FILE_WRITE = "container_file.write"

	SCOPE_CREDENTIAL_READ  = "credential.read"
	SCOPE_CREDENTIAL_WRITE = "credential.write"

	SCOPE_BROWSER_READ  = "browser.read"
	SCOPE_BROWSER_WRITE = "browser.write"

	SCOPE_EVENTING_READ  = "eventing.read"
	SCOPE_EVENTING_WRITE = "eventing.write"

	SCOPE_FILE_READ  = "file.read"
	SCOPE_FILE_WRITE = "file.write"

	SCOPE_MYTHIC_READ  = "mythic.read"
	SCOPE_MYTHIC_WRITE = "mythic.write"

	SCOPE_OPERATION_READ  = "operation.read"
	SCOPE_OPERATION_WRITE = "operation.write"

	SCOPE_OPERATOR_READ  = "operator.read"
	SCOPE_OPERATOR_WRITE = "operator.write"

	SCOPE_PAYLOAD_READ  = "payload.read"
	SCOPE_PAYLOAD_WRITE = "payload.write"

	SCOPE_RESPONSE_READ  = "response.read"
	SCOPE_RESPONSE_WRITE = "response.write"

	SCOPE_TAG_READ  = "tag.read"
	SCOPE_TAG_WRITE = "tag.write"

	SCOPE_TASK_READ  = "task.read"
	SCOPE_TASK_WRITE = "task.write"

	SCOPE_EVENTLOG_READ  = "eventlog.read"
	SCOPE_EVENTLOG_WRITE = "eventlog.write"

	SCOPE_WEBHOOK_READ  = "webhook.read"
	SCOPE_WEBHOOK_WRITE = "webhook.write"
)

type ScopeDefinition struct {
	Name        string   `json:"name"`
	DisplayName string   `json:"display_name"`
	Description string   `json:"description"`
	Resource    string   `json:"resource"`
	Access      string   `json:"access"`
	Includes    []string `json:"includes,omitempty"`
}

type HasuraScopeRequirement struct {
	Resource     string `json:"resource"`
	Access       string `json:"access"`
	Scope        string `json:"scope"`
	Anchor       string `json:"anchor"`
	SessionClaim string `json:"session_claim"`
}

var scopeDefinitions = []ScopeDefinition{
	{Name: SCOPE_APITOKEN_READ, DisplayName: "Read API tokens", Description: "View API token metadata for the authenticated operator.", Resource: "apitoken", Access: "read"},
	{Name: SCOPE_APITOKEN_WRITE, DisplayName: "Write API tokens", Description: "Create, update, or revoke API tokens. Includes read access.", Resource: "apitoken", Access: "write", Includes: []string{SCOPE_APITOKEN_READ}},
	{Name: SCOPE_C2_READ, DisplayName: "Read C2 profiles", Description: "View C2 profile metadata and parameters.", Resource: "c2", Access: "read"},
	{Name: SCOPE_C2_WRITE, DisplayName: "Write C2 profiles", Description: "Start, stop, update, or interact with C2 profile containers. Includes read access.", Resource: "c2", Access: "write", Includes: []string{SCOPE_C2_READ}},
	{Name: SCOPE_CALLBACK_READ, DisplayName: "Read callbacks", Description: "View callbacks and callback metadata for accessible operations.", Resource: "callback", Access: "read"},
	{Name: SCOPE_CALLBACK_WRITE, DisplayName: "Write callbacks", Description: "Create or update callback state. Includes read access.", Resource: "callback", Access: "write", Includes: []string{SCOPE_CALLBACK_READ}},
	{Name: SCOPE_CONTAINER_FILE_READ, DisplayName: "Read container files", Description: "List and download files exposed by Mythic service containers.", Resource: "container_file", Access: "read"},
	{Name: SCOPE_CONTAINER_FILE_WRITE, DisplayName: "Write container files", Description: "Write or remove files exposed by Mythic service containers. Includes read access.", Resource: "container_file", Access: "write", Includes: []string{SCOPE_CONTAINER_FILE_READ}},
	{Name: SCOPE_CREDENTIAL_READ, DisplayName: "Read credentials", Description: "View credential records for accessible operations.", Resource: "credential", Access: "read"},
	{Name: SCOPE_CREDENTIAL_WRITE, DisplayName: "Write credentials", Description: "Create, update, or soft-delete credential records. Includes read access.", Resource: "credential", Access: "write", Includes: []string{SCOPE_CREDENTIAL_READ}},
	{Name: SCOPE_BROWSER_READ, DisplayName: "Read Mythictree Browsers", Description: "View browser entries (file, process, etc) for accessible operations.", Resource: "browser", Access: "read"},
	{Name: SCOPE_BROWSER_WRITE, DisplayName: "Write Mythictree Browsers", Description: "Create, update, or soft-delete browser (file, process, etc) records. Includes read access.", Resource: "browser", Access: "write", Includes: []string{SCOPE_BROWSER_READ}},
	{Name: SCOPE_EVENTLOG_READ, DisplayName: "Read event logs", Description: "View operation event logs for accessible operations.", Resource: "eventlog", Access: "read"},
	{Name: SCOPE_EVENTLOG_WRITE, DisplayName: "Write event logs", Description: "Create or update operation event log records. Includes read access.", Resource: "eventlog", Access: "write", Includes: []string{SCOPE_EVENTLOG_READ}},
	{Name: SCOPE_EVENTING_READ, DisplayName: "Read eventing", Description: "View eventing workflows and run state.", Resource: "eventing", Access: "read"},
	{Name: SCOPE_EVENTING_WRITE, DisplayName: "Write eventing", Description: "Create, update, trigger, or cancel eventing workflows. Includes read access.", Resource: "eventing", Access: "write", Includes: []string{SCOPE_EVENTING_READ}},
	{Name: SCOPE_FILE_READ, DisplayName: "Read files", Description: "View file metadata and download files for accessible operations.", Resource: "file", Access: "read"},
	{Name: SCOPE_FILE_WRITE, DisplayName: "Write files", Description: "Upload, update, or soft-delete file records. Includes read access.", Resource: "file", Access: "write", Includes: []string{SCOPE_FILE_READ}},
	{Name: SCOPE_MYTHIC_READ, DisplayName: "Read Mythic Settings", Description: "View Mythic global setting information.", Resource: "mythic", Access: "read"},
	{Name: SCOPE_MYTHIC_WRITE, DisplayName: "Write Mythic Settings", Description: "Update Mythic global settings. Includes read access.", Resource: "mythic", Access: "write", Includes: []string{SCOPE_MYTHIC_READ}},
	{Name: SCOPE_OPERATION_READ, DisplayName: "Read operations", Description: "View operation metadata and membership visible to the authenticated operator.", Resource: "operation", Access: "read"},
	{Name: SCOPE_OPERATION_WRITE, DisplayName: "Write operations", Description: "Update operation metadata, settings, and membership. Includes read access.", Resource: "operation", Access: "write", Includes: []string{SCOPE_OPERATION_READ}},
	{Name: SCOPE_OPERATOR_READ, DisplayName: "Read operators", Description: "View operator profile metadata and user-specific settings visible to the authenticated operator.", Resource: "operator", Access: "read"},
	{Name: SCOPE_OPERATOR_WRITE, DisplayName: "Write operators", Description: "Update operator profile data, preferences, secrets, and account state. Includes read access.", Resource: "operator", Access: "write", Includes: []string{SCOPE_OPERATOR_READ}},
	{Name: SCOPE_PAYLOAD_READ, DisplayName: "Read payloads", Description: "View payloads, build steps, and payload configuration for accessible operations.", Resource: "payload", Access: "read"},
	{Name: SCOPE_PAYLOAD_WRITE, DisplayName: "Write payloads", Description: "Create, update, rebuild, or soft-delete payload-related records. Includes read access.", Resource: "payload", Access: "write", Includes: []string{SCOPE_PAYLOAD_READ}},
	{Name: SCOPE_RESPONSE_READ, DisplayName: "Read responses", Description: "View task responses, artifacts, keylogs, process data, and related output.", Resource: "response", Access: "read"},
	{Name: SCOPE_RESPONSE_WRITE, DisplayName: "Write responses", Description: "Create response, artifact, keylog, process, and browser data. Includes read access.", Resource: "response", Access: "write", Includes: []string{SCOPE_RESPONSE_READ}},
	{Name: SCOPE_TAG_READ, DisplayName: "Read tags", Description: "View tags and tag types for accessible operations.", Resource: "tag", Access: "read"},
	{Name: SCOPE_TAG_WRITE, DisplayName: "Write tags", Description: "Create, update, or soft-delete tags and tag types. Includes read access.", Resource: "tag", Access: "write", Includes: []string{SCOPE_TAG_READ}},
	{Name: SCOPE_TASK_READ, DisplayName: "Read tasks", Description: "View tasks and task metadata for accessible operations.", Resource: "task", Access: "read"},
	{Name: SCOPE_TASK_WRITE, DisplayName: "Write tasks", Description: "Create or update tasks and task metadata. Includes read access.", Resource: "task", Access: "write", Includes: []string{SCOPE_TASK_READ}},
	{Name: SCOPE_WEBHOOK_READ, DisplayName: "Read webhooks", Description: "View webhook-related operation configuration.", Resource: "webhook", Access: "read"},
	{Name: SCOPE_WEBHOOK_WRITE, DisplayName: "Write webhooks", Description: "Submit external webhook messages. Includes read access.", Resource: "webhook", Access: "write", Includes: []string{SCOPE_WEBHOOK_READ}},
}

var scopeDefinitionLookup = buildScopeDefinitionLookup()

func buildScopeDefinitionLookup() map[string]ScopeDefinition {
	lookup := make(map[string]ScopeDefinition, len(scopeDefinitions))
	for _, definition := range scopeDefinitions {
		lookup[definition.Name] = definition
	}
	return lookup
}

func ScopeDefinitions() []ScopeDefinition {
	definitions := make([]ScopeDefinition, len(scopeDefinitions))
	copy(definitions, scopeDefinitions)
	return definitions
}

func NormalizeAPITokenScopes(scopes []string) ([]string, error) {
	normalized := make([]string, 0, len(scopes))
	seen := make(map[string]struct{}, len(scopes))
	for _, scope := range scopes {
		scope = strings.ToLower(strings.TrimSpace(scope))
		if scope == "" {
			continue
		}
		if !IsKnownScopeOrAlias(scope) {
			return nil, fmt.Errorf("unknown API token scope %q", scope)
		}
		if _, exists := seen[scope]; exists {
			continue
		}
		seen[scope] = struct{}{}
		normalized = append(normalized, scope)
	}
	sort.Strings(normalized)
	return normalized, nil
}

func CanGrantAPITokenScopes(granted []string, requested []string) error {
	for _, scope := range requested {
		if !AllowsScope(granted, scope) {
			return fmt.Errorf("cannot grant API token scope %q without already having it", scope)
		}
	}
	return nil
}

func GrantableScopeDefinitions(granted []string) []ScopeDefinition {
	definitions := make([]ScopeDefinition, 0, len(scopeDefinitions))
	for _, definition := range scopeDefinitions {
		if AllowsScope(granted, definition.Name) {
			definitions = append(definitions, definition)
		}
	}
	return definitions
}

func GrantableWildcardScopes(granted []string) []string {
	resources := map[string]struct{}{}
	for _, definition := range scopeDefinitions {
		resources[definition.Resource] = struct{}{}
	}
	wildcards := []string{}
	for resource := range resources {
		wildcard := resource + ".*"
		if AllowsScope(granted, wildcard) {
			wildcards = append(wildcards, wildcard)
		}
	}
	if AllowsScope(granted, SCOPE_ALL) {
		wildcards = append(wildcards, SCOPE_ALL)
	}
	sort.Strings(wildcards)
	return wildcards
}

func IsKnownScopeOrAlias(scope string) bool {
	if scope == SCOPE_ALL {
		return true
	}
	if resource, ok := wildcardScopeResource(scope); ok {
		for _, definition := range scopeDefinitions {
			if definition.Resource == resource {
				return true
			}
		}
		return false
	}
	_, ok := scopeDefinitionLookup[scope]
	return ok
}

func AllowsScope(granted []string, requiredScopeName string) bool {
	requiredScopeName = strings.ToLower(strings.TrimSpace(requiredScopeName))
	for _, scope := range granted {
		scope = strings.ToLower(strings.TrimSpace(scope))
		if scope == "" {
			continue
		}
		if scope == SCOPE_ALL || scope == requiredScopeName {
			return true
		}
		if resource, ok := wildcardScopeResource(scope); ok && strings.HasPrefix(requiredScopeName, resource+".") {
			return true
		}
		definition, ok := scopeDefinitionLookup[scope]
		if !ok {
			continue
		}
		for _, included := range definition.Includes {
			if included == requiredScopeName {
				return true
			}
		}
	}
	return false
}

func EffectiveScopes(granted []string) []string {
	effective := make(map[string]struct{})
	for _, scope := range granted {
		scope = strings.ToLower(strings.TrimSpace(scope))
		if scope == "" {
			continue
		}
		if scope == SCOPE_ALL {
			effective[SCOPE_ALL] = struct{}{}
			for _, definition := range scopeDefinitions {
				effective[definition.Name] = struct{}{}
			}
			continue
		}
		if resource, ok := wildcardScopeResource(scope); ok {
			for _, definition := range scopeDefinitions {
				if definition.Resource == resource {
					effective[definition.Name] = struct{}{}
				}
			}
			continue
		}
		effective[scope] = struct{}{}
		if definition, ok := scopeDefinitionLookup[scope]; ok {
			for _, included := range definition.Includes {
				effective[included] = struct{}{}
			}
		}
	}
	result := make([]string, 0, len(effective))
	for scope := range effective {
		result = append(result, scope)
	}
	sort.Strings(result)
	return result
}

func wildcardScopeResource(scope string) (string, bool) {
	if strings.HasSuffix(scope, ".*") {
		return strings.TrimSuffix(scope, ".*"), true
	}
	return "", false
}

func HasuraScopeRequirements() []HasuraScopeRequirement {
	requirements := make([]HasuraScopeRequirement, 0, len(scopeDefinitions))
	for _, definition := range scopeDefinitions {
		anchor := "operation"
		if definition.Resource == "apitoken" || definition.Resource == "operator" {
			anchor = "operator"
		}
		requirements = append(requirements, HasuraScopeRequirement{
			Resource:     definition.Resource,
			Access:       definition.Access,
			Scope:        definition.Name,
			Anchor:       anchor,
			SessionClaim: fmt.Sprintf("x-hasura-scope-%s-%s-%s", definition.Resource, definition.Access, anchor),
		})
	}
	return requirements
}
