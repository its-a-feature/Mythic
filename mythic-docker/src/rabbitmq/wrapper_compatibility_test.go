package rabbitmq

import (
	"reflect"
	"strings"
	"testing"
)

func TestValidateWrapperPayloadRequirements(t *testing.T) {
	validBuildParameter := BuildParameter{
		Name:          "arch",
		ParameterType: BUILD_PARAMETER_TYPE_CHOOSE_ONE,
	}
	tests := []struct {
		name        string
		payloadType PayloadType
		wantError   string
	}{
		{
			name: "valid conditional rule and explicit wildcard",
			payloadType: PayloadType{
				Wrapper:         true,
				BuildParameters: []BuildParameter{validBuildParameter},
				WrapperPayloadRequirements: []WrapperPayloadRequirement{
					{When: map[string]string{"arch": "x64"}, Requires: map[string]string{"format": "shellcode"}},
					{Requires: map[string]string{}},
				},
			},
		},
		{
			name: "agent type wrapper is accepted",
			payloadType: PayloadType{
				AgentType:                  "wrapper",
				WrapperPayloadRequirements: []WrapperPayloadRequirement{{Requires: map[string]string{}}},
			},
			wantError: "wrapper_payload_requirements can only be set on wrapper payload types",
		},
		{
			name: "rules on non-wrapper",
			payloadType: PayloadType{
				WrapperPayloadRequirements: []WrapperPayloadRequirement{{Requires: map[string]string{}}},
			},
			wantError: "only be set on wrapper",
		},
		{
			name: "missing requires differs from wildcard",
			payloadType: PayloadType{
				Wrapper:                    true,
				WrapperPayloadRequirements: []WrapperPayloadRequirement{{}},
			},
			wantError: ".requires is required",
		},
		{
			name: "unknown condition parameter",
			payloadType: PayloadType{
				Wrapper: true,
				WrapperPayloadRequirements: []WrapperPayloadRequirement{{
					When: map[string]string{"missing": "value"}, Requires: map[string]string{},
				}},
			},
			wantError: "unknown build parameter",
		},
		{
			name: "randomized condition parameter",
			payloadType: PayloadType{
				Wrapper:         true,
				BuildParameters: []BuildParameter{{Name: "arch", ParameterType: BUILD_PARAMETER_TYPE_STRING, Randomize: true}},
				WrapperPayloadRequirements: []WrapperPayloadRequirement{{
					When: map[string]string{"arch": "x64"}, Requires: map[string]string{},
				}},
			},
			wantError: "cannot use randomized",
		},
		{
			name: "non-scalar condition parameter",
			payloadType: PayloadType{
				Wrapper:         true,
				BuildParameters: []BuildParameter{{Name: "input", ParameterType: BUILD_PARAMETER_TYPE_FILE}},
				WrapperPayloadRequirements: []WrapperPayloadRequirement{{
					When: map[string]string{"input": "file"}, Requires: map[string]string{},
				}},
			},
			wantError: "cannot use File",
		},
	}

	for _, test := range tests {
		t.Run(test.name, func(t *testing.T) {
			err := validateWrapperPayloadRequirements(test.payloadType)
			if test.wantError == "" {
				if err != nil {
					t.Fatalf("unexpected error: %v", err)
				}
				return
			}
			if err == nil || !strings.Contains(err.Error(), test.wantError) {
				t.Fatalf("expected error containing %q, got %v", test.wantError, err)
			}
		})
	}
}

func TestBuildWrapperRequirementSQL(t *testing.T) {
	requirements := []WrapperPayloadRequirement{
		{Requires: map[string]string{
			WrapperPayloadTypeRequirementKey: "apollo",
			"os":                             "Windows",
			"architecture":                   "x64",
			"format":                         "shellcode",
		}},
		{Requires: map[string]string{"format": "dll"}},
	}

	query, args, err := buildWrapperRequirementSQL(requirements)
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if !strings.Contains(query, "source_payloadtype.name = ?") ||
		!strings.Contains(query, "payload.build_metadata @> ?::jsonb") ||
		!strings.Contains(query, " OR ") {
		t.Fatalf("query does not contain the expected exact AND/OR predicates: %s", query)
	}
	wantArgs := []interface{}{
		"apollo",
		`{"architecture":"x64","format":"shellcode","os":"Windows"}`,
		`{"format":"dll"}`,
	}
	if !reflect.DeepEqual(args, wantArgs) {
		t.Fatalf("unexpected query arguments\nwant: %#v\n got: %#v", wantArgs, args)
	}
}

func TestBuildWrapperRequirementSQLWildcard(t *testing.T) {
	query, args, err := buildWrapperRequirementSQL([]WrapperPayloadRequirement{{Requires: map[string]string{}}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if query != "TRUE" || len(args) != 0 {
		t.Fatalf("explicit wildcard should produce TRUE with no arguments, got %q %#v", query, args)
	}
}

func TestBuildWrapperRequirementSQLEmptyPayloadTypeIsNotWildcard(t *testing.T) {
	query, args, err := buildWrapperRequirementSQL([]WrapperPayloadRequirement{{
		Requires: map[string]string{WrapperPayloadTypeRequirementKey: ""},
	}})
	if err != nil {
		t.Fatalf("unexpected error: %v", err)
	}
	if query == "TRUE" || !reflect.DeepEqual(args, []interface{}{""}) {
		t.Fatalf("an explicitly empty payload_type must remain an exact comparison, got %q %#v", query, args)
	}
}
