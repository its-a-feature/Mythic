package rabbitmq

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
	"testing"
)

type testTaskReferenceProvider struct{}

func (testTaskReferenceProvider) Keyword() string {
	return "testref"
}

func (testTaskReferenceProvider) ParameterType() string {
	return "TestReference"
}

func (testTaskReferenceProvider) ValidateSelector(selector string) error {
	if selector == "" || selector == "missing" {
		return fmt.Errorf("bad selector")
	}
	return nil
}

func (testTaskReferenceProvider) ValidateField(field string) error {
	switch field {
	case "value", "name":
		return nil
	default:
		return fmt.Errorf("bad field")
	}
}

func (testTaskReferenceProvider) BatchResolveTaskReferences(operationID int, references []taskReferenceKeyword) (map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, error) {
	resolved := make(map[taskReferenceKeyword]taskReferenceKeywordResolvedValue)
	for _, reference := range references {
		if reference.Selector == "missing" {
			return nil, fmt.Errorf("missing selector")
		}
		if reference.Field == "" {
			resolved[reference] = taskReferenceKeywordResolvedValue{
				Structured: map[string]interface{}{
					"id":        reference.Selector,
					"operation": operationID,
				},
			}
		} else {
			resolved[reference] = taskReferenceKeywordResolvedValue{
				Scalar: reference.Selector + ":" + reference.Field,
			}
		}
	}
	return resolved, nil
}

func init() {
	registerTaskReferenceKeywordProvider(testTaskReferenceProvider{})
	registerTaskReferenceKeywordProvider(batchTaskReferenceProvider{})
}

var batchProviderCalls int
var batchProviderReferenceCount int

type batchTaskReferenceProvider struct{}

func (batchTaskReferenceProvider) Keyword() string {
	return "batchref"
}

func (batchTaskReferenceProvider) ParameterType() string {
	return "BatchReference"
}

func (batchTaskReferenceProvider) ValidateSelector(selector string) error {
	if selector == "" {
		return fmt.Errorf("bad selector")
	}
	return nil
}

func (batchTaskReferenceProvider) ValidateField(field string) error {
	if field != "value" {
		return fmt.Errorf("bad field")
	}
	return nil
}

func (batchTaskReferenceProvider) BatchResolveTaskReferences(operationID int, references []taskReferenceKeyword) (map[taskReferenceKeyword]taskReferenceKeywordResolvedValue, error) {
	batchProviderCalls++
	batchProviderReferenceCount += len(references)
	resolved := make(map[taskReferenceKeyword]taskReferenceKeywordResolvedValue)
	for _, reference := range references {
		resolved[reference] = taskReferenceKeywordResolvedValue{
			Scalar: fmt.Sprintf("%d:%s:%s", operationID, reference.Selector, reference.Field),
		}
	}
	return resolved, nil
}

func TestTaskReferenceScalarReplacementInRawParams(t *testing.T) {
	updated, changed, _, err := resolveTaskReferencesInParams(
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
	updated, changed, _, err := resolveTaskReferencesInParams(
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
	updated, changed, keywordResolution, err := resolveTaskReferencesInParams(
		`{"cred":"@testref:alpha","args":"name=@testref:alpha.name","nested":{"value":"@testref:beta.value"}}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]string{
				"cred": "testref",
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

func TestTaskReferenceStructuredReplacementTrimsReferenceValue(t *testing.T) {
	updated, changed, _, err := resolveTaskReferencesInParams(
		`{"cred":"  @testref:alpha  "}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]string{
				"cred": "testref",
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
	_, _, _, err := resolveTaskReferencesInParams(
		`{"cred":123}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]string{
				"cred": "testref",
			},
		},
	)
	if err == nil || !strings.Contains(err.Error(), "task references") {
		t.Fatalf("expected structured reference error, got %v", err)
	}
}

func TestTaskReferenceRejectsUnsupportedField(t *testing.T) {
	_, _, _, err := resolveTaskReferencesInParams(
		`run @testref:alpha.nope`,
		taskReferenceResolveContext{OperationID: 7},
	)
	if err == nil || !strings.Contains(err.Error(), "invalid testref reference field") {
		t.Fatalf("expected unsupported field error, got %v", err)
	}
}

func TestTaskReferenceRejectsUnsupportedKeyword(t *testing.T) {
	_, _, _, err := resolveTaskReferencesInParams(
		`run @missingref:alpha.value`,
		taskReferenceResolveContext{OperationID: 7},
	)
	if err == nil || !strings.Contains(err.Error(), "unsupported task reference keyword") {
		t.Fatalf("expected unsupported keyword error, got %v", err)
	}
}

func TestTaskReferenceStructuredReferenceRejectsFieldedValue(t *testing.T) {
	_, _, _, err := resolveTaskReferencesInParams(
		`{"cred":"@testref:alpha.value"}`,
		taskReferenceResolveContext{
			OperationID: 42,
			StructuredParameterProviders: map[string]string{
				"cred": "testref",
			},
		},
	)
	if err == nil || !strings.Contains(err.Error(), "require @testref:<id>") {
		t.Fatalf("expected selector-only structured reference error, got %v", err)
	}
}

func TestTaskReferenceBatchResolutionDeduplicatesReferences(t *testing.T) {
	batchProviderCalls = 0
	batchProviderReferenceCount = 0
	updated, changed, keywordResolution, err := resolveTaskReferencesInParams(
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
	_, changed, keywordResolution, err := resolveTaskReferencesInParams(
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
	updated, changed, _, err := resolveTaskReferencesInParams(
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
