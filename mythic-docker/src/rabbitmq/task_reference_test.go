package rabbitmq

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"testing"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

type testTaskReferenceProvider struct{}

func (testTaskReferenceProvider) Keyword() string {
	return "testref"
}

func (testTaskReferenceProvider) StructuredParameterTypes() []string {
	return []string{"TestReference"}
}

func (testTaskReferenceProvider) ParseReferenceBody(body string, _ string) (taskReference, error) {
	selector, field, _ := strings.Cut(body, ".")
	return taskReference{
		Selector: selector,
		Field:    strings.ToLower(field),
	}, nil
}

func (testTaskReferenceProvider) ValidateReference(reference taskReference, structured bool) error {
	if reference.Selector == "" || reference.Selector == "missing" {
		return fmt.Errorf("bad selector")
	}
	if reference.Field == "" {
		return nil
	}
	if structured {
		return fmt.Errorf("structured references cannot include fields")
	}
	switch reference.Field {
	case "value", "name":
		return nil
	default:
		return fmt.Errorf("bad field")
	}
}

func (testTaskReferenceProvider) BatchResolveTaskReferences(context taskReferenceResolveContext, references []taskReference) (map[taskReference]taskReferenceResolvedValue, error) {
	resolved := make(map[taskReference]taskReferenceResolvedValue)
	for _, reference := range references {
		if reference.Selector == "missing" {
			return nil, fmt.Errorf("missing selector")
		}
		if reference.Field == "" {
			resolvedValue := taskReferenceResolvedValue{
				Structured: map[string]interface{}{
					"id":        reference.Selector,
					"operation": context.OperationID,
				},
			}
			if reference.Selector == "withaction" {
				resolvedValue.PostCreateActions = []taskReferencePostCreateAction{{Description: "test post action"}}
			}
			resolved[reference] = resolvedValue
		} else {
			resolved[reference] = taskReferenceResolvedValue{
				Scalar: reference.Selector + ":" + reference.Field,
			}
		}
	}
	return resolved, nil
}

func init() {
	registerTaskReferenceProvider(testTaskReferenceProvider{})
	registerTaskReferenceProvider(batchTaskReferenceProvider{})
}

var batchProviderCalls int
var batchProviderReferenceCount int

type batchTaskReferenceProvider struct{}

func (batchTaskReferenceProvider) Keyword() string {
	return "batchref"
}

func (batchTaskReferenceProvider) StructuredParameterTypes() []string {
	return []string{"BatchReference"}
}

func (batchTaskReferenceProvider) ParseReferenceBody(body string, _ string) (taskReference, error) {
	selector, field, _ := strings.Cut(body, ".")
	return taskReference{
		Selector: selector,
		Field:    strings.ToLower(field),
	}, nil
}

func (batchTaskReferenceProvider) ValidateReference(reference taskReference, structured bool) error {
	if reference.Selector == "" {
		return fmt.Errorf("bad selector")
	}
	if reference.Field == "" {
		return nil
	}
	if structured {
		return fmt.Errorf("structured references cannot include fields")
	}
	if reference.Field != "value" {
		return fmt.Errorf("bad field")
	}
	return nil
}

func (batchTaskReferenceProvider) BatchResolveTaskReferences(context taskReferenceResolveContext, references []taskReference) (map[taskReference]taskReferenceResolvedValue, error) {
	batchProviderCalls++
	batchProviderReferenceCount += len(references)
	resolved := make(map[taskReference]taskReferenceResolvedValue)
	for _, reference := range references {
		resolved[reference] = taskReferenceResolvedValue{
			Scalar: fmt.Sprintf("%d:%s:%s", context.OperationID, reference.Selector, reference.Field),
		}
	}
	return resolved, nil
}

func TestTaskReferenceScalarReplacementInRawParams(t *testing.T) {
	updated, changed, _, _, err := resolveTaskReferencesInParams(
		`run @testref:alpha.value and @testref:beta.name`,
		taskReferenceResolveContext{OperationID: 7},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	expected := `run alpha:value and beta:name`
	if updated != expected {
		t.Fatalf("updated params = %q, want %q", updated, expected)
	}
}

func TestTaskReferenceLeavesBareRawReferences(t *testing.T) {
	updated, changed, _, _, err := resolveTaskReferencesInParams(
		`run @testref:alpha`,
		taskReferenceResolveContext{OperationID: 7},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if changed {
		t.Fatal("expected bare raw reference to remain unchanged")
	}
	if updated != `run @testref:alpha` {
		t.Fatalf("updated params = %q", updated)
	}
}

func TestTaskReferenceJSONScalarAndStructuredReplacement(t *testing.T) {
	updated, changed, keywordResolution, _, err := resolveTaskReferencesInParams(
		`{"cred":"@testref:alpha","args":"name=@testref:alpha.name","nested":{"value":"@testref:beta.value"}}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"cred": {Keyword: "testref", ParameterType: "TestReference"},
			},
		},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	decoded := map[string]interface{}{}
	if err := json.Unmarshal([]byte(updated), &decoded); err != nil {
		t.Fatalf("failed to decode updated params: %v", err)
	}
	cred, ok := decoded["cred"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected structured credential object, got %#v", decoded["cred"])
	}
	if cred["id"] != "alpha" || cred["operation"].(float64) != 42 {
		t.Fatalf("unexpected structured value: %#v", cred)
	}
	if decoded["args"] != "name=alpha:name" {
		t.Fatalf("unexpected scalar value: %#v", decoded["args"])
	}
	nested := decoded["nested"].(map[string]interface{})
	if nested["value"] != "beta:value" {
		t.Fatalf("unexpected nested scalar value: %#v", nested["value"])
	}
	expectedResolution := []PTTaskKeywordResolution{
		{
			Raw:            "@testref:alpha",
			Keyword:        "testref",
			Selector:       "alpha",
			Field:          "",
			ValueType:      taskReferenceValueTypeStructured,
			ExpandedValue:  "",
			ParameterNames: []string{"cred"},
		},
		{
			Raw:            "@testref:alpha.name",
			Keyword:        "testref",
			Selector:       "alpha",
			Field:          "name",
			ValueType:      taskReferenceValueTypeString,
			ExpandedValue:  "alpha:name",
			ParameterNames: []string{"args"},
		},
		{
			Raw:            "@testref:beta.value",
			Keyword:        "testref",
			Selector:       "beta",
			Field:          "value",
			ValueType:      taskReferenceValueTypeString,
			ExpandedValue:  "beta:value",
			ParameterNames: []string{"nested"},
		},
	}
	if !reflect.DeepEqual(keywordResolution, expectedResolution) {
		t.Fatalf("keyword resolution = %#v, want %#v", keywordResolution, expectedResolution)
	}
}

func TestTaskReferenceStructuredKeywordResolutionIncludesParameterAliases(t *testing.T) {
	context := taskReferenceResolveContext{OperationID: 42}
	addTaskReferenceParameterMetadata(
		&context,
		[]databaseStructs.Commandparameters{{
			Name:        "cred",
			CliName:     "cli_cred",
			DisplayName: "Credential",
			Type:        "TestReference",
		}},
		map[string]taskReferenceProvider{"TestReference": testTaskReferenceProvider{}},
	)
	_, changed, keywordResolution, _, err := resolveTaskReferencesInParams(
		`{"cli_cred":"@testref:alpha"}`,
		context,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	expectedResolution := []PTTaskKeywordResolution{
		{
			Raw:            "@testref:alpha",
			Keyword:        "testref",
			Selector:       "alpha",
			Field:          "",
			ValueType:      taskReferenceValueTypeStructured,
			ExpandedValue:  "",
			ParameterNames: []string{"Credential", "cli_cred", "cred"},
		},
	}
	if !reflect.DeepEqual(keywordResolution, expectedResolution) {
		t.Fatalf("keyword resolution = %#v, want %#v", keywordResolution, expectedResolution)
	}
}

func TestTaskReferenceScalarKeywordResolutionIncludesParameterAliases(t *testing.T) {
	context := taskReferenceResolveContext{OperationID: 42}
	addTaskReferenceParameterMetadata(
		&context,
		[]databaseStructs.Commandparameters{{
			Name:        "arguments",
			CliName:     "Arguments",
			DisplayName: "Command Arguments",
			Type:        COMMAND_PARAMETER_TYPE_STRING,
		}},
		nil,
	)
	expectedParameterNames := []string{"Arguments", "Command Arguments", "arguments"}
	for _, parameterName := range expectedParameterNames {
		t.Run(parameterName, func(t *testing.T) {
			paramsBytes, err := json.Marshal(map[string]interface{}{
				parameterName: `/user:@testref:143.name`,
			})
			if err != nil {
				t.Fatalf("failed to marshal params: %v", err)
			}
			updated, changed, keywordResolution, _, err := resolveTaskReferencesInParams(string(paramsBytes), context)
			if err != nil {
				t.Fatalf("unexpected error: %v", err)
			}
			if !changed {
				t.Fatal("expected params to change")
			}
			updatedParams := map[string]interface{}{}
			if err := json.Unmarshal([]byte(updated), &updatedParams); err != nil {
				t.Fatalf("failed to unmarshal updated params: %v", err)
			}
			if updatedParams[parameterName] != "/user:143:name" {
				t.Fatalf("updated parameter = %#v", updatedParams[parameterName])
			}
			expectedResolution := []PTTaskKeywordResolution{{
				Raw:            "@testref:143.name",
				Keyword:        "testref",
				Selector:       "143",
				Field:          "name",
				ValueType:      taskReferenceValueTypeString,
				ExpandedValue:  "143:name",
				ParameterNames: expectedParameterNames,
			}}
			if !reflect.DeepEqual(keywordResolution, expectedResolution) {
				t.Fatalf("keyword resolution = %#v, want %#v", keywordResolution, expectedResolution)
			}
		})
	}
}

func TestTaskReferenceScalarAliasesPropagateThroughNestedValuesAndMerge(t *testing.T) {
	context := taskReferenceResolveContext{OperationID: 42}
	addTaskReferenceParameterMetadata(
		&context,
		[]databaseStructs.Commandparameters{
			{
				Name:        "arguments",
				CliName:     "Arguments",
				DisplayName: "Command Arguments",
				Type:        COMMAND_PARAMETER_TYPE_STRING,
			},
			{
				Name:        "other",
				CliName:     "Other",
				DisplayName: "Other Value",
				Type:        COMMAND_PARAMETER_TYPE_ARRAY,
			},
		},
		nil,
	)
	_, changed, keywordResolution, _, err := resolveTaskReferencesInParams(
		`{"Arguments":{"nested":["first=@testref:alpha.value"]},"Other":["second=@testref:alpha.value"]}`,
		context,
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	expectedResolution := []PTTaskKeywordResolution{{
		Raw:           "@testref:alpha.value",
		Keyword:       "testref",
		Selector:      "alpha",
		Field:         "value",
		ValueType:     taskReferenceValueTypeString,
		ExpandedValue: "alpha:value",
		ParameterNames: []string{
			"Arguments",
			"Command Arguments",
			"Other",
			"Other Value",
			"arguments",
			"other",
		},
	}}
	if !reflect.DeepEqual(keywordResolution, expectedResolution) {
		t.Fatalf("keyword resolution = %#v, want %#v", keywordResolution, expectedResolution)
	}
}

func TestTaskReferenceParameterMetadataDropsBlankAndDuplicateAliases(t *testing.T) {
	context := taskReferenceResolveContext{}
	addTaskReferenceParameterMetadata(
		&context,
		[]databaseStructs.Commandparameters{{
			Name:        "same",
			CliName:     " same ",
			DisplayName: "",
			Type:        COMMAND_PARAMETER_TYPE_STRING,
		}},
		nil,
	)
	expectedAliases := []string{"same"}
	if !reflect.DeepEqual(context.ParameterAliases["same"], expectedAliases) {
		t.Fatalf("parameter aliases = %#v, want %#v", context.ParameterAliases["same"], expectedAliases)
	}
}

func TestTaskReferenceStructuredReplacementTrimsReferenceValue(t *testing.T) {
	updated, changed, _, _, err := resolveTaskReferencesInParams(
		`{"cred":"  @testref:alpha  "}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"cred": {Keyword: "testref", ParameterType: "TestReference"},
			},
		},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	decoded := map[string]interface{}{}
	if err := json.Unmarshal([]byte(updated), &decoded); err != nil {
		t.Fatalf("failed to decode updated params: %v", err)
	}
	cred, ok := decoded["cred"].(map[string]interface{})
	if !ok {
		t.Fatalf("expected structured credential object, got %#v", decoded["cred"])
	}
	if cred["id"] != "alpha" || cred["operation"].(float64) != 42 {
		t.Fatalf("unexpected structured value: %#v", cred)
	}
}

func TestTaskReferenceCredentialJSONRequiresReferenceString(t *testing.T) {
	_, _, _, _, err := resolveTaskReferencesInParams(
		`{"cred":123}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"cred": {Keyword: "testref", ParameterType: "TestReference"},
			},
		},
	)
	if err == nil || !strings.Contains(err.Error(), "task references") {
		t.Fatalf("expected structured reference error, got %v", err)
	}
}

func TestTaskReferenceRejectsUnsupportedField(t *testing.T) {
	_, _, _, _, err := resolveTaskReferencesInParams(
		`run @testref:alpha.nope`,
		taskReferenceResolveContext{OperationID: 7},
	)
	if err == nil || !strings.Contains(err.Error(), "bad field") {
		t.Fatalf("expected unsupported field error, got %v", err)
	}
}

func TestTaskReferenceRejectsUnsupportedKeyword(t *testing.T) {
	_, _, _, _, err := resolveTaskReferencesInParams(
		`run @missingref:alpha.value`,
		taskReferenceResolveContext{OperationID: 7},
	)
	if err == nil || !strings.Contains(err.Error(), "unsupported task reference keyword") {
		t.Fatalf("expected unsupported keyword error, got %v", err)
	}
}

func TestTaskReferenceStructuredReferenceRejectsFieldedValue(t *testing.T) {
	_, _, _, _, err := resolveTaskReferencesInParams(
		`{"cred":"@testref:alpha.value"}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"cred": {Keyword: "testref", ParameterType: "TestReference"},
			},
		},
	)
	if err == nil || !strings.Contains(err.Error(), "require structured @testref") {
		t.Fatalf("expected selector-only structured reference error, got %v", err)
	}
}

func TestTaskReferenceBatchResolutionDeduplicatesReferences(t *testing.T) {
	batchProviderCalls = 0
	batchProviderReferenceCount = 0
	updated, changed, keywordResolution, _, err := resolveTaskReferencesInParams(
		`run @batchref:one.value @batchref:one.value @batchref:two.value`,
		taskReferenceResolveContext{OperationID: 99},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	if updated != `run 99:one:value 99:one:value 99:two:value` {
		t.Fatalf("updated params = %q", updated)
	}
	if batchProviderCalls != 1 {
		t.Fatalf("expected one provider batch call, got %d", batchProviderCalls)
	}
	if batchProviderReferenceCount != 2 {
		t.Fatalf("expected two deduplicated references, got %d", batchProviderReferenceCount)
	}
	expectedResolution := []PTTaskKeywordResolution{
		{
			Raw:            "@batchref:one.value",
			Keyword:        "batchref",
			Selector:       "one",
			Field:          "value",
			ValueType:      taskReferenceValueTypeString,
			ExpandedValue:  "99:one:value",
			ParameterNames: []string{},
		},
		{
			Raw:            "@batchref:two.value",
			Keyword:        "batchref",
			Selector:       "two",
			Field:          "value",
			ValueType:      taskReferenceValueTypeString,
			ExpandedValue:  "99:two:value",
			ParameterNames: []string{},
		},
	}
	if !reflect.DeepEqual(keywordResolution, expectedResolution) {
		t.Fatalf("keyword resolution = %#v, want %#v", keywordResolution, expectedResolution)
	}
}

func TestTaskReferenceKeywordResolutionCollectsTopLevelParameterNames(t *testing.T) {
	_, changed, keywordResolution, _, err := resolveTaskReferencesInParams(
		`{"args":"@testref:alpha.value","items":["@testref:alpha.value"],"other":"@testref:beta.name"}`,
		taskReferenceResolveContext{OperationID: 42},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	expectedResolution := []PTTaskKeywordResolution{
		{
			Raw:            "@testref:alpha.value",
			Keyword:        "testref",
			Selector:       "alpha",
			Field:          "value",
			ValueType:      taskReferenceValueTypeString,
			ExpandedValue:  "alpha:value",
			ParameterNames: []string{"args", "items"},
		},
		{
			Raw:            "@testref:beta.name",
			Keyword:        "testref",
			Selector:       "beta",
			Field:          "name",
			ValueType:      taskReferenceValueTypeString,
			ExpandedValue:  "beta:name",
			ParameterNames: []string{"other"},
		},
	}
	if !reflect.DeepEqual(keywordResolution, expectedResolution) {
		t.Fatalf("keyword resolution = %#v, want %#v", keywordResolution, expectedResolution)
	}
}

func TestTaskReferenceBatchResolutionMergesMultipleProviders(t *testing.T) {
	batchProviderCalls = 0
	batchProviderReferenceCount = 0
	updated, changed, _, _, err := resolveTaskReferencesInParams(
		`run @testref:alpha.value @batchref:two.value`,
		taskReferenceResolveContext{OperationID: 99},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	if updated != `run alpha:value 99:two:value` {
		t.Fatalf("updated params = %q", updated)
	}
	if batchProviderCalls != 1 {
		t.Fatalf("expected one batch provider call, got %d", batchProviderCalls)
	}
	if batchProviderReferenceCount != 1 {
		t.Fatalf("expected one batch provider reference, got %d", batchProviderReferenceCount)
	}
}

func TestTaskReferenceReturnsDeduplicatedPostCreateActions(t *testing.T) {
	_, changed, _, postCreateActions, err := resolveTaskReferencesInParams(
		`{"first":"@testref:withaction","second":"@testref:withaction"}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"first":  {Keyword: "testref", ParameterType: "TestReference"},
				"second": {Keyword: "testref", ParameterType: "TestReference"},
			},
		},
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !changed {
		t.Fatal("expected params to change")
	}
	if len(postCreateActions) != 1 {
		t.Fatalf("expected one deduplicated post-create action, got %d", len(postCreateActions))
	}
	if postCreateActions[0].Description != "test post action" {
		t.Fatalf("unexpected post-create action: %#v", postCreateActions[0])
	}
}

func TestTaskReferenceLinkCallbackReferenceForAgentConnect(t *testing.T) {
	reference, found, err := parseExactTaskReference(`@link:callback=12,c2=mesh`)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !found {
		t.Fatal("expected @link reference to parse")
	}
	reference.ParameterType = COMMAND_PARAMETER_TYPE_CONNECTION_INFO
	if err := validateTaskReference(reference, true); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
	if reference.Selector != "c2=mesh,callback=12" {
		t.Fatalf("selector = %q", reference.Selector)
	}
}

func TestTaskReferenceLinkPayloadReferenceForAgentConnect(t *testing.T) {
	reference, found, err := parseExactTaskReference(`@link:payload=payload-uuid,host=TARGET,c2=mesh`)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !found {
		t.Fatal("expected @link reference to parse")
	}
	reference.ParameterType = COMMAND_PARAMETER_TYPE_CONNECTION_INFO
	if err := validateTaskReference(reference, true); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func TestTaskReferenceLinkPayloadReferenceRequiresC2(t *testing.T) {
	reference, found, err := parseExactTaskReference(`@link:payload=payload-uuid,host=TARGET`)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !found {
		t.Fatal("expected @link reference to parse")
	}
	reference.ParameterType = COMMAND_PARAMETER_TYPE_CONNECTION_INFO
	if err := validateTaskReference(reference, true); err == nil || !strings.Contains(err.Error(), "unexpected arguments") {
		t.Fatalf("expected missing c2 validation error, got %v", err)
	}
}

func TestTaskReferenceLinkEdgeReferenceForLinkInfo(t *testing.T) {
	reference, found, err := parseExactTaskReference(`@link:edge=55`)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !found {
		t.Fatal("expected @link reference to parse")
	}
	reference.ParameterType = COMMAND_PARAMETER_TYPE_LINK_INFO
	if err := validateTaskReference(reference, true); err != nil {
		t.Fatalf("unexpected validation error: %v", err)
	}
}

func TestTaskReferenceLinkRejectsWrongParameterType(t *testing.T) {
	reference, found, err := parseExactTaskReference(`@link:edge=55`)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !found {
		t.Fatal("expected @link reference to parse")
	}
	reference.ParameterType = COMMAND_PARAMETER_TYPE_CONNECTION_INFO
	if err := validateTaskReference(reference, true); err == nil || !strings.Contains(err.Error(), "AgentConnect") {
		t.Fatalf("expected wrong parameter type error, got %v", err)
	}

	reference, found, err = parseExactTaskReference(`@link:callback=12,c2=mesh`)
	if err != nil {
		t.Fatalf("unexpected parse error: %v", err)
	}
	if !found {
		t.Fatal("expected @link reference to parse")
	}
	reference.ParameterType = COMMAND_PARAMETER_TYPE_LINK_INFO
	if err := validateTaskReference(reference, true); err == nil || !strings.Contains(err.Error(), "LinkInfo") {
		t.Fatalf("expected wrong parameter type error, got %v", err)
	}
}

func TestTaskReferenceLinkRejectsExistingStructuredAgentConnectValues(t *testing.T) {
	_, _, _, _, err := resolveTaskReferencesInParams(
		`{"conn":{"host":"TARGET","agent_uuid":"payload","callback_uuid":"","c2_profile":{"name":"mesh","parameters":{}}}}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"conn": {Keyword: "link", ParameterType: COMMAND_PARAMETER_TYPE_CONNECTION_INFO},
			},
		},
	)
	if err == nil || !strings.Contains(err.Error(), "link parameters require @link task references") {
		t.Fatalf("expected AgentConnect reference requirement error, got %v", err)
	}
}

func TestTaskReferenceLinkStructuredCollection(t *testing.T) {
	matches, err := collectTaskReferencesFromJSON(
		map[string]interface{}{"conn": "@link:payload=payload-uuid,host=TARGET,c2=mesh"},
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]taskReferenceStructuredParameterProvider{
				"conn": {Keyword: "link", ParameterType: COMMAND_PARAMETER_TYPE_CONNECTION_INFO},
			},
		},
		true,
		"",
	)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) != 1 {
		t.Fatalf("expected one link match, got %d", len(matches))
	}
	if matches[0].Reference.Selector != "c2=mesh,host=TARGET,payload=payload-uuid" {
		t.Fatalf("unexpected selector: %q", matches[0].Reference.Selector)
	}
	if matches[0].Reference.ParameterType != COMMAND_PARAMETER_TYPE_CONNECTION_INFO {
		t.Fatalf("unexpected parameter type: %q", matches[0].Reference.ParameterType)
	}
}

func TestTaskReferenceLinkNamedArgsAreNotScalarReferences(t *testing.T) {
	matches, err := collectTaskReferencesFromString(`connect @link:payload=payload-uuid,host=TARGET,c2=mesh`, nil)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if len(matches) != 0 {
		t.Fatalf("expected no scalar matches, got %#v", matches)
	}
}

func TestCredentialReferenceSelectorStrictness(t *testing.T) {
	tests := []struct {
		name string
		in   string
		ok   bool
	}{
		{name: "positive", in: "123", ok: true},
		{name: "zero", in: "0", ok: false},
		{name: "negative", in: "-1", ok: false},
		{name: "decimal", in: "1.5", ok: false},
		{name: "text", in: "abc", ok: false},
	}
	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			_, err := credentialReferenceSelectorID(test.in)
			if (err == nil) != test.ok {
				t.Fatalf("expected ok=%v got err=%v", test.ok, err)
			}
		})
	}
}
