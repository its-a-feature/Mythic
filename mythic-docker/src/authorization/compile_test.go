package authorization_test

import (
	"bytes"
	"io/fs"
	"os"
	"strings"
	"testing"
	"testing/fstest"

	"github.com/its-a-feature/Mythic/authorization"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"gopkg.in/yaml.v3"
)

func TestCompileOperationPaths(t *testing.T) {
	for _, test := range []struct {
		name    string
		path    []string
		paths   [][]string
		message string
	}{
		{name: "alternative ownership", paths: [][]string{{"operation_id"}, {"payload", "operation_id"}}},
		{name: "single plural path", paths: [][]string{{"operation_id"}}},
		{name: "ambiguous fields", path: []string{"operation_id"}, paths: [][]string{{"payload", "operation_id"}}, message: "not both"},
		{name: "empty alternative", paths: [][]string{{"operation_id"}, {}}, message: "empty operation path"},
		{name: "unknown column", paths: [][]string{{"payload", "missing"}}, message: "unknown path"},
		{name: "unknown relationship", paths: [][]string{{"missing", "operation_id"}}, message: "unknown relationship"},
	} {
		t.Run(test.name, func(t *testing.T) {
			bindings := databaseStructs.AuthorizationBindings()
			for i := range bindings {
				if bindings[i].Policy.Table.Name == "buildparameterinstance" {
					bindings[i].Policy.OperationPath = test.path
					bindings[i].Policy.OperationPaths = test.paths
				}
			}
			_, files, err := authorization.Compile(bindings, os.DirFS("../../../hasura-docker/metadata"), nil, authorization.ScopeDefinitions())
			if test.message != "" {
				if err == nil || !strings.Contains(err.Error(), test.message) {
					t.Fatalf("expected %q, got %v", test.message, err)
				}
				return
			}
			if err != nil {
				t.Fatal(err)
			}
			source := fstest.MapFS{}
			for name, contents := range files {
				source[name] = &fstest.MapFile{Data: contents}
			}
			_, regenerated, err := authorization.Compile(bindings, source, nil, authorization.ScopeDefinitions())
			if err != nil {
				t.Fatal(err)
			}
			for name, contents := range files {
				if !bytes.Equal(contents, regenerated[name]) {
					t.Fatalf("repeated operation-path generation changed %s", name)
				}
			}
		})
	}
}

func TestCompileValidatesModelPermissions(t *testing.T) {
	// Exercise the actual compiler with authored metadata. Empty root filters
	// and JSON comparison operands remain valid; empty logical branches do not.
	source := fstest.MapFS{}
	metadata := os.DirFS("../../../hasura-docker/metadata")
	err := fs.WalkDir(metadata, ".", func(name string, entry fs.DirEntry, err error) error {
		if err != nil || entry.IsDir() {
			return err
		}
		contents, err := fs.ReadFile(metadata, name)
		if err == nil {
			source[name] = &fstest.MapFile{Data: contents}
		}
		return err
	})
	if err != nil {
		t.Fatal(err)
	}
	filename := "databases/default/tables/public_credential.yaml"
	original := source[filename].Data
	condition := map[string]interface{}{"operation_id": map[string]interface{}{"_eq": "X-Hasura-current-operation-id"}}
	for _, test := range []struct {
		name    string
		filter  map[string]interface{}
		invalid bool
	}{
		{name: "explicit unrestricted root", filter: map[string]interface{}{}},
		{name: "operation restriction", filter: condition},
		{name: "OR bypass", filter: map[string]interface{}{"_or": []interface{}{condition, map[string]interface{}{}}}, invalid: true},
		{name: "redundant AND", filter: map[string]interface{}{"_and": []interface{}{condition, map[string]interface{}{}}}, invalid: true},
		{name: "empty AND bypass", filter: map[string]interface{}{"_and": []interface{}{}}, invalid: true},
		{name: "nested relationship bypass", filter: map[string]interface{}{"task": map[string]interface{}{"_or": []interface{}{condition, map[string]interface{}{}}}}, invalid: true},
		{name: "JSON operand is data", filter: map[string]interface{}{"metadata": map[string]interface{}{"_contains": map[string]interface{}{"_or": []interface{}{map[string]interface{}{}}}}}},
		{name: "empty OR explicitly denies", filter: map[string]interface{}{"_or": []interface{}{}}},
		{name: "relationship existence is a real predicate", filter: map[string]interface{}{"task": map[string]interface{}{}}},
	} {
		t.Run(test.name, func(t *testing.T) {
			var table map[string]interface{}
			if err := yaml.Unmarshal(original, &table); err != nil {
				t.Fatal(err)
			}
			for _, raw := range table["select_permissions"].([]interface{}) {
				entry := raw.(map[string]interface{})
				if entry["role"] == "operator" || entry["role"] == "authz_base_operator" {
					// This case supplies a new authored filter, not an edited
					// generated wrapper from the repository's deployed metadata.
					delete(entry, "comment")
					entry["permission"].(map[string]interface{})["filter"] = test.filter
				}
			}
			contents, err := yaml.Marshal(table)
			if err != nil {
				t.Fatal(err)
			}
			source[filename] = &fstest.MapFile{Data: contents}
			_, _, err = authorization.Compile(databaseStructs.AuthorizationBindings(), source, nil, authorization.ScopeDefinitions())
			if test.invalid {
				if err == nil || !strings.Contains(err.Error(), "empty") {
					t.Fatalf("expected invalid empty row predicate, got %v", err)
				}
			} else if err != nil {
				t.Fatal(err)
			}
		})
	}
	for _, test := range []struct {
		name, column, query, message string
		missingLookup                bool
	}{
		{name: "lookup operation parameter required", column: "id", query: "SELECT channel_type FROM chat_channel WHERE id=$1", message: "operation parameters"},
		{name: "lookup identifier column must exist", column: "missing_key", query: "SELECT channel_type FROM chat_channel WHERE id=$1 AND operation_id=$2", message: "unknown value lookup column"},
		{name: "category relation needs a lookup", missingLookup: true, message: "declared value lookup"},
	} {
		t.Run(test.name, func(t *testing.T) {
			bindings := databaseStructs.AuthorizationBindings()
			for i := range bindings {
				if bindings[i].Policy.Table.Name == "chat_channel" {
					bindings[i].Policy.Lookup = &authorization.ValueLookup{Column: test.column, Query: test.query}
					if test.missingLookup {
						bindings[i].Policy.Lookup = nil
					}
				}
			}
			_, _, err := authorization.Compile(bindings, source, nil, authorization.ScopeDefinitions())
			if err == nil || !strings.Contains(err.Error(), test.message) {
				t.Fatalf("expected %s, got %v", test.message, err)
			}
		})
	}
	// A GraphQL rename must follow the metadata FK, not a hardcoded channel_id.
	var messages map[string]interface{}
	messageFile := "databases/default/tables/public_chat_message.yaml"
	if err = yaml.Unmarshal(source[messageFile].Data, &messages); err != nil {
		t.Fatal(err)
	}
	messages["configuration"] = map[string]interface{}{"column_config": map[string]interface{}{
		"channel_id": map[string]interface{}{"custom_name": "discussion_key"},
	}}
	encoded, err := yaml.Marshal(messages)
	if err != nil {
		t.Fatal(err)
	}
	source[messageFile] = &fstest.MapFile{Data: encoded}
	metadataIndex, _, err := authorization.Compile(databaseStructs.AuthorizationBindings(), source, nil, authorization.ScopeDefinitions())
	if err != nil {
		t.Fatal(err)
	}
	messageTable := metadataIndex.Tables["chat_message"]
	if messageTable.Lookups["discussion_key"] != *metadataIndex.Tables["chat_channel"].Policy.Lookup || messageTable.Lookups["id"] != *messageTable.Policy.Lookup {
		t.Fatalf("row/relationship lookups were not derived from the declarations: %v", messageTable.Lookups)
	}
	if _, obsolete := messageTable.Lookups["channel_id"]; obsolete {
		t.Fatal("lookup binding ignored the GraphQL alias")
	}
}

func TestSharedRoleGenerationIsRepeatable(t *testing.T) {
	bindings := databaseStructs.AuthorizationBindings()
	_, files, err := authorization.Compile(bindings, os.DirFS("../../../hasura-docker/metadata"), nil, authorization.ScopeDefinitions())
	if err != nil {
		t.Fatal(err)
	}
	source := fstest.MapFS{}
	for name, contents := range files {
		source[name] = &fstest.MapFile{Data: contents}
		if !strings.HasPrefix(name, "databases/default/tables/public_") {
			continue
		}
		var table map[string]interface{}
		if err = yaml.Unmarshal(contents, &table); err != nil {
			t.Fatal(err)
		}
		for _, kind := range []string{"select", "insert", "update", "delete"} {
			entries, _ := table[kind+"_permissions"].([]interface{})
			for _, raw := range entries {
				role := raw.(map[string]interface{})["role"].(string)
				if strings.HasPrefix(role, "token_") {
					t.Fatalf("%s introduced a separate token role %s", name, role)
				}
			}
		}
	}
	_, regenerated, err := authorization.Compile(bindings, source, nil, authorization.ScopeDefinitions())
	if err != nil {
		t.Fatal(err)
	}
	for name, expected := range files {
		if !bytes.Equal(regenerated[name], expected) {
			t.Fatalf("repeated generation changed %s", name)
		}
	}
	// Changing the Go rule must replace its previous guard, while retaining the
	// authored operation condition in the same shared operator permission.
	for i := range bindings {
		if bindings[i].Policy.Table.Name == "credential" {
			bindings[i].Policy.Read.Permission = authorization.SCOPE_TASK_READ
		}
	}
	_, changed, err := authorization.Compile(bindings, source, nil, authorization.ScopeDefinitions())
	if err != nil {
		t.Fatal(err)
	}
	var credential map[string]interface{}
	if err = yaml.Unmarshal(changed["databases/default/tables/public_credential.yaml"], &credential); err != nil {
		t.Fatal(err)
	}
	checked := false
	for _, raw := range credential["select_permissions"].([]interface{}) {
		entry := raw.(map[string]interface{})
		if entry["role"] != "operator" && entry["role"] != "authz_base_operator" {
			continue
		}
		terms := entry["permission"].(map[string]interface{})["filter"].(map[string]interface{})["_and"].([]interface{})
		if len(terms) != 2 {
			t.Fatalf("scope guards accumulated: %v", terms)
		}
		boundary := terms[0].(map[string]interface{})["operation_id"].(map[string]interface{})
		guard := terms[1].(map[string]interface{})["operation_id"].(map[string]interface{})
		if boundary["_eq"] != "X-Hasura-current-operation-id" || guard["_in"] != authorization.ClaimName(authorization.SCOPE_TASK_READ, true) {
			t.Fatalf("changed rule lost its authored restriction or kept an obsolete grant: %v", terms)
		}
		checked = true
	}
	if !checked {
		t.Fatal("operator's row restrictions were not checked")
	}
}

func TestSharedFieldRulesCanBeRegeneratedAndRemoved(t *testing.T) {
	bindings := databaseStructs.AuthorizationBindings()
	for i := range bindings {
		if bindings[i].Policy.Table.Name == "credential" {
			bindings[i].Policy.FieldReads = []authorization.FieldReadRule{{Fields: databaseStructs.CredentialValueFields, Permission: authorization.SCOPE_CREDENTIAL_VALUE_READ}}
		}
	}
	catalog := authorization.ScopeDefinitions()
	_, files, err := authorization.Compile(bindings, os.DirFS("../../../hasura-docker/metadata"), nil, catalog)
	if err != nil {
		t.Fatal(err)
	}
	source := fstest.MapFS{}
	for name, contents := range files {
		source[name] = &fstest.MapFile{Data: contents}
	}
	_, regenerated, err := authorization.Compile(bindings, source, nil, catalog)
	if err != nil {
		t.Fatal(err)
	}
	for name, expected := range files {
		if !bytes.Equal(regenerated[name], expected) {
			t.Fatalf("repeated field-rule generation changed %s", name)
		}
	}
	// Deactivating a field rule restores its fields to the shared role and
	// removes only the helper roles that belonged to the generated split.
	disabled := append([]authorization.ModelBinding(nil), bindings...)
	for i := range disabled {
		if disabled[i].Policy.Table.Name == "credential" {
			disabled[i].Policy.FieldReads = nil
		}
	}
	_, restored, err := authorization.Compile(disabled, source, nil, catalog)
	if err != nil {
		t.Fatal(err)
	}
	if string(restored["inherited_roles.yaml"]) != "[]\n" {
		t.Fatalf("obsolete field helper roles remained: %s", restored["inherited_roles.yaml"])
	}
	var credential map[string]interface{}
	if err = yaml.Unmarshal(restored["databases/default/tables/public_credential.yaml"], &credential); err != nil {
		t.Fatal(err)
	}
	for _, raw := range credential["select_permissions"].([]interface{}) {
		entry := raw.(map[string]interface{})
		if strings.HasPrefix(entry["role"].(string), "authz_") {
			t.Fatalf("obsolete field permission remained: %v", entry)
		}
		permission := entry["permission"].(map[string]interface{})
		rawValue, textValue := false, false
		for _, field := range permission["columns"].([]interface{}) {
			rawValue = rawValue || field == "credential"
		}
		for _, field := range permission["computed_fields"].([]interface{}) {
			textValue = textValue || field == "credential_text"
		}
		if !rawValue || !textValue {
			t.Fatalf("removing field rule lost previously allowed selections: %v", entry)
		}
	}
	for name, contents := range restored {
		source[name] = &fstest.MapFile{Data: contents}
	}
	_, reenabled, err := authorization.Compile(bindings, source, nil, catalog)
	if err != nil {
		t.Fatal(err)
	}
	for name, expected := range files {
		if !bytes.Equal(reenabled[name], expected) {
			t.Fatalf("re-enabling the field block changed %s", name)
		}
	}
}
