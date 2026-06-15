package rabbitmq

import (
	"database/sql"
	"errors"
	"fmt"
	"regexp"
	"strings"

	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

const OperatorAliasMaxDepth = 5

var operatorAliasCommandRegex = regexp.MustCompile(`^[a-z][a-z0-9_-]*$`)

type OperatorAliasScope struct {
	PayloadTypeID        int
	ConsumingContainerID int
}

type OperatorAliasExpansionStep struct {
	AliasID              int    `json:"alias_id" mapstructure:"alias_id"`
	SlashCommand         string `json:"slash_command" mapstructure:"slash_command"`
	ActualCommand        string `json:"actual_command" mapstructure:"actual_command"`
	Argument             string `json:"argument" mapstructure:"argument"`
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

func NormalizeOperatorAliasCommand(command string) string {
	normalized := strings.TrimSpace(command)
	normalized = strings.TrimLeft(normalized, "/")
	normalized = strings.ToLower(strings.TrimSpace(normalized))
	return normalized
}

func IsValidOperatorAliasCommand(command string) bool {
	return operatorAliasCommandRegex.MatchString(NormalizeOperatorAliasCommand(command))
}

func ParseSlashCommandLine(line string) (string, string, bool) {
	trimmed := strings.TrimSpace(line)
	if !strings.HasPrefix(trimmed, "/") {
		return "", "", false
	}
	trimmed = strings.TrimLeft(trimmed, "/")
	if strings.TrimSpace(trimmed) == "" {
		return "", "", false
	}
	parts := strings.Fields(trimmed)
	if len(parts) == 0 {
		return "", "", false
	}
	command := NormalizeOperatorAliasCommand(parts[0])
	argument := ""
	if len(parts) > 1 {
		argument = strings.Join(parts[1:], " ")
	}
	return command, argument, command != ""
}

func ResolveOperatorAliasLineWithProvidedSlashCommands(operatorID int, scope OperatorAliasScope, line string, terminalCommands map[string]bool) (OperatorAliasResolution, error) {
	resolution := OperatorAliasResolution{
		Original:     strings.TrimSpace(line),
		Expanded:     strings.TrimSpace(line),
		Steps:        []OperatorAliasExpansionStep{},
		AliasMatched: false,
	}
	if scope.PayloadTypeID == 0 && scope.ConsumingContainerID == 0 {
		return resolution, fmt.Errorf("slash aliases require exactly one scope")
	}
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
		alias, found, err := GetActiveOperatorAlias(operatorID, scope, commandName)
		if err != nil {
			return resolution, err
		}
		if !found {
			resolution.FinalCommand = commandName
			resolution.FinalArgument = argument
			resolution.FinalIsSlash = true // ?
			return resolution, nil
		}
		if seen[alias.ID] {
			return resolution, fmt.Errorf("slash alias loop detected for /%s", alias.SlashCommand)
		}
		seen[alias.ID] = true
		expanded := alias.ActualCommand + " " + argument
		step := OperatorAliasExpansionStep{
			AliasID:              alias.ID,
			SlashCommand:         alias.SlashCommand,
			ActualCommand:        alias.ActualCommand,
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
	resolution.MaxDepthReached = true
	return resolution, fmt.Errorf("slash alias expansion exceeded maximum depth of %d", OperatorAliasMaxDepth)
}

func GetActiveOperatorAlias(operatorID int, scope OperatorAliasScope, commandName string) (databaseStructs.OperatorAlias, bool, error) {
	alias := databaseStructs.OperatorAlias{}
	normalizedCommand := NormalizeOperatorAliasCommand(commandName)
	if scope.PayloadTypeID == 0 && scope.ConsumingContainerID == 0 {
		return alias, false, fmt.Errorf("slash aliases require exactly one scope")
	}
	if normalizedCommand == "" {
		return alias, false, nil
	}
	var err error
	if scope.ConsumingContainerID > 0 {
		err = database.DB.Get(&alias, `SELECT *
			FROM operator_alias
			WHERE operator_id=$1 AND consuming_container_id=$2 AND payloadtype_id IS NULL
				AND slash_command=$3 AND active=true
			LIMIT 1`,
			operatorID, scope.ConsumingContainerID, normalizedCommand)
	} else {
		err = database.DB.Get(&alias, `SELECT *
			FROM operator_alias
			WHERE operator_id=$1 AND payloadtype_id=$2 AND consuming_container_id IS NULL
				AND slash_command=$3 AND active=true
			LIMIT 1`,
			operatorID, scope.PayloadTypeID, normalizedCommand)
	}
	if err != nil {
		if errors.Is(err, sql.ErrNoRows) {
			return alias, false, nil
		}
		return alias, false, err
	}
	return alias, true, nil
}
