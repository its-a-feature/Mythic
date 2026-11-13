package authorization_test

import (
	"errors"
	"fmt"
	"testing"

	"github.com/its-a-feature/Mythic/authorization"
)

func TestGraphQLOperationPathMutationBoundary(t *testing.T) {
	for _, test := range []struct {
		name    string
		paths   [][]string
		value   string
		invalid bool
	}{
		{name: "single path own operation", paths: [][]string{{"operation_id"}}, value: "7"},
		{name: "single path foreign operation", paths: [][]string{{"operation_id"}}, value: "9", invalid: true},
		{name: "alternative ownership requires row check", paths: [][]string{{"operation_id"}, {"payload", "operation_id"}}, value: "null"},
	} {
		t.Run(test.name, func(t *testing.T) {
			// Hasura enforces the complete resulting row for alternatives;
			// preflight must not reject null direct ownership on its own.
			metadata := authorization.Metadata{
				Tables: map[string]authorization.Table{"record": {
					Policy: authorization.ResourcePolicy{
						OperationPaths: test.paths,
						Write:          authorization.Rule{Permission: "payload.write"},
					},
				}},
				Roots: map[string]authorization.Root{"insert_record": {Table: "record", Access: "write"}},
			}
			request := authorization.GraphQLRequest{Query: fmt.Sprintf(`mutation{insert_record(objects:[{operation_id:%s}]){affected_rows}}`, test.value)}
			err := request.Authorize(metadata, authorization.Principal{APITokenID: 1, OperationID: 7, Scopes: map[string]bool{"payload.write": true}}, nil)
			if (err != nil) != test.invalid {
				t.Fatalf("invalid=%t, got %v", test.invalid, err)
			}
		})
	}
}

func TestGraphQLResourcePermissions(t *testing.T) {
	for _, test := range []struct {
		name, query string
		scopes      []string
		variables   map[string]interface{}
		missing     string
		invalid     bool
	}{
		{name: "root denial", query: `{credential {account}}`, scopes: []string{"task.read"}, missing: "credential.read"},
		{name: "empty rows still require permission", query: `{credential(where:{id:{_eq:-1}}){account}}`, missing: "credential.read"},
		{name: "nested relationship", query: `{task{credentials{credential_text}}}`, scopes: []string{"task.read"}, missing: "credential.read"},
		{name: "relationship predicate", query: `{task(where:{credentials:{account:{_eq:"alice"}}}){id}}`, scopes: []string{"task.read"}, missing: "credential.read"},
		{name: "relationship ordering", query: `{task(order_by:{credentials_aggregate:{count:desc}}){id}}`, scopes: []string{"task.read"}, missing: "credential.read"},
		{name: "fragments and aliases", query: `query {task{...Details}} fragment Details on task {secrets:credentials{account}}`, scopes: []string{"task.read"}, missing: "credential.read"},
		{name: "skipped relationship", query: `query($skip:Boolean!){task{credentials @skip(if:$skip){account}}}`, scopes: []string{"task.read"}, variables: map[string]interface{}{"skip": true}},
		{name: "default directive variable", query: `query($include:Boolean=false){task{credentials @include(if:$include){account}}}`, scopes: []string{"task.read"}},
		{name: "skipped fragment", query: `{task{...Secrets @skip(if:true)}} fragment Secrets on task{credentials{account}}`, scopes: []string{"task.read"}},
		{name: "skipped inline fragment", query: `{task{... on task @include(if:false){credentials{account}}}}`, scopes: []string{"task.read"}},
		{name: "nested mutation", query: `mutation{insert_task_one(object:{credentials:{data:[{account:"alice"}]}}){id}}`, scopes: []string{"task.write"}, missing: "credential.write"},
		{name: "mutation returning", query: `mutation{update_task(where:{},_set:{comment:"hi"}){returning{id}}}`, scopes: []string{"task.write"}, missing: "task.read"},
		{name: "unrestricted standard chat", query: `{chat_message{message}}`, scopes: []string{"chat.read"}},
		{name: "explicit AI category", query: `{chat_message(where:{channel:{channel_type:{_eq:"ai"}}}){message}}`, scopes: []string{"chat.read"}, missing: "chat-ai.read"},
		{name: "AI mutation needs AI write despite AI read", query: `mutation{update_chat_message(where:{channel:{channel_type:{_eq:"ai"}}},_set:{deleted:true}){affected_rows}}`, scopes: []string{"chat.write", "chat.read", "chat-ai.read"}, missing: "chat-ai.write"},
		{name: "both chat permissions absent", query: `{chat_message{message}}`, missing: "chat.read"},
		{name: "unknown root fails closed", query: `{a_new_unclassified_table{id}}`, scopes: []string{"task.read"}, invalid: true},
		{name: "cycles fail closed", query: `{task{...Loop}} fragment Loop on task {...Loop}`, scopes: []string{"task.read"}, invalid: true},
		{name: "different mutation operation", query: `mutation{insert_task_one(object:{operation_id:9}){id}}`, scopes: []string{"task.write", "task.read"}, invalid: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			scopes := map[string]bool{}
			for _, scope := range test.scopes {
				scopes[scope] = true
			}
			request := authorization.GraphQLRequest{Query: test.query, Variables: test.variables}
			err := request.Authorize(authorization.Current, authorization.Principal{APITokenID: 1, OperationID: 7, Scopes: scopes}, nil)
			if test.invalid {
				if err == nil {
					t.Fatal("expected a fail-closed validation error")
				}
				return
			}
			if test.missing == "" {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			var missing *authorization.MissingScopesError
			if !errors.As(err, &missing) {
				t.Fatalf("expected missing-scope error, got %v", err)
			}
			for _, scope := range missing.Scopes {
				if scope == test.missing {
					return
				}
			}
			t.Fatalf("missing scopes %v did not include %s", missing.Scopes, test.missing)
		})
	}
}

func TestGraphQLUsesDeclaredResourceLookups(t *testing.T) {
	// This resource deliberately uses non-chat names and a non-id identifier.
	// The same declarations must drive native predicates, PKs and Actions.
	lookup := authorization.ValueLookup{Column: "record_key", Query: "SELECT kind FROM vault_record WHERE record_key=$1 AND operation_id=$2"}
	resource := authorization.Table{
		Policy: authorization.ResourcePolicy{
			Table:         authorization.TableRef{Schema: "public", Name: "vault_record"},
			OperationPath: []string{"operation_id"}, Lookup: &lookup,
			Read: authorization.Rule{ByValue: &authorization.ValueRule{Path: []string{"kind"}, Cases: []authorization.ValueCase{
				{Value: "ordinary", Permission: "record.read"}, {Value: "sensitive", Permission: "record-sensitive.read"},
			}}},
			Write: authorization.Rule{ByValue: &authorization.ValueRule{Path: []string{"kind"}, Cases: []authorization.ValueCase{
				{Value: "ordinary", Permission: "record.write"}, {Value: "sensitive", Permission: "record-sensitive.write"},
			}}},
		},
		Columns: map[string]string{"record_key": "record_key", "kind": "kind", "operation_id": "operation_id"},
		Lookups: map[string]authorization.ValueLookup{"record_key": lookup},
	}
	metadata := authorization.Metadata{
		Tables: map[string]authorization.Table{
			"vault_record": resource,
			"work_request": {Policy: authorization.ResourcePolicy{Write: authorization.Rule{Permission: "work-ai.write"}}},
		},
		Roots: map[string]authorization.Root{
			"records":             {Table: "vault_record", Access: "read"},
			"record_by_pk":        {Table: "vault_record", Access: "read"},
			"update_record_by_pk": {Table: "vault_record", Access: "write"},
			"insert_record_one":   {Table: "vault_record", Access: "write"},
			"editRecord":          {Action: "editRecord"}, "createRecord": {Action: "createRecord"},
			"searchRecords": {Action: "searchRecords"}, "retryWork": {Action: "retryWork"},
		},
		Actions: map[string]authorization.Action{
			"editRecord":    {Resource: "vault_record", Argument: "item_key", Access: "write"},
			"createRecord":  {Resource: "vault_record", ValueArgument: "kind", DefaultValue: "ordinary", Access: "write"},
			"searchRecords": {Resource: "vault_record", Argument: "item_key", Access: "read"},
			"retryWork":     {Resource: "work_request", Argument: "request_key", Access: "write"},
		},
	}
	for _, test := range []struct {
		name, query, missing string
		calls                int
		noResolver           bool
	}{
		{name: "native equality", query: `{records(where:{record_key:{_eq:53}}){record_key}}`, missing: "record-sensitive.read", calls: 1},
		{name: "native identifier list", query: `{records(where:{record_key:{_in:[53,54]}}){record_key}}`, missing: "record-sensitive.read", calls: 2},
		{name: "native primary key", query: `{record_by_pk(record_key:53){record_key}}`, missing: "record-sensitive.read", calls: 1},
		{name: "native update primary key", query: `mutation{update_record_by_pk(pk_columns:{record_key:53},_set:{kind:"ordinary"}){record_key}}`, missing: "record-sensitive.write", calls: 1},
		{name: "native inserted identifier", query: `mutation{insert_record_one(object:{record_key:53}){record_key}}`, missing: "record-sensitive.write", calls: 1},
		{name: "Action identifier", query: `mutation{editRecord(item_key:53){status}}`, missing: "record-sensitive.write", calls: 1},
		{name: "Action direct category", query: `mutation{createRecord(kind:"sensitive"){status}}`, missing: "record-sensitive.write"},
		{name: "Action category default", query: `mutation{createRecord{status}}`},
		{name: "optional search target", query: `{searchRecords{status}}`},
		{name: "static resource needs no lookup", query: `mutation{retryWork(request_key:53){status}}`, missing: "work-ai.write"},
		{name: "missing resolver fails closed", query: `{record_by_pk(record_key:53){record_key}}`, noResolver: true},
	} {
		t.Run(test.name, func(t *testing.T) {
			calls := 0
			var resolve authorization.TargetResolver = func(declared authorization.ValueLookup, id interface{}) (string, error) {
				calls++
				if declared != lookup || fmt.Sprint(id) != "53" && fmt.Sprint(id) != "54" {
					t.Fatalf("resolver received the wrong declaration or identifier: %+v %v", declared, id)
				}
				return "sensitive", nil
			}
			if test.noResolver {
				resolve = nil
			}
			request := authorization.GraphQLRequest{Query: test.query}
			err := request.Authorize(metadata, authorization.Principal{APITokenID: 1, OperationID: 7, Scopes: map[string]bool{"record.read": true, "record.write": true}}, resolve)
			if calls != test.calls {
				t.Fatalf("lookup calls: got %d, want %d", calls, test.calls)
			}
			if test.noResolver {
				if err == nil {
					t.Fatal("missing fact resolver was silently ignored")
				}
				return
			}
			if test.missing == "" {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			var missing *authorization.MissingScopesError
			if !errors.As(err, &missing) || len(missing.Scopes) != 1 || missing.Scopes[0] != test.missing {
				t.Fatalf("expected %s, got %v", test.missing, err)
			}
		})
	}
}

func TestCredentialFieldPermission(t *testing.T) {
	// Exercise the field rule even when its model block is commented out.
	metadata := authorization.Metadata{Tables: map[string]authorization.Table{}, Roots: authorization.Current.Roots, Actions: authorization.Current.Actions}
	for name, table := range authorization.Current.Tables {
		metadata.Tables[name] = table
	}
	table := metadata.Tables["credential"]
	table.Policy.FieldReads = []authorization.FieldReadRule{{Permission: authorization.SCOPE_CREDENTIAL_VALUE_READ, Fields: []authorization.FieldRef{{Column: "credential"}, {ComputedField: "credential_text"}}}}
	metadata.Tables["credential"] = table
	principal := authorization.Principal{APITokenID: 1, OperationID: 7, Scopes: map[string]bool{"credential.read": true}}
	for _, query := range []string{`{credential{account credential_raw credential_text}}`, `{credential_aggregate{aggregate{count}}}`, `{credential_aggregate{aggregate{max{credential_raw}}}}`} {
		request := authorization.GraphQLRequest{Query: query}
		if err := request.Authorize(metadata, principal, nil); err != nil {
			t.Fatal(err)
		}
	}
	for _, query := range []string{`{credential(where:{credential_text:{_eq:"secret"}}){account}}`, `{credential(order_by:{credential_raw:asc}){account}}`, `{credential(distinct_on:credential_raw){account}}`} {
		request := authorization.GraphQLRequest{Query: query}
		err := request.Authorize(metadata, principal, nil)
		var missing *authorization.MissingScopesError
		if !errors.As(err, &missing) {
			t.Fatalf("%s: expected field permission error, got %v", query, err)
		}
	}
	projected, err := authorization.ProjectFields(table, principal.Scopes, map[string]interface{}{"account": "alice", "credential": "secret", "credential_text": "secret"})
	if err != nil {
		t.Fatal(err)
	}
	if string(projected) != `{"account":"alice","credential":null,"credential_text":null}` {
		t.Fatalf("unexpected projection: %s", projected)
	}
}

func TestChatActionArgumentsChooseReadOrWrite(t *testing.T) {
	for _, test := range []struct {
		name, query string
		missing     string
	}{
		{name: "mute only", query: `mutation{chatUpdateChannel(channel_id:1,muted:true){status}}`},
		{name: "unmute with null unused argument", query: `mutation{chatUpdateChannel(channel_id:1,muted:false,name:null){status}}`},
		{name: "shared change alongside mute", query: `mutation{chatUpdateChannel(channel_id:1,muted:true,locked:false){status}}`, missing: "chat-ai.write"},
		{name: "shared name change", query: `mutation{chatUpdateChannel(channel_id:1,name:"updated"){status}}`, missing: "chat-ai.write"},
	} {
		t.Run(test.name, func(t *testing.T) {
			request := authorization.GraphQLRequest{Query: test.query}
			err := request.Authorize(authorization.Current, authorization.Principal{APITokenID: 1, OperationID: 7, Scopes: map[string]bool{"chat-ai.read": true}}, func(authorization.ValueLookup, interface{}) (string, error) { return "ai", nil })
			if test.missing == "" {
				if err != nil {
					t.Fatal(err)
				}
				return
			}
			var missing *authorization.MissingScopesError
			if !errors.As(err, &missing) || len(missing.Scopes) != 1 || missing.Scopes[0] != test.missing {
				t.Fatalf("expected %s, got %v", test.missing, err)
			}
		})
	}
}
