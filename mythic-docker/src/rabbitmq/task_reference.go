package rabbitmq

import (
	"encoding/json"
	"fmt"
	"io"
	"regexp"
	"strings"
	"sync"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/logging"
	"github.com/jmoiron/sqlx"
)

var taskReferenceKeywordPattern = regexp.MustCompile(`@([A-Za-z][A-Za-z0-9_-]*):([A-Za-z0-9][A-Za-z0-9_-]*)(?:\.([A-Za-z][A-Za-z0-9_-]*))?`)

type taskReferenceKeyword struct {
	// keyword like the cred in @cred:12.credential
	Keyword string
	// selector like the 12 in @cred:12.credential
	Selector string
	// field like the credential in @cred:12.credential
	Field string
	// raw string like @cred:12.credential
	Raw string
}

type taskReferenceKeywordResolvedValue struct {
	Scalar     string
	Structured interface{}
}

// taskReferenceKeywordProvider allows us to resolve task references like @cred:12.credential
type taskReferenceKeywordProvider interface {
	Keyword() string
	ParameterType() string
	ValidateSelector(selector string) error
	ValidateField(field string) error
	BatchResolveTaskReferences(operationID int, references []taskReferenceKeyword) (map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, error)
}

// taskReferenceProviderRegistry maps task reference keywords (like cred) to provider that can process and resolve that data
var taskReferenceProviderRegistry = struct {
	sync.RWMutex
	providers map[string]taskReferenceKeywordProvider
}{
	providers: make(map[string]taskReferenceKeywordProvider),
}

// registerTaskReferenceKeywordProvider registers a task reference provider that can resolve task references like @cred:12.credential
func registerTaskReferenceKeywordProvider(provider taskReferenceKeywordProvider) {
	keyword := strings.ToLower(strings.TrimSpace(provider.Keyword()))
	if keyword == "" {
		return
	}
	taskReferenceProviderRegistry.Lock()
	defer taskReferenceProviderRegistry.Unlock()
	taskReferenceProviderRegistry.providers[keyword] = provider
}

// getTaskReferenceKeywordProvider returns the task reference provider for the given keyword, or false if not found
func getTaskReferenceKeywordProvider(keyword string) (taskReferenceKeywordProvider, bool) {
	taskReferenceProviderRegistry.RLock()
	defer taskReferenceProviderRegistry.RUnlock()
	provider, ok := taskReferenceProviderRegistry.providers[strings.ToLower(strings.TrimSpace(keyword))]
	return provider, ok
}

type taskReferenceResolveContext struct {
	OperationID                  int
	StructuredParameterProviders map[string]string
}

func expandTaskReferenceParameters(commandID int, operationID int, params string) (string, bool, error) {
	if commandID <= 0 || operationID <= 0 {
		logging.LogError(nil, "expandTaskReferenceParameters", "invalid command ID or operation ID")
		return params, false, nil
	}
	trimmedParams := strings.TrimSpace(params)
	if trimmedParams == "" {
		return params, false, nil
	}
	taskReferenceProviderRegistry.RLock()
	providers := make([]taskReferenceKeywordProvider, 0, len(taskReferenceProviderRegistry.providers))
	for keyword := range taskReferenceProviderRegistry.providers {
		providers = append(providers, taskReferenceProviderRegistry.providers[keyword])
	}
	taskReferenceProviderRegistry.RUnlock()
	context := taskReferenceResolveContext{
		OperationID:                  operationID,
		StructuredParameterProviders: make(map[string]string),
	}

	providersByParameterType := make(map[string]taskReferenceKeywordProvider)
	parameterTypes := make([]string, 0, len(providers))
	for _, provider := range providers {
		parameterType := strings.TrimSpace(provider.ParameterType())
		if parameterType == "" {
			continue
		}
		if _, exists := providersByParameterType[parameterType]; !exists {
			parameterTypes = append(parameterTypes, parameterType)
		}
		providersByParameterType[parameterType] = provider
	}
	if len(parameterTypes) > 0 {
		// Provider parameter types tell us which top-level command parameters can
		// accept a bare structured reference like @cred:<id>.
		structuredParameters := []databaseStructs.Commandparameters{}
		query, args, err := sqlx.In(`SELECT
				DISTINCT ON ("name")
				"name", display_name, cli_name, "type"
				FROM commandparameters
				WHERE command_id=? AND "type" IN (?)`,
			commandID, parameterTypes)
		if err != nil {
			logging.LogError(err, "expandTaskReferenceParameters", "failed to build parameter query")
			return params, false, fmt.Errorf("failed to build parameter query: %w", err)
		}
		query = database.DB.Rebind(query)
		err = database.DB.Select(&structuredParameters, query, args...)
		if err != nil {
			logging.LogError(err, "expandTaskReferenceParameters", "failed to query parameters")
			return params, false, fmt.Errorf("failed to query parameters: %w", err)
		}
		for _, parameter := range structuredParameters {
			provider, ok := providersByParameterType[parameter.Type]
			if !ok {
				continue
			}
			for _, paramKey := range []string{parameter.Name, parameter.CliName, parameter.DisplayName} {
				if strings.TrimSpace(paramKey) != "" {
					// This gives us a mapping like {"myParameterName": "cred"}.
					context.StructuredParameterProviders[paramKey] = provider.Keyword()
				}
			}
		}
	}

	return resolveTaskReferencesInParams(params, context)
}

func resolveTaskReferencesInParams(params string, context taskReferenceResolveContext) (string, bool, error) {
	if strings.TrimSpace(params) == "" {
		return params, false, nil
	}
	decoder := json.NewDecoder(strings.NewReader(params))
	decoder.UseNumber()
	var decoded interface{}
	if err := decoder.Decode(&decoded); err == nil {
		err = decoder.Decode(&struct{}{})
		// make sure that we have proper json to parse JSON vs raw string
		if err != io.EOF {
			return params, false, fmt.Errorf("failed to parse task parameters as a single JSON value")
		}
		// find all references
		references, err := collectTaskReferencesFromJSON(decoded, context, true)
		if err != nil {
			return params, false, err
		}
		if len(references) == 0 {
			return params, false, nil
		}
		// resolve references to actual values
		resolved, err := resolveTaskReferenceBatch(context.OperationID, references)
		if err != nil {
			return params, false, err
		}
		// apply resolved references to the original JSON
		updated, changed, err := applyTaskReferencesToJSON(decoded, context, resolved, true)
		if err != nil {
			return params, false, err
		}
		if !changed {
			return params, false, nil
		}
		updatedBytes, err := json.Marshal(updated)
		if err != nil {
			return params, false, fmt.Errorf("failed to serialize task parameters after reference resolution: %w", err)
		}
		return string(updatedBytes), true, nil
	}

	references, err := collectTaskReferencesFromString(params, false)
	if err != nil {
		return params, false, err
	}
	if len(references) == 0 {
		return params, false, nil
	}
	resolved, err := resolveTaskReferenceBatch(context.OperationID, references)
	if err != nil {
		return params, false, err
	}
	updated, changed, err := applyTaskReferencesToString(params, resolved, false)
	if err != nil {
		return params, false, err
	}
	return updated, changed, nil
}

func collectTaskReferencesFromJSON(value interface{}, context taskReferenceResolveContext, topLevel bool) ([]taskReferenceKeyword, error) {
	switch typed := value.(type) {
	case map[string]interface{}:
		// check if we were given structured map[string]interface{} data from the agent
		references := make([]taskReferenceKeyword, 0)
		for key, nestedValue := range typed {
			// iterate over the agent's structured data looking at the parameter name (key)
			if topLevel {
				if providerKeyword := context.StructuredParameterProviders[key]; providerKeyword != "" {
					// if that structured data's parameter name maps back to a parameter we know about that supports some keyword provider
					// track the referenceValue as some potential to be a value like @cred:12.credential
					referenceValue, ok := nestedValue.(string)
					if !ok {
						// if the value isn't a string, bail because it's supposed to be a string value
						return nil, fmt.Errorf("%s parameters require %s task references", providerKeyword, providerKeyword)
					}
					// check if reference value is an exact match for our special formatting
					reference, ok := parseExactTaskReference(referenceValue)
					if !ok || reference.Field != "" || strings.ToLower(reference.Keyword) != providerKeyword {
						// if it's not an exact match, if you tried to supply @cred:12.credential when we need @cred:12
						// or if the regex matched a keyword that we're not looking for, bail
						return nil, fmt.Errorf("%s parameters require @%s:<id> task references", providerKeyword, providerKeyword)
					}
					// make sure our reference is valid for the parameter type (structured = no field specified)
					err := validateTaskReference(reference, true)
					if err != nil {
						return nil, err
					}
					// if it's all good, then we found a valid reference
					references = append(references, reference)
					continue
				}
			}
			// see if we're looking at any nested keys
			nestedReferences, err := collectTaskReferencesFromJSON(nestedValue, context, false)
			if err != nil {
				return nil, err
			}
			// append all references
			references = append(references, nestedReferences...)
		}
		return references, nil
	case []interface{}:
		references := make([]taskReferenceKeyword, 0)
		for _, nestedValue := range typed {
			nestedReferences, err := collectTaskReferencesFromJSON(nestedValue, context, false)
			if err != nil {
				return nil, err
			}
			references = append(references, nestedReferences...)
		}
		return references, nil
	case string:
		// if the value from the agent is a string, do a special check
		return collectTaskReferencesFromString(typed, false)
	default:
		return nil, nil
	}
}

func collectTaskReferencesFromString(value string, includeBare bool) ([]taskReferenceKeyword, error) {
	matches := taskReferenceKeywordPattern.FindAllStringSubmatch(value, -1)
	if matches == nil || len(matches) == 0 {
		return nil, nil
	}
	references := make([]taskReferenceKeyword, 0, len(matches))
	for _, match := range matches {
		reference := taskReferenceKeyword{
			Raw:      match[0],                  // full match like @cred:12.credential
			Keyword:  strings.ToLower(match[1]), // cred in @cred:12.credential
			Selector: match[2],                  // 12 in @cred:12.credential
		}
		if len(match) > 3 {
			reference.Field = strings.ToLower(match[3]) // credential in @cred:12.credential
		}
		if reference.Field == "" && !includeBare {
			// includeBare means without field, so you'd get the full JSON dict spliced in eventually
			continue
		}
		err := validateTaskReference(reference, reference.Field == "")
		if err != nil {
			return nil, err
		}
		references = append(references, reference)
	}
	return references, nil
}

func parseExactTaskReference(value string) (taskReferenceKeyword, bool) {
	value = strings.TrimSpace(value)
	matches := taskReferenceKeywordPattern.FindStringSubmatch(value)
	if len(matches) == 0 || matches[0] != value {
		// looking for exact matches, so if the first match isn't the full value, we have a problem
		return taskReferenceKeyword{}, false
	}
	reference := taskReferenceKeyword{
		Raw:      matches[0],                  // @cred:12.credential
		Keyword:  strings.ToLower(matches[1]), // cred
		Selector: matches[2],                  // 12
	}
	if len(matches) > 3 {
		reference.Field = strings.ToLower(matches[3]) // credential
	}
	return reference, true
}

func validateTaskReference(reference taskReferenceKeyword, structured bool) error {
	provider, ok := getTaskReferenceKeywordProvider(reference.Keyword)
	if !ok {
		logging.LogError(nil, "validateTaskReference", "unsupported provider", reference.Keyword)
		return fmt.Errorf("unsupported task reference keyword %q", reference.Keyword)
	}
	// validate that the selector we're trying to access is a valid value and not like @cred:bob
	err := provider.ValidateSelector(reference.Selector)
	if err != nil {
		logging.LogError(err, "invalid reference selector", "keyword", reference.Keyword, "selector", reference.Selector)
		return fmt.Errorf("invalid %s reference selector %q: %w", reference.Keyword, reference.Selector, err)
	}
	if reference.Field == "" {
		if !structured {
			// nonstructured reference (i.e. a reference in a string and not a sole parameter) needs a field
			return fmt.Errorf("task reference %s requires a field", reference.Raw)
		}
		return nil
	}
	// check if the field supplied makes sense for the provider - don't need @cred:12.username when it should be .account
	err = provider.ValidateField(reference.Field)
	if err != nil {
		logging.LogError(err, "invalid reference field", "keyword", reference.Keyword, "field", reference.Field)
		return fmt.Errorf("invalid %s reference field %q: %w", reference.Keyword, reference.Field, err)
	}
	return nil
}

func resolveTaskReferenceBatch(operationID int, references []taskReferenceKeyword) (map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, error) {
	referencesByProvider := make(map[string][]taskReferenceKeyword)
	seen := make(map[string]bool)
	// group references by provider
	for _, reference := range references {
		if seen[reference.Raw] {
			continue
		}
		seen[reference.Raw] = true
		referencesByProvider[reference.Keyword] = append(referencesByProvider[reference.Keyword], reference)
	}
	resolved := make(map[taskReferenceKeyword]taskReferenceKeywordResolvedValue)
	for keyword, providerReferences := range referencesByProvider {
		provider, ok := getTaskReferenceKeywordProvider(keyword)
		if !ok {
			return nil, fmt.Errorf("unsupported task reference keyword %q", keyword)
		}
		providerResolved, err := provider.BatchResolveTaskReferences(operationID, providerReferences)
		if err != nil {
			return nil, err
		}
		// update resolved tracking with values from one provider, then move to the next provider
		for reference, resolvedValue := range providerResolved {
			resolved[reference] = resolvedValue
		}
	}
	return resolved, nil
}

func applyTaskReferencesToJSON(value interface{}, context taskReferenceResolveContext, resolved map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, topLevel bool) (interface{}, bool, error) {
	switch typed := value.(type) {
	case map[string]interface{}:
		changed := false
		for parameterName, parameterValue := range typed {
			// looping through the tasking parameters
			if topLevel {
				if providerKeyword := context.StructuredParameterProviders[parameterName]; providerKeyword != "" {
					referenceValue, ok := parameterValue.(string)
					if !ok {
						return value, false, fmt.Errorf("%s parameters require @%s:<id> task references", providerKeyword, providerKeyword)
					}
					reference, ok := parseExactTaskReference(referenceValue)
					if !ok || reference.Field != "" || reference.Keyword != providerKeyword {
						return value, false, fmt.Errorf("%s parameters require @%s:<id> task references", providerKeyword, providerKeyword)
					}
					resolvedValue, ok := resolved[reference]
					if !ok {
						return value, false, fmt.Errorf("failed to resolve %s", reference.Raw)
					}
					typed[parameterName] = resolvedValue.Structured
					changed = true
					continue
				}
			}
			updatedValue, nestedChanged, err := applyTaskReferencesToJSON(parameterValue, context, resolved, false)
			if err != nil {
				return value, false, err
			}
			if nestedChanged {
				typed[parameterName] = updatedValue
				changed = true
			}
		}
		return typed, changed, nil
	case []interface{}:
		changed := false
		for index, nestedValue := range typed {
			updatedValue, nestedChanged, err := applyTaskReferencesToJSON(nestedValue, context, resolved, false)
			if err != nil {
				return value, false, err
			}
			if nestedChanged {
				typed[index] = updatedValue
				changed = true
			}
		}
		return typed, changed, nil
	case string:
		return applyTaskReferencesToString(typed, resolved, false)
	default:
		return value, false, nil
	}
}

func applyTaskReferencesToString(value string, resolved map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, includeBare bool) (string, bool, error) {
	changed := false
	var applyErr error
	updated := taskReferenceKeywordPattern.ReplaceAllStringFunc(value, func(raw string) string {
		if applyErr != nil {
			return raw
		}
		reference, ok := parseExactTaskReference(raw)
		if !ok {
			return raw
		}
		if reference.Field == "" && !includeBare {
			return raw
		}
		resolvedValue, ok := resolved[reference]
		if !ok {
			applyErr = fmt.Errorf("failed to resolve %s", raw)
			return raw
		}
		changed = true
		return resolvedValue.Scalar
	})
	if applyErr != nil {
		return value, false, applyErr
	}
	return updated, changed, nil
}
