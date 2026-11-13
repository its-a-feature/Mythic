package authorization

import (
	"fmt"
	"sort"
	"strings"

	"github.com/its-a-feature/Mythic/logging"
	"github.com/vektah/gqlparser/v2/ast"
	"github.com/vektah/gqlparser/v2/parser"
)

type GraphQLRequest struct {
	Query         string                 `json:"query"`
	OperationName string                 `json:"operationName,omitempty"`
	Variables     map[string]interface{} `json:"variables,omitempty"`
	Document      *ast.QueryDocument     `json:"-"`
}

type Principal struct {
	APITokenID  int
	OperationID int
	Scopes      map[string]bool
}

type MissingScopesError struct{ Scopes []string }

func (e *MissingScopesError) Error() string {
	return "missing required API token scope: " + strings.Join(e.Scopes, ", ")
}

// TargetResolver executes a model-declared lookup with the identifier and the
// credential operation. It returns a fact; model rules choose the permission.
type TargetResolver func(ValueLookup, interface{}) (string, error)

// Authorize checks the complete selected operation before Hasura executes it.
// Generated bindings identify resources; Hasura validates all API field types.
// This is an API-token scope preflight; Hasura still enforces its row/column rules.
func (request *GraphQLRequest) Authorize(metadata Metadata, principal Principal, resolve TargetResolver) error {
	// Interactive sessions do not need the additional API-token scope check.
	if principal.APITokenID == 0 {
		return nil
	}
	if request.Document == nil {
		if len(request.Query) > 128*1024 {
			return fmt.Errorf("GraphQL query exceeds authorization size limit")
		}
		document, err := parser.ParseQueryWithTokenLimit(&ast.Source{Name: "request.graphql", Input: request.Query}, 20000)
		if err != nil {
			return err
		}
		request.Document = document
	}
	// A document can contain several operations; only the selected one runs.
	var selected *ast.OperationDefinition
	for _, operation := range request.Document.Operations {
		if operation.Name == request.OperationName || request.OperationName == "" && len(request.Document.Operations) == 1 {
			selected = operation
			break
		}
	}
	if selected == nil {
		return fmt.Errorf("a matching operationName is required")
	}
	// Use supplied variables plus defaults when evaluating arguments/directives,
	// without modifying the caller's variables map.
	variables := map[string]interface{}{}
	for name, value := range request.Variables {
		variables[name] = value
	}
	for _, definition := range selected.VariableDefinitions {
		if _, provided := variables[definition.Variable]; !provided && definition.DefaultValue != nil {
			value, err := definition.DefaultValue.Value(variables)
			if err != nil {
				return err
			}
			variables[definition.Variable] = value
		}
	}
	// These closures share request state. Defining them does not run checks:
	// the final call to selections starts the walk, which calls input and the
	// permission helpers. Missing scopes accumulate; traversal/lookup errors
	// return immediately.
	missing := map[string]bool{}
	fieldCount := 0
	fragments := map[string]bool{}
	// require records missing read/write scopes. An empty category is a broad
	// request: any category grant suffices, with Hasura filtering rows to granted
	// categories. A known category requires its specific grant. Public rules and
	// SCOPE_ALL bypass resource scope checks.
	require := func(table Table, access string, category string) {
		rule := table.Policy.Read
		if access == "write" {
			rule = table.Policy.Write
		}
		logging.LogDebug("require", "access", access, "category", category)
		if rule.Public || principal.Scopes[SCOPE_ALL] {
			return
		}
		if rule.Permission != "" {
			if !principal.Scopes[rule.Permission] {
				missing[rule.Permission] = true
			}
			return
		}
		// check if there's a permission check by a specific value and not the table as a whole
		if rule.ByValue != nil {
			allowed := false
			for _, branch := range rule.ByValue.Cases {
				if category != "" && category != branch.Value {
					continue
				}
				if principal.Scopes[branch.Permission] {
					allowed = true
				}
			}
			if !allowed {
				for _, branch := range rule.ByValue.Cases {
					if category == "" || category == branch.Value {
						missing[branch.Permission] = true
					}
				}
				if category != "" {
					found := false
					for _, branch := range rule.ByValue.Cases {
						if category == branch.Value {
							found = true
						}
					}
					if !found {
						missing["unsupported resource category"] = true
					}
				}
			}
			return
		}
		missing[table.Policy.Table.Name+"."+access] = true
	}
	// requireTarget resolves an explicit row ID to its category, then checks the
	// rule. The supplied resolver owns the operation-constrained lookup; native
	// row predicates and Actions share this path.
	requireWithTargetDatabaseLookup := func(table Table, access string, lookup ValueLookup, id interface{}) error {
		if resolve == nil {
			return fmt.Errorf("authorization target resolver is unavailable for %s", table.Policy.Table.Name)
		}
		logging.LogDebug("extra require lookup", "access", access, "table", table.Policy.Table.Name, "id", id)
		category, err := resolve(lookup, id)
		if err != nil {
			return err
		}
		require(table, access, category)
		return nil
	}
	// input walks evaluated argument values: filters, nested mutation data, and
	// column enums. writing identifies mutation data rather than expressions.
	// categoryAccess separately carries the access needed for an explicit target:
	// a mutation's where is a filter, but its target may require write access.
	// Declare before assigning so the closure can recursively call itself.
	var input func(string, interface{}, bool, string) error
	input = func(name string, value interface{}, writing bool, categoryAccess string) error {
		table, exists := metadata.Tables[name]
		if !exists {
			return fmt.Errorf("unknown authorization resource %s", name)
		}
		switch valueTyped := value.(type) {
		case []interface{}:
			for _, item := range valueTyped {
				if err := input(name, item, writing, categoryAccess); err != nil {
					return err
				}
			}
		case map[string]interface{}:
			for field, item := range valueTyped {
				// Referencing a protected field in a filter/order expression uses
				// its value even when it is absent from the response selection.
				if !writing {
					for _, rule := range table.Policy.FieldReads {
						for _, protected := range rule.Fields {
							if (table.Columns[field] == protected.Column && protected.Column != "" || field == protected.ComputedField && protected.ComputedField != "") && !principal.Scopes[SCOPE_ALL] && !principal.Scopes[rule.Permission] {
								missing[rule.Permission] = true
							}
						}
					}
				}
				// With alternative paths, Hasura checks the complete row against
				// the OR guard; one input field cannot decide its ownership.
				paths := table.Policy.operationPaths()
				if writing && len(paths) == 1 && len(paths[0]) == 1 && field == paths[0][0] {
					if fmt.Sprint(item) != fmt.Sprint(principal.OperationID) {
						return fmt.Errorf("mutation crosses the token's operation boundary")
					}
				}
				rule := table.Policy.Read
				if categoryAccess == "write" {
					rule = table.Policy.Write
				}
				if lookup, known := table.Lookups[field]; known && rule.ByValue != nil {
					ids := []interface{}{}
					if comparison, ok := item.(map[string]interface{}); ok {
						if id, ok := comparison["_eq"]; ok {
							ids = append(ids, id)
						}
						if list, ok := comparison["_in"].([]interface{}); ok {
							ids = append(ids, list...)
						}
					} else if writing {
						ids = append(ids, item)
					}
					for _, id := range ids {
						if err := requireWithTargetDatabaseLookup(table, categoryAccess, lookup, id); err != nil {
							return err
						}
					}
				}
				target, relationship := table.Relationships[field]
				if !relationship {
					target, relationship = table.Relationships[strings.TrimSuffix(field, "_aggregate")]
				}
				if relationship {
					access := "read"
					if writing {
						access = "write"
					}
					require(metadata.Tables[target], access, "")
					// A category path keeps the mutation's access while traversing
					// its channel predicate; unrelated filters still need only reads.
					if categoryRule := rule.ByValue; categoryRule != nil && len(categoryRule.Path) > 1 && field == categoryRule.Path[0] {
						access = categoryAccess
					}
					if err := input(target, item, writing, access); err != nil {
						return err
					}
					continue
				}
				if categoryRule := rule.ByValue; categoryRule != nil && len(categoryRule.Path) == 1 && field == categoryRule.Path[0] {
					if literal, ok := item.(string); ok && writing {
						require(table, "write", literal)
					}
					if comparison, ok := item.(map[string]interface{}); ok {
						if literal, ok := comparison["_eq"].(string); ok {
							require(table, categoryAccess, literal)
						}
						if literals, ok := comparison["_in"].([]interface{}); ok {
							for _, literal := range literals {
								if text, ok := literal.(string); ok {
									require(table, categoryAccess, text)
								}
							}
						}
					}
				}
				// Scalars (including JSON columns) are leaves. Their arbitrary keys
				// must never be mistaken for relationships or operation predicates.
				if _, scalar := table.Columns[field]; scalar || table.Computed[field] {
					continue
				}
				if strings.HasPrefix(field, "_") || field == "data" || field == "objects" || field == "object" || field == "updates" {
					if err := input(name, item, writing, categoryAccess); err != nil {
						return err
					}
				}
			}
		case string:
			// distinct_on and aggregate column enums can expose protected values
			// even without selecting the corresponding field.
			if !writing {
				for _, rule := range table.Policy.FieldReads {
					for _, field := range rule.Fields {
						if (table.Columns[valueTyped] == field.Column && field.Column != "" || valueTyped == field.ComputedField && field.ComputedField != "") && !principal.Scopes[SCOPE_ALL] && !principal.Scopes[rule.Permission] {
							missing[rule.Permission] = true
						}
					}
				}
			}
		}
		return nil
	}
	// selections walks the GraphQL syntax tree. Root fields map to table
	// operations or Actions; below the root, name tracks the current table across
	// relationships and Hasura result wrappers. Arguments go to input; child
	// selections recurse here. Declare separately to allow recursion, as above.
	var selections func(string, ast.SelectionSet, bool) error
	selections = func(name string, set ast.SelectionSet, root bool) error {
		for _, selection := range set {
			fieldCount++
			if fieldCount > 2000 {
				return fmt.Errorf("GraphQL authorization field limit exceeded")
			}
			// Authorize only branches enabled by @skip/@include. Count visited
			// selections first so skipped branches still consume traversal budget.
			var directives ast.DirectiveList
			switch node := selection.(type) {
			case *ast.Field:
				directives = node.Directives
			case *ast.FragmentSpread:
				directives = node.Directives
			case *ast.InlineFragment:
				directives = node.Directives
			}
			skip := false
			for _, directive := range directives {
				if directive.Name != "skip" && directive.Name != "include" {
					continue
				}
				argument := directive.Arguments.ForName("if")
				if argument == nil {
					return fmt.Errorf("%s requires if", directive.Name)
				}
				value, err := argument.Value.Value(variables)
				if err != nil {
					return err
				}
				flag, ok := value.(bool)
				if !ok {
					return fmt.Errorf("directive if must be boolean")
				}
				if directive.Name == "skip" && flag || directive.Name == "include" && !flag {
					skip = true
				}
			}
			if skip {
				continue
			}
			switch selection := selection.(type) {
			case *ast.FragmentSpread:
				if fragments[selection.Name] {
					return fmt.Errorf("cyclic GraphQL fragment %s", selection.Name)
				}
				fragment := request.Document.Fragments.ForName(selection.Name)
				if fragment == nil {
					return fmt.Errorf("unknown fragment %s", selection.Name)
				}
				// Track the active recursion path; reusing the same fragment
				// elsewhere is valid once this recursive call has returned.
				fragments[selection.Name] = true
				if err := selections(name, fragment.SelectionSet, root); err != nil {
					return err
				}
				delete(fragments, selection.Name)
			case *ast.InlineFragment:
				if err := selections(name, selection.SelectionSet, root); err != nil {
					return err
				}
			case *ast.Field:
				if strings.HasPrefix(selection.Name, "__") {
					continue
				}
				tableName := name
				access := "read"
				arguments := map[string]interface{}{}
				for _, argument := range selection.Arguments {
					value, err := argument.Value.Value(variables)
					if err != nil {
						return err
					}
					arguments[argument.Name] = value
				}
				if root {
					binding, known := metadata.Roots[selection.Name]
					if !known {
						return fmt.Errorf("unclassified GraphQL root %s", selection.Name)
					}
					if binding.Action != "" {
						// Actions have handler permissions and optional resource rules;
						// their custom response objects are not table selections.
						action := metadata.Actions[binding.Action]
						if action.Unavailable {
							return fmt.Errorf("Action %s has no registered handler", binding.Action)
						}
						for _, permission := range action.Permissions {
							if !principal.Scopes[SCOPE_ALL] && !principal.Scopes[permission] {
								missing[permission] = true
							}
						}
						if action.Resource != "" {
							table, known := metadata.Tables[action.Resource]
							if !known {
								return fmt.Errorf("unclassified Action resource %s", action.Resource)
							}
							access := action.Access
							// An update Action may need only read access when its
							// arguments describe a declared personal/read-only change.
							if action.ReadWhen != nil && arguments[action.ReadWhen.Present] != nil {
								readOnly := true
								for argument, value := range arguments {
									if value == nil {
										continue
									}
									allowed := false
									for _, name := range action.ReadWhen.Only {
										allowed = allowed || argument == name
									}
									readOnly = readOnly && allowed
								}
								if readOnly {
									access = "read"
								}
							}
							category, _ := arguments[action.ValueArgument].(string)
							if category == "" && action.ValueArgument != "" {
								category = action.DefaultValue
							}
							rule := table.Policy.Read
							if access == "write" {
								rule = table.Policy.Write
							}
							// Static resource rules need no category query. Missing
							// optional IDs keep the broad/category-filtered behavior.
							if id := arguments[action.Argument]; id != nil && action.Argument != "" && rule.ByValue != nil {
								if table.Policy.Lookup == nil {
									return fmt.Errorf("Action resource %s has no value lookup", action.Resource)
								}
								if err := requireWithTargetDatabaseLookup(table, access, *table.Policy.Lookup, id); err != nil {
									return err
								}
							} else {
								require(table, access, category)
							}
						}
						continue
					}
					tableName, access = binding.Table, binding.Access
					require(metadata.Tables[tableName], access, "")
				} else {
					target, relation := metadata.Tables[name].Relationships[selection.Name]
					if !relation {
						target, relation = metadata.Tables[name].Relationships[strings.TrimSuffix(selection.Name, "_aggregate")]
					}
					if relation {
						tableName = target
						require(metadata.Tables[target], "read", "")
					}
					if !relation && len(selection.SelectionSet) > 0 && selection.Name != "nodes" && selection.Name != "returning" && selection.Name != "aggregate" && selection.Name != "avg" && selection.Name != "max" && selection.Name != "min" && selection.Name != "sum" && !strings.HasPrefix(selection.Name, "stddev") && !strings.HasPrefix(selection.Name, "var") {
						return fmt.Errorf("unclassified GraphQL selection %s.%s", name, selection.Name)
					}
				}
				table := metadata.Tables[tableName]
				// Returning mutation rows additionally requires read access.
				if selection.Name == "returning" {
					require(table, "read", "")
				}
				for argument, value := range arguments {
					// Mutation payloads are writes; other arguments, such as where,
					// remain expressions whose referenced fields are read.
					writing := access == "write" && (argument == "objects" || argument == "object" || argument == "_set" || argument == "updates")
					if err := input(tableName, value, writing, access); err != nil {
						return err
					}
				}
				// Identifier arguments (including composite primary-key objects)
				// use generated column bindings, just like recursive predicates.
				rule := table.Policy.Read
				if access == "write" {
					rule = table.Policy.Write
				}
				if rule.ByValue != nil {
					keys := arguments
					if primary, ok := arguments["pk_columns"].(map[string]interface{}); ok {
						keys = primary
					}
					for field, value := range keys {
						if lookup, known := table.Lookups[field]; known && value != nil {
							if err := requireWithTargetDatabaseLookup(table, access, lookup, value); err != nil {
								return err
							}
						}
					}
				}
				if err := selections(tableName, selection.SelectionSet, false); err != nil {
					return err
				}
			}
		}
		return nil
	}
	// Start the walk now that the helpers are defined, then report missing
	// scopes once in a deduplicated, deterministic order.
	if err := selections("", selected.SelectionSet, true); err != nil {
		return err
	}
	if len(missing) > 0 {
		scopes := []string{}
		for permission := range missing {
			scopes = append(scopes, permission)
		}
		sort.Strings(scopes)
		return &MissingScopesError{Scopes: scopes}
	}
	return nil
}
