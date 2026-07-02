package rabbitmq

import (
	"database/sql"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"regexp"
	"strings"
	"sync"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

const (
	OperatorAliasMaxDepth    = 5
	OperatorAliasTypeCommand = "command"
	OperatorAliasTypeGeneric = "generic"
)

var (
	operatorAliasNameRegex      = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)
	operatorAliasReferenceRegex = regexp.MustCompile(`(^|[^A-Za-z0-9_-])@([A-Za-z][A-Za-z0-9_-]*)`)
	operatorAliasReservedNames  = struct {
		sync.RWMutex
		names map[string]bool
	}{
		names: map[string]bool{},
	}
)

type OperatorAliasScope struct {
	PayloadTypeID        int
	ConsumingContainerID int
}

type OperatorAliasExpansionStep struct {
	AliasID              int    `json:"alias_id" mapstructure:"alias_id"`
	Name                 string `json:"name" mapstructure:"name"`
	Alias                string `json:"alias" mapstructure:"alias"`
	AliasType            string `json:"alias_type" mapstructure:"alias_type"`
	Argument             string `json:"argument,omitempty" mapstructure:"argument"`
	Input                string `json:"input" mapstructure:"input"`
	Expanded             string `json:"expanded" mapstructure:"expanded"`
	PayloadTypeID        int    `json:"payloadtype_id,omitempty" mapstructure:"payloadtype_id"`
	ConsumingContainerID int    `json:"consuming_container_id,omitempty" mapstructure:"consuming_container_id"`
}

type OperatorAliasResolution struct {
	Original        string                       `json:"original" mapstructure:"original"`
	Expanded        string                       `json:"expanded" mapstructure:"expanded"`
	Steps           []OperatorAliasExpansionStep `json:"steps" mapstructure:"steps"`
	AliasMatched    bool                         `json:"alias_matched" mapstructure:"alias_matched"`
	FinalCommand    string                       `json:"final_command,omitempty" mapstructure:"final_command"`
	FinalArgument   string                       `json:"final_argument,omitempty" mapstructure:"final_argument"`
	FinalIsSlash    bool                         `json:"final_is_slash" mapstructure:"final_is_slash"`
	MaxDepthReached bool                         `json:"max_depth_reached" mapstructure:"max_depth_reached"`
}

type ChatSlashCommandInvocation struct {
	Name     string `json:"name" mapstructure:"name"`
	Argument string `json:"argument" mapstructure:"argument"`
	Raw      string `json:"raw" mapstructure:"raw"`
	Source   string `json:"source" mapstructure:"source"`
}

type operatorAliasLookupResult struct {
	Alias databaseStructs.OperatorAlias
	Found bool
}

type operatorAliasLookupCache map[string]operatorAliasLookupResult

func NormalizeOperatorAliasName(name string) string {
	normalized := strings.TrimSpace(name)
	normalized = strings.TrimLeft(normalized, "/@")
	normalized = strings.ToLower(strings.TrimSpace(normalized))
	return normalized
}

func IsValidOperatorAliasName(name string) bool {
	return operatorAliasNameRegex.MatchString(NormalizeOperatorAliasName(name))
}

func NormalizeOperatorAliasType(aliasType string) string {
	normalized := strings.ToLower(strings.TrimSpace(aliasType))
	if normalized == "" {
		return OperatorAliasTypeCommand
	}
	return normalized
}

func IsValidOperatorAliasType(aliasType string) bool {
	switch NormalizeOperatorAliasType(aliasType) {
	case OperatorAliasTypeCommand, OperatorAliasTypeGeneric:
		return true
	default:
		return false
	}
}

func RegisterReservedOperatorAliasName(name string) {
	normalized := NormalizeOperatorAliasName(name)
	if normalized == "" {
		return
	}
	operatorAliasReservedNames.Lock()
	defer operatorAliasReservedNames.Unlock()
	operatorAliasReservedNames.names[normalized] = true
}

func IsReservedOperatorAliasName(name string) bool {
	normalized := NormalizeOperatorAliasName(name)
	if normalized == "" {
		return false
	}
	operatorAliasReservedNames.RLock()
	reserved := operatorAliasReservedNames.names[normalized]
	operatorAliasReservedNames.RUnlock()
	if reserved {
		return true
	}
	_, found := getTaskReferenceProvider(normalized)
	return found
}

func ParseSlashCommandLine(line string) (string, string, bool) {
	trimmed := strings.TrimSpace(line)
	if !strings.HasPrefix(trimmed, "/") {
		return "", "", false
	}
	trimmed = strings.TrimLeft(trimmed, "/")
	return parseOperatorAliasCommandLine(trimmed)
}

func ParseOperatorAliasCommandLine(line string) (string, string, bool) {
	return parseOperatorAliasCommandLine(strings.TrimSpace(line))
}

func parseOperatorAliasCommandLine(line string) (string, string, bool) {
	trimmed := strings.TrimSpace(line)
	if trimmed == "" {
		return "", "", false
	}
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "", "", false
	}
	command := NormalizeOperatorAliasName(parts[0])
	argument := ""
	if len(trimmed) > len(parts[0]) {
		argument = strings.TrimSpace(trimmed[len(parts[0]):])
	}
	return command, argument, command != ""
}

func ResolveOperatorAliasLineWithProvidedSlashCommands(operatorID int, scope OperatorAliasScope, line string, terminalCommands map[string]bool) (OperatorAliasResolution, error) {
	resolution := newOperatorAliasResolution(line)
	seen := map[int]bool{}
	for depth := 0; depth < OperatorAliasMaxDepth; depth++ {
		commandName, argument, ok := ParseSlashCommandLine(resolution.Expanded)
		if !ok {
			resolution.FinalIsSlash = false
			return resolution, nil
		}
		if terminalCommands != nil && terminalCommands[commandName] {
			resolution.FinalCommand = commandName
			resolution.FinalArgument = argument
			resolution.FinalIsSlash = true
			return resolution, nil
		}
		alias, found, err := GetActiveOperatorAlias(operatorID, scope, OperatorAliasTypeCommand, commandName)
		if err != nil {
			return resolution, err
		}
		if !found {
			resolution.FinalCommand = commandName
			resolution.FinalArgument = argument
			resolution.FinalIsSlash = true
			return resolution, nil
		}
		if seen[alias.ID] {
			return resolution, fmt.Errorf("command alias loop detected for %s", alias.Name)
		}
		seen[alias.ID] = true
		resolution.addStep(alias, argument, buildOperatorAliasExpandedLine(alias.Alias, argument))
	}
	resolution.MaxDepthReached = true
	return resolution, fmt.Errorf("command alias expansion exceeded maximum depth of %d", OperatorAliasMaxDepth)
}

func ResolveOperatorAliasCommandLineWithTerminalCommands(operatorID int, scope OperatorAliasScope, line string, terminalCommands map[string]bool) (OperatorAliasResolution, error) {
	resolution := newOperatorAliasResolution(line)
	seen := map[int]bool{}
	for depth := 0; depth < OperatorAliasMaxDepth; depth++ {
		commandName, argument, ok := ParseOperatorAliasCommandLine(resolution.Expanded)
		if !ok {
			return resolution, nil
		}
		if terminalCommands != nil && terminalCommands[commandName] {
			resolution.FinalCommand = commandName
			resolution.FinalArgument = argument
			return resolution, nil
		}
		alias, found, err := GetActiveOperatorAlias(operatorID, scope, OperatorAliasTypeCommand, commandName)
		if err != nil {
			return resolution, err
		}
		if !found {
			resolution.FinalCommand = commandName
			resolution.FinalArgument = argument
			return resolution, nil
		}
		if seen[alias.ID] {
			return resolution, fmt.Errorf("command alias loop detected for %s", alias.Name)
		}
		seen[alias.ID] = true
		resolution.addStep(alias, argument, buildOperatorAliasExpandedLine(alias.Alias, argument))
	}
	resolution.MaxDepthReached = true
	return resolution, fmt.Errorf("command alias expansion exceeded maximum depth of %d", OperatorAliasMaxDepth)
}

func ResolveOperatorGenericAliasesInParams(operatorID int, scope OperatorAliasScope, params string) (string, bool, *OperatorAliasResolution, error) {
	if strings.TrimSpace(params) == "" || !strings.Contains(params, "@") {
		return params, false, nil, nil
	}
	// Keep lookup caching scoped to one expansion request so mass tasking avoids
	// repeated DB reads without sharing stale alias state across tasks.
	lookupCache := operatorAliasLookupCache{}
	decoder := json.NewDecoder(strings.NewReader(params))
	decoder.UseNumber()
	var decoded interface{}
	if err := decoder.Decode(&decoded); err == nil {
		if err = decoder.Decode(&struct{}{}); err != io.EOF {
			return params, false, nil, fmt.Errorf("failed to parse alias parameters as a single JSON value")
		}
		resolution := newOperatorAliasResolution(params)
		updated, changed, err := resolveOperatorGenericAliasesInJSON(operatorID, scope, decoded, &resolution, lookupCache)
		if err != nil {
			return params, false, nil, err
		}
		if !changed {
			return params, false, nil, nil
		}
		updatedBytes, err := json.Marshal(updated)
		if err != nil {
			return params, false, nil, fmt.Errorf("failed to serialize parameters after alias expansion: %w", err)
		}
		resolution.Expanded = string(updatedBytes)
		return string(updatedBytes), true, &resolution, nil
	}
	updated, changed, resolution, err := resolveOperatorGenericAliasesInString(operatorID, scope, params, lookupCache)
	if err != nil || !changed {
		return params, false, nil, err
	}
	return updated, true, resolution, nil
}

func ResolveOperatorGenericAliasesInString(operatorID int, scope OperatorAliasScope, value string) (string, bool, *OperatorAliasResolution, error) {
	if strings.TrimSpace(value) == "" || !strings.Contains(value, "@") {
		return value, false, nil, nil
	}
	return resolveOperatorGenericAliasesInString(operatorID, scope, value, operatorAliasLookupCache{})
}

func resolveOperatorGenericAliasesInString(operatorID int, scope OperatorAliasScope, value string, lookupCache operatorAliasLookupCache) (string, bool, *OperatorAliasResolution, error) {
	resolution := newOperatorAliasResolution(value)
	for depth := 0; depth < OperatorAliasMaxDepth; depth++ {
		updated, changed, err := expandOperatorGenericAliasesOnce(operatorID, scope, resolution.Expanded, &resolution, lookupCache)
		if err != nil {
			return value, false, nil, err
		}
		if !changed {
			if !resolution.AliasMatched {
				return value, false, nil, nil
			}
			return resolution.Expanded, true, &resolution, nil
		}
		resolution.Expanded = updated
	}
	resolution.MaxDepthReached = true
	return value, false, &resolution, fmt.Errorf("generic alias expansion exceeded maximum depth of %d", OperatorAliasMaxDepth)
}

func MergeOperatorAliasResolution(existing *OperatorAliasResolution, next *OperatorAliasResolution) *OperatorAliasResolution {
	if next == nil || !next.AliasMatched {
		return existing
	}
	if existing == nil {
		return next
	}
	if !existing.AliasMatched {
		if existing.Original == "" {
			existing.Original = next.Original
		}
		existing.Expanded = next.Expanded
		existing.Steps = append(existing.Steps, next.Steps...)
		existing.AliasMatched = true
		existing.FinalCommand = next.FinalCommand
		existing.FinalArgument = next.FinalArgument
		existing.FinalIsSlash = next.FinalIsSlash
		existing.MaxDepthReached = next.MaxDepthReached
		return existing
	}
	existing.Steps = append(existing.Steps, next.Steps...)
	existing.Expanded = next.Expanded
	existing.AliasMatched = true
	existing.MaxDepthReached = existing.MaxDepthReached || next.MaxDepthReached
	return existing
}

func GetActiveOperatorAlias(operatorID int, scope OperatorAliasScope, aliasType string, name string) (databaseStructs.OperatorAlias, bool, error) {
	alias := databaseStructs.OperatorAlias{}
	normalizedName := NormalizeOperatorAliasName(name)
	normalizedType := NormalizeOperatorAliasType(aliasType)
	if normalizedName == "" {
		return alias, false, nil
	}
	var err error
	if scope.ConsumingContainerID > 0 {
		err = database.DB.Get(&alias, `SELECT *
			FROM operator_alias
			WHERE operator_id=$1 AND alias_type=$2 AND name=$3 AND active=true
				AND payloadtype_id IS NULL
				AND (consuming_container_id=$4 OR consuming_container_id IS NULL)
			ORDER BY CASE WHEN consuming_container_id=$4 THEN 0 ELSE 1 END
			LIMIT 1`,
			operatorID, normalizedType, normalizedName, scope.ConsumingContainerID)
	} else if scope.PayloadTypeID > 0 {
		err = database.DB.Get(&alias, `SELECT *
			FROM operator_alias
			WHERE operator_id=$1 AND alias_type=$2 AND name=$3 AND active=true
				AND consuming_container_id IS NULL
				AND (payloadtype_id=$4 OR payloadtype_id IS NULL)
			ORDER BY CASE WHEN payloadtype_id=$4 THEN 0 ELSE 1 END
			LIMIT 1`,
			operatorID, normalizedType, normalizedName, scope.PayloadTypeID)
	} else {
		err = database.DB.Get(&alias, `SELECT *
			FROM operator_alias
			WHERE operator_id=$1 AND alias_type=$2 AND name=$3 AND active=true
				AND payloadtype_id IS NULL AND consuming_container_id IS NULL
			LIMIT 1`,
			operatorID, normalizedType, normalizedName)
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return alias, false, nil
		}
		return alias, false, err
	}
	return alias, true, nil
}

func newOperatorAliasResolution(value string) OperatorAliasResolution {
	return OperatorAliasResolution{
		Original:     strings.TrimSpace(value),
		Expanded:     strings.TrimSpace(value),
		Steps:        []OperatorAliasExpansionStep{},
		AliasMatched: false,
	}
}

func (resolution *OperatorAliasResolution) addStep(alias databaseStructs.OperatorAlias, argument string, expanded string) {
	step := OperatorAliasExpansionStep{
		AliasID:              alias.ID,
		Name:                 alias.Name,
		Alias:                alias.Alias,
		AliasType:            alias.AliasType,
		Argument:             argument,
		Input:                resolution.Expanded,
		Expanded:             expanded,
		PayloadTypeID:        int(alias.PayloadTypeID.Int64),
		ConsumingContainerID: int(alias.ConsumingContainerID.Int64),
	}
	resolution.Steps = append(resolution.Steps, step)
	resolution.AliasMatched = true
	resolution.Expanded = expanded
}

func buildOperatorAliasExpandedLine(alias string, argument string) string {
	return strings.TrimSpace(strings.TrimSpace(alias) + " " + strings.TrimSpace(argument))
}

func resolveOperatorGenericAliasesInJSON(operatorID int, scope OperatorAliasScope, value interface{}, resolution *OperatorAliasResolution, lookupCache operatorAliasLookupCache) (interface{}, bool, error) {
	switch typed := value.(type) {
	case map[string]interface{}:
		changed := false
		for key, nestedValue := range typed {
			updatedValue, nestedChanged, err := resolveOperatorGenericAliasesInJSON(operatorID, scope, nestedValue, resolution, lookupCache)
			if err != nil {
				return value, false, err
			}
			if nestedChanged {
				typed[key] = updatedValue
				changed = true
			}
		}
		return typed, changed, nil
	case []interface{}:
		changed := false
		for index, nestedValue := range typed {
			updatedValue, nestedChanged, err := resolveOperatorGenericAliasesInJSON(operatorID, scope, nestedValue, resolution, lookupCache)
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
		if !strings.Contains(typed, "@") {
			return value, false, nil
		}
		updated, changed, stringResolution, err := resolveOperatorGenericAliasesInString(operatorID, scope, typed, lookupCache)
		if err != nil || !changed {
			return value, false, err
		}
		MergeOperatorAliasResolution(resolution, stringResolution)
		return updated, true, nil
	default:
		return value, false, nil
	}
}

func expandOperatorGenericAliasesOnce(operatorID int, scope OperatorAliasScope, value string, resolution *OperatorAliasResolution, lookupCache operatorAliasLookupCache) (string, bool, error) {
	matches := operatorAliasReferenceRegex.FindAllStringSubmatchIndex(value, -1)
	if len(matches) == 0 {
		return value, false, nil
	}
	var builder strings.Builder
	lastIndex := 0
	changed := false
	for _, match := range matches {
		if len(match) < 6 {
			continue
		}
		nameStart := match[4]
		nameEnd := match[5]
		aliasStart := nameStart - 1
		if nameEnd < len(value) && value[nameEnd] == ':' {
			continue
		}
		raw := value[aliasStart:nameEnd]
		name := NormalizeOperatorAliasName(value[nameStart:nameEnd])
		if IsReservedOperatorAliasName(name) {
			continue
		}
		alias, found, err := getCachedActiveOperatorAlias(operatorID, scope, OperatorAliasTypeGeneric, name, lookupCache)
		if err != nil {
			return value, false, err
		}
		if !found {
			return value, false, fmt.Errorf("unknown generic alias %s", raw)
		}
		builder.WriteString(value[lastIndex:aliasStart])
		builder.WriteString(alias.Alias)
		step := OperatorAliasExpansionStep{
			AliasID:              alias.ID,
			Name:                 alias.Name,
			Alias:                alias.Alias,
			AliasType:            alias.AliasType,
			Input:                value,
			Expanded:             alias.Alias,
			PayloadTypeID:        int(alias.PayloadTypeID.Int64),
			ConsumingContainerID: int(alias.ConsumingContainerID.Int64),
		}
		resolution.Steps = append(resolution.Steps, step)
		resolution.AliasMatched = true
		changed = true
		lastIndex = nameEnd
	}
	if !changed {
		return value, false, nil
	}
	builder.WriteString(value[lastIndex:])
	return builder.String(), true, nil
}

func getCachedActiveOperatorAlias(operatorID int, scope OperatorAliasScope, aliasType string, name string, lookupCache operatorAliasLookupCache) (databaseStructs.OperatorAlias, bool, error) {
	if lookupCache == nil {
		return GetActiveOperatorAlias(operatorID, scope, aliasType, name)
	}
	cacheKey := strings.Join([]string{
		fmt.Sprintf("%d", operatorID),
		fmt.Sprintf("%d", scope.PayloadTypeID),
		fmt.Sprintf("%d", scope.ConsumingContainerID),
		NormalizeOperatorAliasType(aliasType),
		NormalizeOperatorAliasName(name),
	}, "\x00")
	if cached, ok := lookupCache[cacheKey]; ok {
		return cached.Alias, cached.Found, nil
	}
	alias, found, err := GetActiveOperatorAlias(operatorID, scope, aliasType, name)
	if err != nil {
		return alias, found, err
	}
	lookupCache[cacheKey] = operatorAliasLookupResult{
		Alias: alias,
		Found: found,
	}
	return alias, found, nil
}
