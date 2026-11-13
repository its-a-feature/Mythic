// Package authorization describes policies as data. It deliberately does not
// import database models, HTTP handlers, or authentication packages: models and
// every API transport can share the same rules without import cycles.
package authorization

import (
	"encoding/json"
	"fmt"
	"reflect"
	"strings"
)

type PolicyProvider interface {
	AuthorizationPolicy() ResourcePolicy
}

type TableRef struct {
	Schema string `json:"schema"`
	Name   string `json:"name"`
}

type ResourcePolicy struct {
	Table         TableRef `json:"table"`
	OperationPath []string `json:"operation_path,omitempty"`
	// OperationPaths grants access when any path matches the operation claim.
	// Use either OperationPath or OperationPaths, never both.
	OperationPaths [][]string            `json:"operation_paths,omitempty"`
	Read           Rule                  `json:"read"`
	Write          Rule                  `json:"write"`
	Lookup         *ValueLookup          `json:"lookup,omitempty"`
	FieldReads     []FieldReadRule       `json:"field_reads,omitempty"`
	Relationships  []RelationshipBinding `json:"-"`
	Actions        []Action              `json:"-"`
}

// A rule is either a scope requirement, a category-dependent requirement, or an
// explicitly scope-free catalog. The compiler rejects ambiguous combinations.
type Rule struct {
	Permission string     `json:"permission,omitempty"`
	ByValue    *ValueRule `json:"by_value,omitempty"`
	Public     bool       `json:"public,omitempty"`
}

type ValueRule struct {
	Path  []string    `json:"path"`
	Cases []ValueCase `json:"cases"`
}

type ValueCase struct {
	Value      string `json:"value"`
	Permission string `json:"permission"`
}

// ValueLookup returns a category for an explicit row identifier. Queries are
// model declarations, never client SQL: $1 is the identifier and $2 is the
// credential's operation. Constrain both the row and any joined operation rows.
type ValueLookup struct {
	Column string `json:"column"`
	Query  string `json:"query"`
}

// Column names are database names; computed fields use their metadata names.
// GraphQL aliases and Go response names are derived rather than repeated here.
type FieldRef struct {
	Column        string `json:"column,omitempty"`
	ComputedField string `json:"computed_field,omitempty"`
}

type FieldReadRule struct {
	Fields     []FieldRef `json:"fields"`
	Permission string     `json:"permission"`
}

type RelationshipBinding struct {
	Name   string
	Target PolicyProvider
}

// ModelBinding is populated by the generated registry, never a handwritten map.
type ModelBinding struct {
	Type   reflect.Type
	Policy ResourcePolicy
}

type Table struct {
	Policy        ResourcePolicy         `json:"policy"`
	Relationships map[string]string      `json:"relationships"`
	Columns       map[string]string      `json:"columns"`
	Computed      map[string]bool        `json:"computed"`
	JSONFields    map[string]string      `json:"json_fields"`
	Lookups       map[string]ValueLookup `json:"lookups,omitempty"`
}

type Root struct {
	Table  string `json:"table,omitempty"`
	Access string `json:"access,omitempty"`
	Action string `json:"action,omitempty"`
}

type Action struct {
	Permissions   []string      `json:"permissions"`
	Handler       string        `json:"handler"`
	Resource      string        `json:"resource,omitempty"`
	Argument      string        `json:"argument,omitempty"`
	ValueArgument string        `json:"value_argument,omitempty"`
	DefaultValue  string        `json:"default_value,omitempty"`
	Access        string        `json:"access,omitempty"`
	ReadWhen      *ArgumentRule `json:"read_when,omitempty"`
	Unavailable   bool          `json:"unavailable,omitempty"`
}

// ArgumentRule describes a personal/read-only update inside a broader Action,
// such as muting a channel without editing its shared configuration.
type ArgumentRule struct {
	Present string   `json:"present"`
	Only    []string `json:"only"`
}

// ClaimName describes actual authorized operation/actor IDs, not numeric flags.
func ClaimName(permission string, operation bool) string {
	anchor := "actor"
	if operation {
		anchor = "operation"
	}
	return "x-hasura-" + strings.ReplaceAll(permission, ".", "-") + "-" + anchor + "-ids"
}

// Condition preserves relationship paths when compiling operation boundaries,
// category predicates, and field permissions into Hasura boolean expressions.
func Condition(path []string, comparison map[string]interface{}) map[string]interface{} {
	for i := len(path) - 1; i >= 0; i-- {
		comparison = map[string]interface{}{path[i]: comparison}
	}
	return comparison
}

func (policy ResourcePolicy) operationPaths() [][]string {
	if len(policy.OperationPaths) > 0 {
		return policy.OperationPaths
	}
	if len(policy.OperationPath) > 0 {
		return [][]string{policy.OperationPath}
	}
	return nil
}

func operationFilter(policy ResourcePolicy, comparison map[string]interface{}) map[string]interface{} {
	paths := policy.operationPaths()
	if len(paths) == 1 {
		return Condition(paths[0], comparison)
	}
	branches := make([]interface{}, 0, len(paths))
	for _, path := range paths {
		branches = append(branches, Condition(path, comparison))
	}
	return map[string]interface{}{"_or": branches}
}

func PermissionFilter(policy ResourcePolicy, rule Rule) map[string]interface{} {
	if rule.Public {
		return map[string]interface{}{}
	}
	if rule.ByValue != nil {
		branches := []interface{}{}
		for _, item := range rule.ByValue.Cases {
			branches = append(branches, map[string]interface{}{"_and": []interface{}{
				Condition(rule.ByValue.Path, map[string]interface{}{"_eq": item.Value}),
				PermissionFilter(policy, Rule{Permission: item.Permission}),
			}})
		}
		return map[string]interface{}{"_or": branches}
	}
	if len(policy.operationPaths()) > 0 {
		return operationFilter(policy, map[string]interface{}{"_in": ClaimName(rule.Permission, true)})
	}
	// Global catalogs/account resources use the authenticated actor as the gate;
	// this does not accidentally limit returned rows to the owner's own row.
	return map[string]interface{}{"_exists": map[string]interface{}{
		"_table": map[string]interface{}{"schema": "public", "name": "operator"},
		"_where": map[string]interface{}{"id": map[string]interface{}{"_in": ClaimName(rule.Permission, false)}},
	}}
}

type Metadata struct {
	Tables  map[string]Table  `json:"tables"`
	Roots   map[string]Root   `json:"roots"`
	Actions map[string]Action `json:"actions"`
}

// Field projections are shared by direct handlers and RPCs, which do not pass
// through Hasura. Null is written explicitly, including fields tagged omitempty.
func ProjectFields(table Table, scopes map[string]bool, data interface{}) (json.RawMessage, error) {
	encoded, err := json.Marshal(data)
	if err != nil {
		return nil, err
	}
	if len(table.Policy.FieldReads) == 0 {
		return encoded, nil
	}
	var output interface{}
	if err = json.Unmarshal(encoded, &output); err != nil {
		return nil, err
	}
	rows := []interface{}{output}
	if list, ok := output.([]interface{}); ok {
		rows = list
	}
	for _, rule := range table.Policy.FieldReads {
		if scopes[SCOPE_ALL] || scopes[rule.Permission] {
			continue
		}
		for _, row := range rows {
			object, ok := row.(map[string]interface{})
			if !ok {
				return nil, fmt.Errorf("field projection requires objects, got %T", row)
			}
			for _, field := range rule.Fields {
				name := field.ComputedField
				if field.Column != "" {
					name = table.JSONFields[field.Column]
				}
				if _, exists := object[name]; exists {
					object[name] = nil
				}
			}
		}
	}
	return json.Marshal(output)
}
