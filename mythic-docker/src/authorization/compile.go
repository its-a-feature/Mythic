package authorization

import (
	"fmt"
	"io/fs"
	"path"
	"reflect"
	"sort"
	"strings"

	"gopkg.in/yaml.v3"
)

// Compile is used both by the offline command and the real-Hasura fixtures.
// The deployed metadata is also the input. Marked scope guards are removed
// before compiling fresh ones, preserving authored row and column restrictions.
func Compile(models []ModelBinding, source fs.FS, actions map[string]Action, catalog []ScopeDefinition) (Metadata, map[string][]byte, error) {
	const scopeComment = "authzgen: final _and term in filter/check is generated; edit the preceding row restrictions."
	const fieldComment = "authzgen: field selection for "
	result := Metadata{Tables: map[string]Table{}, Roots: map[string]Root{}, Actions: actions}
	files := map[string][]byte{}
	if err := fs.WalkDir(source, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return err
		}
		files[name], err = fs.ReadFile(source, name)
		return err
	}); err != nil {
		return result, nil, err
	}
	known := map[string]bool{}
	for _, permission := range catalog {
		known[permission.Name] = true
	}
	types := map[reflect.Type]string{}
	policies := map[string]ModelBinding{}
	for _, model := range models {
		name := model.Policy.Table.Name
		if name == "" || model.Policy.Table.Schema != "public" || policies[name].Type != nil {
			return result, nil, fmt.Errorf("invalid or duplicate model policy %s", name)
		}
		policies[name] = model
		types[model.Type] = name
	}
	names := []string{}
	for name := range files {
		if strings.HasPrefix(name, "databases/default/tables/public_") && strings.HasSuffix(name, ".yaml") {
			names = append(names, name)
		}
	}
	sort.Strings(names)
	for _, name := range names {
		var table map[string]interface{}
		if err := yaml.Unmarshal(files[name], &table); err != nil {
			return result, nil, fmt.Errorf("%s: %w", name, err)
		}
		ref, _ := table["table"].(map[string]interface{})
		tableName, _ := ref["name"].(string)
		model, exists := policies[tableName]
		if !exists {
			return result, nil, fmt.Errorf("%s: missing AuthorizationPolicy", tableName)
		}
		descriptor := Table{Policy: model.Policy, Relationships: map[string]string{}, Columns: map[string]string{}, Computed: map[string]bool{}, JSONFields: map[string]string{}, Lookups: map[string]ValueLookup{}}
		config, _ := table["configuration"].(map[string]interface{})
		aliases, _ := config["custom_column_names"].(map[string]interface{})
		columnConfig, _ := config["column_config"].(map[string]interface{})
		for i := 0; i < model.Type.NumField(); i++ {
			field := model.Type.Field(i)
			column := strings.Split(field.Tag.Get("db"), ",")[0]
			if column == "" || column == "-" {
				continue
			}
			fieldType := field.Type
			if fieldType.Kind() == reflect.Pointer {
				fieldType = fieldType.Elem()
			}
			if _, association := types[fieldType]; association {
				continue
			}
			graphql := column
			if alias, ok := aliases[column].(string); ok {
				graphql = alias
			}
			if entry, ok := columnConfig[column].(map[string]interface{}); ok {
				if alias, ok := entry["custom_name"].(string); ok {
					graphql = alias
				}
			}
			descriptor.Columns[graphql] = column
			jsonName := strings.Split(field.Tag.Get("json"), ",")[0]
			if jsonName == "" {
				jsonName = field.Name
			}
			descriptor.JSONFields[column] = jsonName
		}
		if lookup := model.Policy.Lookup; lookup != nil {
			if lookup.Column == "" || !strings.Contains(lookup.Query, "$1") || !strings.Contains(lookup.Query, "$2") {
				return result, nil, fmt.Errorf("%s: a value lookup requires its identifier column and $1 identifier/$2 operation parameters", tableName)
			}
			found := false
			for graphql, column := range descriptor.Columns {
				if column == lookup.Column {
					descriptor.Lookups[graphql] = *lookup
					found = true
				}
			}
			if !found {
				return result, nil, fmt.Errorf("%s: unknown value lookup column %s", tableName, lookup.Column)
			}
		}
		computed, _ := table["computed_fields"].([]interface{})
		for _, entry := range computed {
			field := entry.(map[string]interface{})["name"].(string)
			descriptor.Computed[field] = true
		}
		for _, kind := range []string{"object_relationships", "array_relationships"} {
			relationships, _ := table[kind].([]interface{})
			for _, raw := range relationships {
				relationship := raw.(map[string]interface{})
				field := relationship["name"].(string)
				using := relationship["using"].(map[string]interface{})
				target := ""
				if foreign, ok := using["foreign_key_constraint_on"].(map[string]interface{}); ok {
					remote, _ := foreign["table"].(map[string]interface{})
					target, _ = remote["name"].(string)
				}
				if manual, ok := using["manual_configuration"].(map[string]interface{}); ok {
					remote, _ := manual["remote_table"].(map[string]interface{})
					target, _ = remote["name"].(string)
				}
				if target == "" {
					foreign, _ := using["foreign_key_constraint_on"].(string)
					for i := 0; i < model.Type.NumField(); i++ {
						member := model.Type.Field(i)
						memberName := member.Tag.Get("db")
						if memberName != field && memberName != strings.TrimSuffix(foreign, "_id") {
							continue
						}
						memberType := member.Type
						if memberType.Kind() == reflect.Pointer {
							memberType = memberType.Elem()
						}
						target = types[memberType]
					}
				}
				for _, binding := range model.Policy.Relationships {
					if binding.Name == field {
						declared := binding.Target.AuthorizationPolicy().Table.Name
						if target != "" && target != declared {
							return result, nil, fmt.Errorf("%s.%s: relationship conflicts with typed binding", tableName, field)
						}
						target = declared
					}
				}
				if _, exists := policies[target]; !exists {
					return result, nil, fmt.Errorf("%s.%s: add a typed RelationshipBinding; target is unknown", tableName, field)
				}
				descriptor.Relationships[field] = target
				// Category paths already identify their owning relationship. Bind
				// its local FK to the related model's declared lookup, including
				// GraphQL column aliases, without a handwritten FK/target registry.
				categoryRelationship := false
				for _, rule := range []Rule{model.Policy.Read, model.Policy.Write} {
					categoryRelationship = categoryRelationship || rule.ByValue != nil && len(rule.ByValue.Path) > 1 && rule.ByValue.Path[0] == field
				}
				if categoryRelationship {
					lookup := policies[target].Policy.Lookup
					if kind != "object_relationships" || lookup == nil {
						return result, nil, fmt.Errorf("%s.%s: a category relationship needs an object target with a declared value lookup", tableName, field)
					}
					foreign, _ := using["foreign_key_constraint_on"].(string)
					if manual, ok := using["manual_configuration"].(map[string]interface{}); ok {
						mapping, _ := manual["column_mapping"].(map[string]interface{})
						if len(mapping) == 1 {
							for column, remote := range mapping {
								if remote == lookup.Column {
									foreign = column
								}
							}
						}
					}
					found := false
					for graphql, column := range descriptor.Columns {
						if column == foreign {
							if existing, bound := descriptor.Lookups[graphql]; bound && existing != *lookup {
								return result, nil, fmt.Errorf("%s.%s: conflicting row and relationship value lookups", tableName, graphql)
							}
							descriptor.Lookups[graphql] = *lookup
							found = true
						}
					}
					if !found {
						return result, nil, fmt.Errorf("%s.%s: category lookup requires a single local foreign-key column", tableName, field)
					}
				}
			}
		}
		for _, rule := range []Rule{model.Policy.Read, model.Policy.Write} {
			count := 0
			if rule.Public {
				count++
			}
			if rule.Permission != "" {
				count++
			}
			if rule.ByValue != nil {
				count++
			}
			if count > 1 {
				return result, nil, fmt.Errorf("%s: ambiguous permission rule", tableName)
			}
			permissions := []string{}
			if rule.Permission != "" {
				permissions = append(permissions, rule.Permission)
			}
			if rule.ByValue != nil {
				if len(rule.ByValue.Path) == 0 || len(rule.ByValue.Cases) == 0 {
					return result, nil, fmt.Errorf("%s: empty category rule", tableName)
				}
				for _, item := range rule.ByValue.Cases {
					permissions = append(permissions, item.Permission)
				}
			}
			for _, permission := range permissions {
				if !known[permission] {
					return result, nil, fmt.Errorf("%s: unknown permission %s", tableName, permission)
				}
			}
		}
		for _, fieldRule := range model.Policy.FieldReads {
			if !known[fieldRule.Permission] {
				return result, nil, fmt.Errorf("%s: unknown field permission %s", tableName, fieldRule.Permission)
			}
			for _, field := range fieldRule.Fields {
				if (field.Column == "") == (field.ComputedField == "") {
					return result, nil, fmt.Errorf("%s: field must identify one column or computed field", tableName)
				}
				if field.Column != "" && descriptor.JSONFields[field.Column] == "" || field.ComputedField != "" && !descriptor.Computed[field.ComputedField] {
					return result, nil, fmt.Errorf("%s: unknown protected field %+v", tableName, field)
				}
			}
		}
		result.Tables[tableName] = descriptor
		graphql, _ := config["custom_name"].(string)
		if graphql == "" {
			graphql = tableName
		}
		customRoots, _ := config["custom_root_fields"].(map[string]interface{})
		for operation, root := range map[string]string{"select": graphql, "select_by_pk": graphql + "_by_pk", "select_aggregate": graphql + "_aggregate", "select_stream": graphql + "_stream", "insert": "insert_" + graphql, "insert_one": "insert_" + graphql + "_one", "update": "update_" + graphql, "update_by_pk": "update_" + graphql + "_by_pk", "update_many": "update_" + graphql + "_many", "delete": "delete_" + graphql, "delete_by_pk": "delete_" + graphql + "_by_pk"} {
			if configured, ok := customRoots[operation].(string); ok && configured != "" {
				root = configured
			}
			access := "write"
			if strings.HasPrefix(operation, "select") {
				access = "read"
			}
			result.Roots[root] = Root{Table: tableName, Access: access}
		}
		for _, action := range model.Policy.Actions {
			for key, existing := range actions {
				if existing.Handler == action.Handler {
					// Dynamic target checks augment the endpoint's static requirements.
					// Otherwise a later Action could fail after an earlier one ran.
					combined := action
					permissions := map[string]bool{}
					for _, permission := range append(append([]string{}, existing.Permissions...), action.Permissions...) {
						permissions[permission] = true
					}
					combined.Permissions = []string{}
					for permission := range permissions {
						combined.Permissions = append(combined.Permissions, permission)
					}
					sort.Strings(combined.Permissions)
					result.Actions[key] = combined
				}
			}
		}
	}
	// Validate paths only after every table has been described, so ordering of
	// source files cannot affect resolution or generated output.
	for name, table := range result.Tables {
		if len(table.Policy.OperationPath) > 0 && len(table.Policy.OperationPaths) > 0 {
			return result, nil, fmt.Errorf("%s: use either OperationPath or OperationPaths, not both", name)
		}
		paths := append([][]string(nil), table.Policy.operationPaths()...)
		for _, path := range paths {
			if len(path) == 0 {
				return result, nil, fmt.Errorf("%s: empty operation path", name)
			}
		}
		for _, rule := range []Rule{table.Policy.Read, table.Policy.Write} {
			if rule.ByValue != nil {
				paths = append(paths, rule.ByValue.Path)
			}
		}
		for _, fields := range paths {
			current := table
			for i, field := range fields {
				if i == len(fields)-1 {
					if _, ok := current.Columns[field]; !ok {
						return result, nil, fmt.Errorf("%s: unknown path %v", name, fields)
					}
				} else {
					target, ok := current.Relationships[field]
					if !ok {
						return result, nil, fmt.Errorf("%s: unknown relationship in %v", name, fields)
					}
					current = result.Tables[target]
				}
			}
		}
	}
	for name, action := range result.Actions {
		if action.Resource != "" {
			table, known := result.Tables[action.Resource]
			if !known || action.Access != "read" && action.Access != "write" {
				return result, nil, fmt.Errorf("%s: Action must identify a known resource and read/write access", name)
			}
			if action.Argument != "" && action.ValueArgument != "" {
				return result, nil, fmt.Errorf("%s: Action must use either an identifier argument or a direct category argument", name)
			}
			if action.Argument != "" && (table.Policy.Read.ByValue != nil || table.Policy.Write.ByValue != nil) && table.Policy.Lookup == nil {
				return result, nil, fmt.Errorf("%s: category-dependent Action resource %s needs a value lookup", name, action.Resource)
			}
		}
		if _, duplicate := result.Roots[name]; duplicate {
			return result, nil, fmt.Errorf("duplicate GraphQL root %s", name)
		}
		result.Roots[name] = Root{Action: name}
	}
	// The same roles serve sessions and API tokens. Inherited helper roles are
	// needed only when a model splits field visibility into separate grants.
	inherited := map[string][]string{}
	for _, name := range names {
		var table map[string]interface{}
		if err := yaml.Unmarshal(files[name], &table); err != nil {
			return result, nil, err
		}
		tableName := table["table"].(map[string]interface{})["name"].(string)
		policy := result.Tables[tableName].Policy
		for _, kind := range []string{"select", "insert", "update", "delete"} {
			original, _ := table[kind+"_permissions"].([]interface{})
			generated := []interface{}{}
			// A previously generated field split stores protected selections in
			// its component roles. Recover them before reapplying the model rule,
			// including when a rule was changed or removed since the last run.
			fieldSelections := map[string]map[string]map[string]bool{}
			if kind == "select" {
				for _, raw := range original {
					entry := raw.(map[string]interface{})
					comment, _ := entry["comment"].(string)
					if !strings.HasPrefix(comment, fieldComment) {
						continue
					}
					owner := strings.TrimPrefix(comment, fieldComment)
					if !strings.HasPrefix(entry["role"].(string), "authz_field_") || owner == "" {
						return result, nil, fmt.Errorf("%s: malformed generated field selection", tableName)
					}
					if fieldSelections[owner] == nil {
						fieldSelections[owner] = map[string]map[string]bool{"columns": {}, "computed_fields": {}}
					}
					permission := entry["permission"].(map[string]interface{})
					for _, field := range []string{"columns", "computed_fields"} {
						values, _ := permission[field].([]interface{})
						for _, value := range values {
							fieldSelections[owner][field][value.(string)] = true
						}
					}
				}
			}
			seenRoles := map[string]bool{}
			for _, raw := range original {
				entry := raw.(map[string]interface{})
				comment, _ := entry["comment"].(string)
				if kind == "select" && strings.HasPrefix(comment, fieldComment) {
					continue
				}
				role := entry["role"].(string)
				permission := entry["permission"].(map[string]interface{})
				if kind == "select" && strings.HasPrefix(role, "authz_base_") {
					role = strings.TrimPrefix(role, "authz_base_")
					entry["role"] = role
					for _, field := range []string{"columns", "computed_fields"} {
						values := map[string]bool{}
						current, _ := permission[field].([]interface{})
						for _, value := range current {
							values[value.(string)] = true
						}
						if selections := fieldSelections[role]; selections != nil {
							for name := range selections[field] {
								values[name] = true
							}
						}
						names := []string{}
						for name := range values {
							names = append(names, name)
						}
						sort.Strings(names)
						permission[field] = make([]interface{}, len(names))
						for i, name := range names {
							permission[field].([]interface{})[i] = name
						}
					}
					delete(fieldSelections, role)
				}
				if seenRoles[role] {
					return result, nil, fmt.Errorf("%s %s: duplicate %s permission", tableName, role, kind)
				}
				seenRoles[role] = true
				// Only the final term of a marked wrapper belongs to generation.
				// Never discover/remove predicates by guessing their claim names.
				if comment == scopeComment || strings.HasSuffix(comment, "\n"+scopeComment) {
					for _, key := range []string{"filter", "check"} {
						if _, present := permission[key]; !present {
							continue
						}
						wrapper, ok := permission[key].(map[string]interface{})
						terms, _ := wrapper["_and"].([]interface{})
						if !ok || len(wrapper) != 1 || len(terms) == 0 {
							return result, nil, fmt.Errorf("%s %s %s: generated %s wrapper is malformed", tableName, role, kind, key)
						}
						terms = terms[:len(terms)-1]
						permission[key] = map[string]interface{}{}
						if key == "check" {
							permission[key] = nil
						}
						if len(terms) == 1 {
							permission[key] = terms[0]
						} else if len(terms) > 1 {
							permission[key] = map[string]interface{}{"_and": terms}
						}
					}
					comment = strings.TrimSuffix(strings.TrimSuffix(comment, scopeComment), "\n")
					delete(entry, "comment")
					if comment != "" {
						entry["comment"] = comment
					}
				}
				// A root {} can intentionally allow all rows. Inside an OR it
				// bypasses sibling checks, and inside an AND it adds only noise.
				// Reject those source mistakes instead of silently simplifying them.
				sourcePermission := entry["permission"].(map[string]interface{})
				pending := []interface{}{sourcePermission["filter"], sourcePermission["check"]}
				for len(pending) > 0 {
					current := pending[len(pending)-1]
					pending = pending[:len(pending)-1]
					if expression, ok := current.(map[string]interface{}); ok {
						for field, value := range expression {
							switch field {
							case "_and", "_or":
								branches, ok := value.([]interface{})
								if !ok {
									return result, nil, fmt.Errorf("%s %s %s: %s must contain a list of row predicates", tableName, role, kind, field)
								}
								if field == "_and" && len(branches) == 0 {
									return result, nil, fmt.Errorf("%s %s %s: empty %s always passes; declare the intended row restriction explicitly", tableName, role, kind, field)
								}
								for _, branch := range branches {
									predicate, ok := branch.(map[string]interface{})
									if !ok || len(predicate) == 0 {
										return result, nil, fmt.Errorf("%s %s %s: empty branch in %s; declare the intended row restriction explicitly", tableName, role, kind, field)
									}
									pending = append(pending, predicate)
								}
							case "_not":
								pending = append(pending, value)
							case "_exists":
								if exists, ok := value.(map[string]interface{}); ok {
									pending = append(pending, exists["_where"])
								}
							default:
								// Column comparison operands can be arbitrary JSON;
								// only relationships contain further row predicates.
								if !strings.HasPrefix(field, "_") {
									pending = append(pending, value)
								}
							}
						}
					}
				}
				if role == "developer" {
					generated = append(generated, entry)
					continue
				}
				rule := policy.Write
				key := "filter"
				if kind == "select" {
					rule = policy.Read
				}
				if kind == "insert" {
					key = "check"
				}
				if !rule.Public && rule.Permission == "" && rule.ByValue == nil {
					return result, nil, fmt.Errorf("%s %s: missing permission rule", tableName, kind)
				}
				// Operation scope claims already contain only the selected/bound
				// operation. Their membership check supplies the boundary directly.
				guard := PermissionFilter(policy, rule)
				if rule.Public && len(policy.operationPaths()) > 0 {
					guard = operationFilter(policy, map[string]interface{}{"_eq": "X-Hasura-Current-Operation-Id"})
				}
				if len(guard) > 0 {
					keys := []string{key}
					if kind == "update" {
						// Check resulting rows as well as the rows selected for update.
						keys = append(keys, "check")
					}
					for _, key := range keys {
						terms := []interface{}{}
						if existing, ok := permission[key].(map[string]interface{}); ok && len(existing) > 0 {
							terms = append(terms, existing)
						}
						permission[key] = map[string]interface{}{"_and": append(terms, guard)}
					}
					entry["comment"] = scopeComment
					if comment != "" {
						entry["comment"] = comment + "\n" + scopeComment
					}
				}
				if kind != "select" || len(policy.FieldReads) == 0 {
					generated = append(generated, entry)
					continue
				}
				wrapper := role
				base := "authz_base_" + role
				entry["role"] = base
				if len(inherited[wrapper]) == 0 {
					inherited[wrapper] = []string{base}
				}
				protectedColumns, protectedComputed := map[string]bool{}, map[string]bool{}
				// Field components can narrow a role's existing fields, never add
				// fields that the underlying user role was not allowed to select.
				allowedFields := map[string]map[string]bool{}
				for _, kind := range []string{"columns", "computed_fields"} {
					allowedFields[kind] = map[string]bool{}
					if permission[kind] == "*" {
						values := []interface{}{}
						for _, column := range result.Tables[tableName].Columns {
							values = append(values, column)
						}
						sort.Slice(values, func(i, j int) bool { return values[i].(string) < values[j].(string) })
						permission[kind] = values
					}
					values, _ := permission[kind].([]interface{})
					for _, field := range values {
						allowedFields[kind][field.(string)] = true
					}
				}
				for i, fieldRule := range policy.FieldReads {
					component := fmt.Sprintf("authz_field_%s_%s_%d", wrapper, tableName, i)
					inherited[wrapper] = append(inherited[wrapper], component)
					columns, computed := []interface{}{}, []interface{}{}
					for _, field := range fieldRule.Fields {
						if field.Column != "" {
							if allowedFields["columns"][field.Column] {
								columns = append(columns, field.Column)
							}
							protectedColumns[field.Column] = true
						} else {
							if allowedFields["computed_fields"][field.ComputedField] {
								computed = append(computed, field.ComputedField)
							}
							protectedComputed[field.ComputedField] = true
						}
					}
					fieldFilter := PermissionFilter(policy, Rule{Permission: fieldRule.Permission})
					if baseFilter := permission["filter"].(map[string]interface{}); len(baseFilter) > 0 {
						fieldFilter = map[string]interface{}{"_and": []interface{}{baseFilter, fieldFilter}}
					}
					generated = append(generated, map[string]interface{}{"role": component, "comment": fieldComment + role, "permission": map[string]interface{}{
						"columns": columns, "computed_fields": computed, "allow_aggregations": permission["allow_aggregations"],
						"filter": fieldFilter,
					}})
				}
				for field, excluded := range map[string]map[string]bool{"columns": protectedColumns, "computed_fields": protectedComputed} {
					values, _ := permission[field].([]interface{})
					kept := []interface{}{}
					for _, value := range values {
						if !excluded[value.(string)] {
							kept = append(kept, value)
						}
					}
					// Stable ordering survives restoring a previous field split.
					sort.Slice(kept, func(i, j int) bool { return kept[i].(string) < kept[j].(string) })
					permission[field] = kept
				}
				generated = append(generated, entry)
			}
			if len(fieldSelections) > 0 {
				return result, nil, fmt.Errorf("%s: generated field selections have no base role", tableName)
			}
			if len(generated) > 0 {
				table[kind+"_permissions"] = generated
			}
		}
		encoded, err := yaml.Marshal(table)
		if err != nil {
			return result, nil, err
		}
		files[name] = encoded
	}
	var inheritedRoles []interface{}
	if err := yaml.Unmarshal(files["inherited_roles.yaml"], &inheritedRoles); err != nil {
		return result, nil, err
	}
	keptRoles := []interface{}{}
	for _, raw := range inheritedRoles {
		entry := raw.(map[string]interface{})
		members, _ := entry["role_set"].([]interface{})
		managed := false
		for _, member := range members {
			managed = managed || strings.HasPrefix(member.(string), "authz_base_")
		}
		if !managed {
			keptRoles = append(keptRoles, raw)
		}
	}
	inheritedRoles = keptRoles
	roles := []string{}
	for role := range inherited {
		roles = append(roles, role)
	}
	sort.Strings(roles)
	for _, role := range roles {
		sort.Strings(inherited[role])
		inheritedRoles = append(inheritedRoles, map[string]interface{}{"role_name": role, "role_set": inherited[role]})
	}
	encoded, err := yaml.Marshal(inheritedRoles)
	if err != nil {
		return result, nil, err
	}
	files["inherited_roles.yaml"] = encoded
	// Actions retain their existing shared roles. HTTP preflight and handlers
	// enforce the same scope declarations for token requests.
	// Table references in include manifests keep the same relative paths.
	for name := range files {
		if path.Clean(name) != name {
			return result, nil, fmt.Errorf("invalid metadata path %s", name)
		}
	}
	return result, files, nil
}
