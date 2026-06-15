package rabbitmq

import (
	"encoding/json"
	"reflect"
	"strings"
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestOperatorAliasCommandNormalization(t *testing.T) {
	tests := []struct {
		input    string
		expected string
		valid    bool
	}{
		{input: "/Test", expected: "test", valid: true},
		{input: "  ///Alias_Name-1  ", expected: "alias_name-1", valid: true},
		{input: "/1bad", expected: "1bad", valid: false},
		{input: "/bad value", expected: "bad value", valid: false},
	}
	for _, test := range tests {
		if got := NormalizeOperatorAliasCommand(test.input); got != test.expected {
			t.Fatalf("NormalizeOperatorAliasCommand(%q) = %q, want %q", test.input, got, test.expected)
		}
		if got := IsValidOperatorAliasCommand(test.input); got != test.valid {
			t.Fatalf("IsValidOperatorAliasCommand(%q) = %v, want %v", test.input, got, test.valid)
		}
	}
}

func TestParseSlashCommandLine(t *testing.T) {
	command, argument, ok := ParseSlashCommandLine("  /TEST one string arg  ")
	if !ok {
		t.Fatalf("expected slash command to parse")
	}
	if command != "test" {
		t.Fatalf("command = %q, want test", command)
	}
	if argument != "one string arg" {
		t.Fatalf("argument = %q, want one string arg", argument)
	}
	_, _, ok = ParseSlashCommandLine("not a slash command")
	if ok {
		t.Fatalf("expected non-slash input to not parse")
	}
}

func TestBuildAndSplitOperatorAliasExpansion(t *testing.T) {
	command, params, err := SplitOperatorAliasExpandedTaskLine("shell whoami")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if command != "shell" {
		t.Fatalf("command = %q, want shell", command)
	}
	if params != "whoami" {
		t.Fatalf("params = %q, want whoami", params)
	}
	command, params, err = SplitOperatorAliasExpandedTaskLine("/shell whoami")
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if command != "shell" || params != "whoami" {
		t.Fatalf("slash command split = %q %q, want shell whoami", command, params)
	}
}

func TestSplitOperatorAliasExpandedTaskLineLeavesValidJSONParams(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "path", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
	}
	rawParams := `{"path":"C:\\Temp\\test.txt"}`
	command, params, err := SplitOperatorAliasExpandedTaskLine("upload "+rawParams, parameters)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if command != "upload" {
		t.Fatalf("command = %q, want upload", command)
	}
	if params != rawParams {
		t.Fatalf("params = %q, want unchanged JSON %q", params, rawParams)
	}
}

func TestSplitOperatorAliasExpandedTaskLineParsesNamedArguments(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "path", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
		{CliName: "count", Type: COMMAND_PARAMETER_TYPE_NUMBER, ParameterGroupName: "Default", UiPosition: 2},
		{CliName: "force", Type: COMMAND_PARAMETER_TYPE_BOOLEAN, ParameterGroupName: "Default", UiPosition: 3},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`upload -path "/tmp/a b" -count 3 -force false`, parameters)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"path":  "/tmp/a b",
		"count": float64(3),
		"force": false,
	})
}

func TestSplitOperatorAliasExpandedTaskLineFillsPositionalsByUIPosition(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "count", Type: COMMAND_PARAMETER_TYPE_NUMBER, ParameterGroupName: "Default", UiPosition: 2},
		{CliName: "path", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`upload "/tmp/a b" 7`, parameters)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"path":  "/tmp/a b",
		"count": float64(7),
	})
}

func TestSplitOperatorAliasExpandedTaskLineParsesArrayAndTypedArray(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "items", Type: COMMAND_PARAMETER_TYPE_ARRAY, ParameterGroupName: "Default", UiPosition: 1},
		{CliName: "typed", Type: COMMAND_PARAMETER_TYPE_TYPED_ARRAY, ParameterGroupName: "Default", UiPosition: 2},
		{CliName: "enabled", Type: COMMAND_PARAMETER_TYPE_BOOLEAN, ParameterGroupName: "Default", UiPosition: 3},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`collect -items one two -typed alpha beta -enabled true`, parameters)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"items":   []interface{}{"one", "two"},
		"typed":   []interface{}{[]interface{}{"", "alpha"}, []interface{}{"", "beta"}},
		"enabled": true,
	})
}

func TestSplitOperatorAliasExpandedTaskLinePrimitiveJSONFallsThrough(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "enabled", Type: COMMAND_PARAMETER_TYPE_BOOLEAN, ParameterGroupName: "Default", UiPosition: 1},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`toggle true`, parameters)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"enabled": true,
	})
}

func TestSplitOperatorAliasExpandedTaskLineBlocksInvalidParsedAliases(t *testing.T) {
	tests := []struct {
		name       string
		line       string
		parameters []databaseStructs.Commandparameters
		errorText  string
	}{
		{
			name: "ambiguous parameter groups",
			line: `run value`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "first", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "GroupA", UiPosition: 1},
				{CliName: "second", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "GroupB", UiPosition: 1},
			},
			errorText: "parameter group is ambiguous",
		},
		{
			name: "invalid file uuid",
			line: `upload -file not-a-uuid`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "file", Type: COMMAND_PARAMETER_TYPE_FILE, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "uploaded file UUID",
		},
		{
			name: "invalid number",
			line: `sleep -seconds abc`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "seconds", Type: COMMAND_PARAMETER_TYPE_NUMBER, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "failed to parse number",
		},
		{
			name: "unmatched quote",
			line: `echo "hello`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "text", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "matching double quote",
		},
		{
			name: "trailing positional after choose one",
			line: `echo -mode hello extra`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "mode", Type: COMMAND_PARAMETER_TYPE_CHOOSE_ONE, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "too many positional arguments",
		},
		{
			name: "trailing positional after number",
			line: `sleep -seconds 5 extra`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "seconds", Type: COMMAND_PARAMETER_TYPE_NUMBER, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "too many positional arguments",
		},
		{
			name: "trailing positional after boolean",
			line: `toggle -enabled true extra`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "enabled", Type: COMMAND_PARAMETER_TYPE_BOOLEAN, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "too many positional arguments",
		},
		{
			name: "trailing positional after file",
			line: `upload -file 123e4567-e89b-12d3-a456-426614174000 extra`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "file", Type: COMMAND_PARAMETER_TYPE_FILE, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "too many positional arguments",
		},
		{
			name: "trailing positional after complex",
			line: `run -config {"a":1} extra`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "config", Type: COMMAND_PARAMETER_TYPE_CONNECTION_INFO, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "too many positional arguments",
		},
		{
			name: "invalid object json",
			line: `run {"bad":`,
			parameters: []databaseStructs.Commandparameters{
				{CliName: "text", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
			},
			errorText: "as JSON",
		},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, _, err := SplitOperatorAliasExpandedTaskLine(test.line, test.parameters)
			if err == nil {
				t.Fatalf("expected parse error")
			}
			if !strings.Contains(err.Error(), test.errorText) {
				t.Fatalf("error = %q, want containing %q", err.Error(), test.errorText)
			}
		})
	}
}

func TestSplitOperatorAliasExpandedTaskLineAllowsRawForCommandsWithoutParameters(t *testing.T) {
	_, params, err := SplitOperatorAliasExpandedTaskLine(`shell whoami`, []databaseStructs.Commandparameters{})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if params != "whoami" {
		t.Fatalf("params = %q, want whoami", params)
	}
}

func TestSplitOperatorAliasExpandedTaskLineCoalescesUnquotedStringArgumentTail(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "Assembly", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
		{CliName: "Arguments", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 2},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`execute_assembly -Assembly Rubeus.exe -Arguments asktgt /username=bob /password=/bob`, parameters)
	if err != nil {
		t.Fatalf("unexpected unquoted argument error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"Assembly":  "Rubeus.exe",
		"Arguments": "asktgt /username=bob /password=/bob",
	})

	_, params, err = SplitOperatorAliasExpandedTaskLine(`execute_assembly -Assembly Rubeus.exe -Arguments "asktgt /username=bob /password=bob /nowrap"`, parameters)
	if err != nil {
		t.Fatalf("unexpected quoted argument error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"Assembly":  "Rubeus.exe",
		"Arguments": "asktgt /username=bob /password=bob /nowrap",
	})
}

func TestSplitOperatorAliasExpandedTaskLinePreservesLiteralQuotesInCoalescedStringTail(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "Assembly", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 1},
		{CliName: "Arguments", Type: COMMAND_PARAMETER_TYPE_STRING, ParameterGroupName: "Default", UiPosition: 2},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`execute_assembly -Assembly Rubeus.exe -Arguments "\"asktgt\"" /nowrap`, parameters)
	if err != nil {
		t.Fatalf("unexpected literal quote argument error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"Assembly":  "Rubeus.exe",
		"Arguments": `"asktgt" /nowrap`,
	})
}

func TestSplitOperatorAliasExpandedTaskLineRepeatableParamsKeepAbsorbingValues(t *testing.T) {
	parameters := []databaseStructs.Commandparameters{
		{CliName: "items", Type: COMMAND_PARAMETER_TYPE_CHOOSE_MULTIPLE, ParameterGroupName: "Default", UiPosition: 1},
	}
	_, params, err := SplitOperatorAliasExpandedTaskLine(`collect -items one two three`, parameters)
	if err != nil {
		t.Fatalf("unexpected repeatable argument error: %v", err)
	}
	assertJSONEqual(t, params, map[string]interface{}{
		"items": []interface{}{"one", "two", "three"},
	})
}

func TestResolveOperatorAliasLineWithTerminalCommands(t *testing.T) {
	resolution, err := ResolveOperatorAliasLineWithProvidedSlashCommands(
		1,
		OperatorAliasScope{ConsumingContainerID: 2},
		"/builtin something",
		map[string]bool{"builtin": true},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !resolution.FinalIsSlash {
		t.Fatalf("expected final slash command")
	}
	if resolution.FinalCommand != "builtin" {
		t.Fatalf("final command = %q, want builtin", resolution.FinalCommand)
	}
	if resolution.FinalArgument != "something" {
		t.Fatalf("final argument = %q, want something", resolution.FinalArgument)
	}
	if resolution.AliasMatched {
		t.Fatalf("terminal command should not resolve as an alias")
	}
}

func assertJSONEqual(t *testing.T, actual string, expected map[string]interface{}) {
	t.Helper()
	var actualMap map[string]interface{}
	if err := json.Unmarshal([]byte(actual), &actualMap); err != nil {
		t.Fatalf("failed to parse JSON %q: %v", actual, err)
	}
	if !reflect.DeepEqual(actualMap, expected) {
		t.Fatalf("JSON = %#v, want %#v", actualMap, expected)
	}
}
