package rabbitmq

import (
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"slices"
	"sort"
	"strings"
	"sync"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
)

var (
	taskReferenceExactPattern  = regexp.MustCompile(`^@([A-Za-z][A-Za-z0-9_-]*):(.+)$`)
	taskReferenceLegacyPattern = regexp.MustCompile(`@([A-Za-z][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)(?:\.([A-Za-z][A-Za-z0-9_-]*))?`)
)

type taskReference struct {
	// Keyword is the provider name, like the cred in @cred:12.credential.
	Keyword string
	// Selector is provider-owned, comparable selector text. For @cred it is 12;
	// for @link it is a canonical named-argument string.
	Selector string
	// Field is used by scalar references such as @cred:12.credential.
	Field string
	// Raw is the exact text supplied by the operator or automation.
	Raw string
	// ParameterType is set only for top-level structured parameter references.
	ParameterType string
}

type taskReferenceResolvedValue struct {
	Scalar            string
	Structured        interface{}
	PostCreateActions []taskReferencePostCreateAction
}

// taskReferencePostCreateAction exists for references that imply database
// bookkeeping after the task ID is known, such as @link payload-on-host tracking.
type taskReferencePostCreateAction struct {
	Description string
	Execute     func(*sqlx.Tx, databaseStructs.Task) error
}

const (
	taskReferenceValueTypeString     = "string"
	taskReferenceValueTypeStructured = "structured"
)

type PTTaskKeywordResolution struct {
	Raw            string   `json:"raw"`
	Keyword        string   `json:"keyword"`
	Selector       string   `json:"selector"`
	Field          string   `json:"field"`
	ValueType      string   `json:"value_type"`
	ExpandedValue  string   `json:"expanded_value"`
	ParameterNames []string `json:"parameter_names"`
}

type taskReferenceMatch struct {
	Reference      taskReference
	ParameterNames []string
	ValueType      string
}

// taskReferenceProvider is the extension point for keywords like @cred and
// @link. The generic resolver owns traversal and replacement; providers own
// syntax, validation, lookup, and optional post-create side effects.
type taskReferenceProvider interface {
	Keyword() string
	// StructuredParameterTypes identifies top-level command parameter types
	// where a string reference can expand into a structured JSON value.
	StructuredParameterTypes() []string
	ParseReferenceBody(body string, raw string) (taskReference, error)
	// ValidateReference ensures that the reference is valid for the provider.
	ValidateReference(reference taskReference, structured bool) error
	// BatchResolveTaskReferences resolves references into their database-backed fields
	BatchResolveTaskReferences(context taskReferenceResolveContext, references []taskReference) (map[taskReference]taskReferenceResolvedValue, error)
}

var taskReferenceProviderRegistry = struct {
	sync.RWMutex
	providers map[string]taskReferenceProvider
}{
	providers: make(map[string]taskReferenceProvider),
}

func registerTaskReferenceProvider(provider taskReferenceProvider) {
	keyword := strings.ToLower(strings.TrimSpace(provider.Keyword()))
	if keyword == "" {
		return
	}
	taskReferenceProviderRegistry.Lock()
	defer taskReferenceProviderRegistry.Unlock()
	taskReferenceProviderRegistry.providers[keyword] = provider
	RegisterReservedOperatorAliasName(keyword)
}

func getTaskReferenceProvider(keyword string) (taskReferenceProvider, bool) {
	taskReferenceProviderRegistry.RLock()
	defer taskReferenceProviderRegistry.RUnlock()
	provider, ok := taskReferenceProviderRegistry.providers[strings.ToLower(strings.TrimSpace(keyword))]
	return provider, ok
}

type taskReferenceStructuredParameterProvider struct {
	Keyword       string
	ParameterType string
	// ParameterNames contains the command parameter name, CLI name, and display
	// name. Containers can pass any of those names to RevertKeywords.
	ParameterNames []string
}

type taskReferenceResolveContext struct {
	OperationID                  int
	CallbackID                   int
	StructuredParameterProviders map[string]taskReferenceStructuredParameterProvider
}

func expandTaskReferenceParameters(commandID int, operationID int, callbackID int, params string) (string, bool, []PTTaskKeywordResolution, []taskReferencePostCreateAction, error) {
	if commandID <= 0 || operationID <= 0 {
		logging.LogError(nil, "expandTaskReferenceParameters", "invalid command ID or operation ID")
		return params, false, nil, nil, nil
	}
	if strings.TrimSpace(params) == "" {
		return params, false, nil, nil, nil
	}
	paramsContainTaskReference := strings.Contains(params, "@")
	taskReferenceProviderRegistry.RLock()
	providers := make([]taskReferenceProvider, 0, len(taskReferenceProviderRegistry.providers))
	for keyword := range taskReferenceProviderRegistry.providers {
		providers = append(providers, taskReferenceProviderRegistry.providers[keyword])
	}
	taskReferenceProviderRegistry.RUnlock()
	context := taskReferenceResolveContext{
		OperationID: operationID,
		CallbackID:  callbackID,
		// StructuredParameterProviders maps parameter names, CLI names, and
		// display names to the provider that can hydrate that top-level value.
		StructuredParameterProviders: make(map[string]taskReferenceStructuredParameterProvider),
	}
	providersByParameterType := make(map[string]taskReferenceProvider)
	parameterTypes := make([]string, 0, len(providers))
	for _, provider := range providers {
		for _, parameterType := range provider.StructuredParameterTypes() {
			parameterType = strings.TrimSpace(parameterType)
			if parameterType == "" {
				continue
			}
			if _, exists := providersByParameterType[parameterType]; !exists {
				parameterTypes = append(parameterTypes, parameterType)
			}
			providersByParameterType[parameterType] = provider
		}
	}
	if !paramsContainTaskReference && len(parameterTypes) == 0 {
		return params, false, nil, nil, nil
	}
	if len(parameterTypes) > 0 {
		structuredParameters := []databaseStructs.Commandparameters{}
		query, args, err := sqlx.In(`SELECT
				DISTINCT ON ("name")
				"name", display_name, cli_name, "type"
				FROM commandparameters
				WHERE command_id=? AND "type" IN (?)`,
			commandID, parameterTypes)
		if err != nil {
			logging.LogError(err, "expandTaskReferenceParameters", "failed to build parameter query")
			return params, false, nil, nil, fmt.Errorf("failed to build parameter query: %w", err)
		}
		query = database.DB.Rebind(query)
		err = database.DB.Select(&structuredParameters, query, args...)
		if err != nil {
			logging.LogError(err, "expandTaskReferenceParameters", "failed to query parameters")
			return params, false, nil, nil, fmt.Errorf("failed to query parameters: %w", err)
		}
		for _, parameter := range structuredParameters {
			provider, ok := providersByParameterType[parameter.Type]
			if !ok {
				continue
			}
			parameterNames := taskReferenceUniqueParameterNames(parameter.Name, parameter.CliName, parameter.DisplayName)
			structuredProvider := taskReferenceStructuredParameterProvider{
				Keyword:        provider.Keyword(),
				ParameterType:  parameter.Type,
				ParameterNames: parameterNames,
			}
			for _, parameterKey := range parameterNames {
				context.StructuredParameterProviders[parameterKey] = structuredProvider
			}
		}
	}
	return resolveTaskReferencesInParams(params, context)
}

func taskReferenceUniqueParameterNames(parameterNames ...string) []string {
	uniqueNames := make([]string, 0, len(parameterNames))
	seen := make(map[string]bool)
	for _, parameterName := range parameterNames {
		parameterName = strings.TrimSpace(parameterName)
		if parameterName == "" || seen[parameterName] {
			continue
		}
		seen[parameterName] = true
		uniqueNames = append(uniqueNames, parameterName)
	}
	return uniqueNames
}

func resolveTaskReferencesInParams(params string, context taskReferenceResolveContext) (string, bool, []PTTaskKeywordResolution, []taskReferencePostCreateAction, error) {
	if strings.TrimSpace(params) == "" {
		return params, false, nil, nil, nil
	}
	if !strings.Contains(params, "@") && len(context.StructuredParameterProviders) == 0 {
		return params, false, nil, nil, nil
	}
	decoder := json.NewDecoder(strings.NewReader(params))
	decoder.UseNumber()
	var decoded interface{}
	if err := decoder.Decode(&decoded); err == nil {
		err = decoder.Decode(&struct{}{})
		if err != io.EOF {
			return params, false, nil, nil, fmt.Errorf("failed to parse task parameters as a single JSON value")
		}
		matches, err := collectTaskReferencesFromJSON(decoded, context, true, "")
		if err != nil {
			return params, false, nil, nil, err
		}
		if len(matches) == 0 {
			return params, false, nil, nil, nil
		}
		references := taskReferenceMatchesToReferences(matches)
		resolved, err := resolveTaskReferenceBatch(context, references)
		if err != nil {
			return params, false, nil, nil, err
		}
		updated, changed := applyTaskReferencesToJSON(
			decoded,
			context,
			taskReferenceStructuredValuesByLookupKey(resolved),
			taskReferenceScalarValuesByRaw(resolved),
			true,
		)
		if !changed {
			return params, false, nil, nil, nil
		}
		updatedBytes, err := json.Marshal(updated)
		if err != nil {
			return params, false, nil, nil, fmt.Errorf("failed to serialize task parameters after reference resolution: %w", err)
		}
		return string(updatedBytes), true, buildTaskKeywordResolution(matches, resolved), collectTaskReferencePostCreateActions(matches, resolved), nil
	}
	matches, err := collectTaskReferencesFromString(params, "")
	if err != nil {
		return params, false, nil, nil, err
	}
	if len(matches) == 0 {
		return params, false, nil, nil, nil
	}
	references := taskReferenceMatchesToReferences(matches)
	resolved, err := resolveTaskReferenceBatch(context, references)
	if err != nil {
		return params, false, nil, nil, err
	}
	updated, changed := applyTaskReferencesToString(params, taskReferenceScalarValuesByRaw(resolved))
	if !changed {
		return params, false, nil, nil, nil
	}
	return updated, true, buildTaskKeywordResolution(matches, resolved), collectTaskReferencePostCreateActions(matches, resolved), nil
}

func collectTaskReferencesFromJSON(value interface{}, context taskReferenceResolveContext, topLevel bool, parameterName string) ([]taskReferenceMatch, error) {
	switch typed := value.(type) {
	case map[string]interface{}:
		matches := make([]taskReferenceMatch, 0)
		for key, nestedValue := range typed {
			nestedParameterName := parameterName
			if topLevel {
				nestedParameterName = key
			}
			if topLevel {
				if structuredProvider, ok := context.StructuredParameterProviders[key]; ok {
					structuredMatch, err := collectStructuredTaskReference(nestedValue, structuredProvider, key)
					if err != nil {
						return nil, err
					}
					matches = append(matches, structuredMatch)
					continue
				}
			}
			nestedReferences, err := collectTaskReferencesFromJSON(nestedValue, context, false, nestedParameterName)
			if err != nil {
				return nil, err
			}
			matches = append(matches, nestedReferences...)
		}
		return matches, nil
	case []interface{}:
		matches := make([]taskReferenceMatch, 0)
		for _, nestedValue := range typed {
			nestedReferences, err := collectTaskReferencesFromJSON(nestedValue, context, false, parameterName)
			if err != nil {
				return nil, err
			}
			matches = append(matches, nestedReferences...)
		}
		return matches, nil
	case string:
		return collectTaskReferencesFromString(typed, parameterName)
	default:
		return nil, nil
	}
}

func collectStructuredTaskReference(value interface{}, structuredProvider taskReferenceStructuredParameterProvider, parameterName string) (taskReferenceMatch, error) {
	reference, err := parseStructuredTaskReference(value, structuredProvider)
	if err != nil {
		return taskReferenceMatch{}, err
	}
	return taskReferenceMatch{
		Reference:      reference,
		ParameterNames: taskReferenceUniqueParameterNames(append([]string{parameterName}, structuredProvider.ParameterNames...)...),
		ValueType:      taskReferenceValueTypeStructured,
	}, nil
}

func collectTaskReferencesFromString(value string, parameterName string) ([]taskReferenceMatch, error) {
	if !strings.Contains(value, "@") {
		return nil, nil
	}
	matches := taskReferenceLegacyPattern.FindAllStringSubmatch(value, -1)
	if len(matches) == 0 {
		return nil, nil
	}
	references := make([]taskReferenceMatch, 0, len(matches))
	for _, match := range matches {
		reference, ok := taskReferenceFromLegacySubmatch(match)
		if !ok || reference.Field == "" {
			continue
		}
		if err := validateTaskReference(reference, false); err != nil {
			return nil, err
		}
		references = append(references, taskReferenceMatch{
			Reference:      reference,
			ParameterNames: taskReferenceUniqueParameterNames(parameterName),
			ValueType:      taskReferenceValueTypeString,
		})
	}
	return references, nil
}

func taskReferenceFromLegacySubmatch(match []string) (taskReference, bool) {
	if len(match) < 3 || match[0] == "" {
		return taskReference{}, false
	}
	reference := taskReference{
		Raw:      match[0],
		Keyword:  strings.ToLower(match[1]),
		Selector: match[2],
	}
	if len(match) > 3 {
		reference.Field = strings.ToLower(match[3])
	}
	return reference, true
}

func parseStructuredTaskReference(value interface{}, structuredProvider taskReferenceStructuredParameterProvider) (taskReference, error) {
	providerKeyword := strings.ToLower(strings.TrimSpace(structuredProvider.Keyword))
	if _, ok := getTaskReferenceProvider(providerKeyword); !ok {
		return taskReference{}, fmt.Errorf("unsupported task reference keyword %q", structuredProvider.Keyword)
	}
	referenceValue, ok := value.(string)
	if !ok {
		return taskReference{}, fmt.Errorf("%s parameters require @%s task references", structuredProvider.Keyword, structuredProvider.Keyword)
	}
	reference, found, err := parseExactTaskReference(referenceValue)
	if err != nil {
		return taskReference{}, err
	}
	if !found {
		return taskReference{}, fmt.Errorf("%s parameters require @%s task references", structuredProvider.Keyword, structuredProvider.Keyword)
	}
	if reference.Keyword != providerKeyword {
		return taskReference{}, fmt.Errorf("%s parameters require @%s task references", structuredProvider.Keyword, structuredProvider.Keyword)
	}
	if reference.Field != "" {
		return taskReference{}, fmt.Errorf("%s parameters require structured @%s task references", structuredProvider.Keyword, structuredProvider.Keyword)
	}
	reference.ParameterType = structuredProvider.ParameterType
	if err := validateTaskReference(reference, true); err != nil {
		return taskReference{}, err
	}
	return reference, nil
}

func parseExactTaskReference(value string) (taskReference, bool, error) {
	value = strings.TrimSpace(value)
	matches := taskReferenceExactPattern.FindStringSubmatch(value)
	if len(matches) == 0 || matches[0] != value {
		return taskReference{}, false, nil
	}
	keyword := strings.ToLower(strings.TrimSpace(matches[1]))
	provider, ok := getTaskReferenceProvider(keyword)
	if !ok {
		return taskReference{}, true, fmt.Errorf("unsupported task reference keyword %q", keyword)
	}
	reference, err := provider.ParseReferenceBody(matches[2], matches[0])
	if err != nil {
		return taskReference{}, true, err
	}
	reference.Keyword = keyword
	reference.Raw = matches[0]
	return reference, true, nil
}

func validateTaskReference(reference taskReference, structured bool) error {
	provider, ok := getTaskReferenceProvider(reference.Keyword)
	if !ok {
		logging.LogError(nil, "validateTaskReference", "unsupported provider", reference.Keyword)
		return fmt.Errorf("unsupported task reference keyword %q", reference.Keyword)
	}
	if err := provider.ValidateReference(reference, structured); err != nil {
		logging.LogError(err, "invalid task reference", "keyword", reference.Keyword, "selector", reference.Selector, "field", reference.Field)
		return err
	}
	if reference.Field == "" && !structured {
		return fmt.Errorf("task reference %s requires a field", reference.Raw)
	}
	return nil
}

func resolveTaskReferenceBatch(context taskReferenceResolveContext, references []taskReference) (map[taskReference]taskReferenceResolvedValue, error) {
	referencesByProvider := make(map[string][]taskReference)
	canonicalReferences := make(map[string]taskReference)
	seen := make(map[string]bool)
	for _, reference := range references {
		dedupeKey := taskReferenceDedupeKey(reference)
		if seen[dedupeKey] {
			continue
		}
		seen[dedupeKey] = true
		canonicalReferences[dedupeKey] = reference
		referencesByProvider[reference.Keyword] = append(referencesByProvider[reference.Keyword], reference)
	}
	resolved := make(map[taskReference]taskReferenceResolvedValue)
	for keyword, providerReferences := range referencesByProvider {
		provider, ok := getTaskReferenceProvider(keyword)
		if !ok {
			return nil, fmt.Errorf("unsupported task reference keyword %q", keyword)
		}
		providerResolved, err := provider.BatchResolveTaskReferences(context, providerReferences)
		if err != nil {
			return nil, err
		}
		for reference, resolvedValue := range providerResolved {
			resolved[reference] = resolvedValue
		}
	}
	for _, reference := range references {
		if _, ok := resolved[reference]; !ok {
			canonicalReference, ok := canonicalReferences[taskReferenceDedupeKey(reference)]
			if !ok {
				return nil, fmt.Errorf("failed to resolve %s", reference.Raw)
			}
			resolvedValue, ok := resolved[canonicalReference]
			if !ok {
				return nil, fmt.Errorf("failed to resolve %s", reference.Raw)
			}
			resolved[reference] = resolvedValue
		}
	}
	return resolved, nil
}

func taskReferenceDedupeKey(reference taskReference) string {
	return strings.Join([]string{reference.Keyword, reference.Selector, reference.Field, reference.ParameterType}, "\x00")
}

func taskReferenceMatchesToReferences(matches []taskReferenceMatch) []taskReference {
	references := make([]taskReference, 0, len(matches))
	for _, match := range matches {
		references = append(references, match.Reference)
	}
	return references
}

func taskReferenceScalarValuesByRaw(resolved map[taskReference]taskReferenceResolvedValue) map[string]string {
	scalars := make(map[string]string, len(resolved))
	for reference, resolvedValue := range resolved {
		if reference.Field == "" {
			continue
		}
		scalars[reference.Raw] = resolvedValue.Scalar
	}
	return scalars
}

func taskReferenceStructuredValuesByLookupKey(resolved map[taskReference]taskReferenceResolvedValue) map[string]interface{} {
	structuredValues := make(map[string]interface{}, len(resolved))
	for reference, resolvedValue := range resolved {
		if reference.Field != "" || reference.ParameterType == "" {
			continue
		}
		structuredValues[taskReferenceStructuredLookupKey(reference.Raw, reference.ParameterType)] = resolvedValue.Structured
	}
	return structuredValues
}

func taskReferenceStructuredLookupKey(raw string, parameterType string) string {
	return strings.Join([]string{strings.TrimSpace(raw), parameterType}, "\x00")
}

func buildTaskKeywordResolution(matches []taskReferenceMatch, resolved map[taskReference]taskReferenceResolvedValue) []PTTaskKeywordResolution {
	resolutionByRaw := make(map[string]*PTTaskKeywordResolution)
	order := make([]string, 0, len(matches))
	for _, match := range matches {
		resolvedValue, ok := resolved[match.Reference]
		if !ok {
			continue
		}
		entry, ok := resolutionByRaw[match.Reference.Raw]
		if !ok {
			entry = &PTTaskKeywordResolution{
				Raw:            match.Reference.Raw,
				Keyword:        match.Reference.Keyword,
				Selector:       match.Reference.Selector,
				Field:          match.Reference.Field,
				ValueType:      match.ValueType,
				ExpandedValue:  resolvedValue.Scalar,
				ParameterNames: []string{},
			}
			if match.ValueType == taskReferenceValueTypeStructured {
				entry.ExpandedValue = ""
			}
			resolutionByRaw[match.Reference.Raw] = entry
			order = append(order, match.Reference.Raw)
		}
		for _, parameterName := range match.ParameterNames {
			parameterName = strings.TrimSpace(parameterName)
			if parameterName == "" {
				continue
			}
			if !slices.Contains(entry.ParameterNames, parameterName) {
				entry.ParameterNames = append(entry.ParameterNames, parameterName)
			}
		}
	}
	sort.Strings(order)
	resolutions := make([]PTTaskKeywordResolution, 0, len(order))
	for _, raw := range order {
		sort.Strings(resolutionByRaw[raw].ParameterNames)
		resolutions = append(resolutions, *resolutionByRaw[raw])
	}
	return resolutions
}

func collectTaskReferencePostCreateActions(matches []taskReferenceMatch, resolved map[taskReference]taskReferenceResolvedValue) []taskReferencePostCreateAction {
	actions := make([]taskReferencePostCreateAction, 0)
	seen := make(map[string]bool)
	for _, match := range matches {
		resolvedValue, ok := resolved[match.Reference]
		if !ok || len(resolvedValue.PostCreateActions) == 0 {
			continue
		}
		dedupeKey := taskReferenceDedupeKey(match.Reference)
		if seen[dedupeKey] {
			continue
		}
		seen[dedupeKey] = true
		actions = append(actions, resolvedValue.PostCreateActions...)
	}
	return actions
}

func applyTaskReferencesToJSON(value interface{}, context taskReferenceResolveContext, structuredValuesByLookupKey map[string]interface{}, scalarValuesByRaw map[string]string, topLevel bool) (interface{}, bool) {
	switch typed := value.(type) {
	case map[string]interface{}:
		changed := false
		for parameterName, parameterValue := range typed {
			if topLevel {
				if structuredProvider, ok := context.StructuredParameterProviders[parameterName]; ok {
					updatedValue, structuredChanged := applyStructuredTaskReference(parameterValue, structuredProvider, structuredValuesByLookupKey)
					if structuredChanged {
						typed[parameterName] = updatedValue
						changed = true
					}
					continue
				}
			}
			updatedValue, nestedChanged := applyTaskReferencesToJSON(parameterValue, context, structuredValuesByLookupKey, scalarValuesByRaw, false)
			if nestedChanged {
				typed[parameterName] = updatedValue
				changed = true
			}
		}
		return typed, changed
	case []interface{}:
		changed := false
		for index, nestedValue := range typed {
			updatedValue, nestedChanged := applyTaskReferencesToJSON(nestedValue, context, structuredValuesByLookupKey, scalarValuesByRaw, false)
			if nestedChanged {
				typed[index] = updatedValue
				changed = true
			}
		}
		return typed, changed
	case string:
		updated, changed := applyTaskReferencesToString(typed, scalarValuesByRaw)
		return updated, changed
	default:
		return value, false
	}
}

func applyStructuredTaskReference(value interface{}, structuredProvider taskReferenceStructuredParameterProvider, structuredValuesByLookupKey map[string]interface{}) (interface{}, bool) {
	referenceValue, ok := value.(string)
	if !ok {
		return value, false
	}
	resolvedValue, ok := structuredValuesByLookupKey[taskReferenceStructuredLookupKey(referenceValue, structuredProvider.ParameterType)]
	if !ok {
		return value, false
	}
	return resolvedValue, true
}

func applyTaskReferencesToString(value string, scalarValuesByRaw map[string]string) (string, bool) {
	if len(scalarValuesByRaw) == 0 || !strings.Contains(value, "@") {
		return value, false
	}
	changed := false
	updated := taskReferenceLegacyPattern.ReplaceAllStringFunc(value, func(raw string) string {
		scalarValue, ok := scalarValuesByRaw[raw]
		if !ok {
			return raw
		}
		changed = true
		return scalarValue
	})
	return updated, changed
}
