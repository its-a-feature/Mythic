package webcontroller

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"net"
	"net/http"
	"net/http/httptest"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"sync/atomic"
	"testing"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/its-a-feature/Mythic/authentication"
	"github.com/its-a-feature/Mythic/authentication/mythicjwt"
	"github.com/its-a-feature/Mythic/authorization"
	"github.com/its-a-feature/Mythic/database"
	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/its-a-feature/Mythic/rabbitmq"
	"github.com/its-a-feature/Mythic/utils"
	"github.com/jmoiron/sqlx"
	migrate "github.com/rubenv/sql-migrate"
	"github.com/vektah/gqlparser/v2/ast"
	"github.com/vektah/gqlparser/v2/parser"
	"golang.org/x/net/websocket"
	"gopkg.in/yaml.v3"
)

// This fixture exercises credential.value.read through the production compiler,
// webhook, and Hasura. It also runs when the model's field block is commented
// out by enabling that block locally. No running Mythic database is modified.
func TestAuthorizationIntegration(t *testing.T) {
	if os.Getenv("MYTHIC_AUTH_TEST_DOCKER") != "1" {
		t.Skip("set MYTHIC_AUTH_TEST_DOCKER=1 to run disposable PostgreSQL/Hasura authorization tests")
	}
	run := func(args ...string) string {
		t.Helper()
		output, err := exec.Command("docker", args...).CombinedOutput()
		if err != nil {
			t.Fatalf("docker %s: %v\n%s", strings.Join(args, " "), err, output)
		}
		return strings.TrimSpace(string(output))
	}
	fixture := fmt.Sprintf("mythic-auth-%d", time.Now().UnixNano())
	run("network", "create", fixture)
	t.Cleanup(func() { exec.Command("docker", "network", "rm", fixture).Run() })
	postgres := fixture + "-postgres"
	// The production image's optional init hook moves a root-owned pg_hba file.
	// This empty temporary mount leaves the stock PostgreSQL test bootstrap intact.
	run("run", "--detach", "--name", postgres, "--network", fixture, "--tmpfs", "/docker-entrypoint-initdb.d", "--publish", "127.0.0.1::5432", "--env", "POSTGRES_PASSWORD=fixture-password", "--env", "POSTGRES_DB=authorization_fixture", "mythic_postgres:latest")
	t.Cleanup(func() { exec.Command("docker", "rm", "--force", postgres).Run() })
	postgresAddress := run("port", postgres, "5432/tcp")
	dsn := "postgres://postgres:fixture-password@" + postgresAddress + "/authorization_fixture?sslmode=disable"
	db, err := sqlx.Open("postgres", dsn)
	if err != nil {
		t.Fatal(err)
	}
	t.Cleanup(func() { db.Close() })
	deadline := time.Now().Add(30 * time.Second)
	for db.Ping() != nil {
		if time.Now().After(deadline) {
			t.Fatal("disposable PostgreSQL did not become ready: ", run("logs", postgres))
		}
		time.Sleep(100 * time.Millisecond)
	}
	if _, err = db.Exec(database.Schema); err != nil {
		t.Fatal("initial schema:", err)
	}
	// The bootstrap dump clears search_path; production reconnects afterward.
	if _, err = db.Exec(`SET search_path TO public`); err != nil {
		t.Fatal(err)
	}
	migrations := &migrate.FileMigrationSource{Dir: "../../database/migrations"}
	migrate.SetSchema("public")
	migrate.SetTable("mythic_server_migration_tracking")
	if _, err = migrate.ExecVersion(db.DB, "postgres", migrations, migrate.Up, 3003027); err != nil {
		t.Fatal("base migrations:", err)
	}
	var ownerID, operationID, otherOperation int
	if err = db.Get(&ownerID, `INSERT INTO operator(username,password,salt,active) VALUES('fixture-owner','fixture-password','fixture-salt',true) RETURNING id`); err != nil {
		t.Fatal(err)
	}
	if err = db.Get(&operationID, `INSERT INTO operation(name,admin_id) VALUES('fixture-operation',$1) RETURNING id`, ownerID); err != nil {
		t.Fatal(err)
	}
	if err = db.Get(&otherOperation, `INSERT INTO operation(name,admin_id) VALUES('other-operation',$1) RETURNING id`, ownerID); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`INSERT INTO operatoroperation(operator_id,operation_id,view_mode) VALUES($1,$2,'operator'),($1,$3,'operator')`, ownerID, operationID, otherOperation); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`UPDATE operator SET current_operation_id=$2 WHERE id=$1`, ownerID, otherOperation); err != nil {
		t.Fatal(err)
	}
	if _, err = migrate.ExecVersion(db.DB, "postgres", migrations, migrate.Up, 3003028); err != nil {
		t.Fatal("authorization migration:", err)
	}
	var active bool
	// New credentials require an operation and concrete grants at the DB
	// boundary too. This fixture does not depend on legacy-token migration.
	if _, err = db.Exec(`INSERT INTO apitokens(operator_id,token_type,token_value,active,name,scopes) VALUES($1,'api','invalid-operation-fixture',true,'invalid operation',ARRAY['credential.read'])`, ownerID); err == nil {
		t.Fatal("database accepted an active token without an operation")
	}
	if _, err = db.Exec(`INSERT INTO apitokens(operator_id,operation_id,token_type,token_value,active,name) VALUES($1,$2,'api','invalid-scopes-fixture',true,'invalid scopes')`, ownerID, operationID); err == nil {
		t.Fatal("database accepted an active token without concrete scopes")
	}
	previousDB, previousConfig, previousMetadata := database.DB, utils.MythicConfig, authorization.Current
	database.DB = db
	utils.MythicConfig.JWTSecret = []byte("authorization-fixture-signing-key")
	t.Cleanup(func() {
		database.DB = previousDB
		utils.MythicConfig = previousConfig
		authorization.Current = previousMetadata
	})
	bindings := databaseStructs.AuthorizationBindings()
	if _, err = db.Exec(`CREATE SEQUENCE authorization_lookup_calls`); err != nil {
		t.Fatal(err)
	}
	for i := range bindings {
		if bindings[i].Policy.Table.Name == "credential" {
			bindings[i].Policy.FieldReads = []authorization.FieldReadRule{{Fields: databaseStructs.CredentialValueFields, Permission: authorization.SCOPE_CREDENTIAL_VALUE_READ}}
		}
		if bindings[i].Policy.Table.Name == "chat_channel" {
			// Count successful fact lookups without changing the returned category
			// or operation predicates. Hasura never executes this preflight query.
			bindings[i].Policy.Lookup.Query = strings.Replace(bindings[i].Policy.Lookup.Query,
				"SELECT channel_type", "SELECT CASE WHEN nextval('authorization_lookup_calls')>0 THEN channel_type END", 1)
		}
	}
	catalog := authorization.ScopeDefinitions()
	metadata, generated, err := authorization.Compile(bindings, os.DirFS("../../../../hasura-docker/metadata"), previousMetadata.Actions, catalog)
	if err != nil {
		t.Fatal(err)
	}
	authorization.Current = metadata
	router := gin.New()
	var authHookCalls, actionCalls, actionSecretLeaks atomic.Int64
	router.Use(func(c *gin.Context) {
		if strings.HasSuffix(c.FullPath(), "_webhook") {
			actionCalls.Add(1)
			body, err := io.ReadAll(c.Request.Body)
			if err != nil {
				t.Error(err)
			}
			c.Request.Body = io.NopCloser(bytes.NewReader(body))
			// Neither forwarded headers nor Action session_variables may carry
			// an administrative Hasura credential onward to an Action handler.
			if c.GetHeader("X-Hasura-Admin-Secret") != "" || c.GetHeader("X-Hasura-Access-Key") != "" || bytes.Contains(body, []byte("fixture-admin-secret")) {
				actionSecretLeaks.Add(1)
			}
		}
		c.Next()
	})
	router.POST("/graphql/webhook", func(c *gin.Context) {
		authHookCalls.Add(1)
		c.Next()
	}, authentication.JwtAuthMiddleware(), GetHasuraClaims)
	router.POST("/generate_apitoken_webhook", authentication.JwtAuthMiddleware(), authentication.TokenScopeMiddleware([]string{authorization.SCOPE_APITOKEN_WRITE}), GenerateAPITokenWebhook)
	router.POST("/update_credential_webhook", authentication.JwtAuthMiddleware(), authentication.RBACMiddlewareNoSpectators(), authentication.TokenScopeMiddleware([]string{authorization.SCOPE_CREDENTIAL_WRITE}), UpdateCredentialWebhook)
	router.POST("/chat_update_channel_webhook", authentication.JwtAuthMiddleware(), authentication.RBACMiddlewareAll(), UpdateChatChannelWebhook)
	router.POST("/scope_check_webhook", authentication.JwtAuthMiddleware(), authentication.TokenScopeMiddleware(nil), ScopeCheckWebhook)
	router.POST("/apitoken_scope_definitions_webhook", authentication.JwtAuthMiddleware(), authentication.TokenScopeMiddleware(nil), APITokenScopeDefinitionsWebhook)
	server := httptest.NewUnstartedServer(router)
	server.Listener, err = net.Listen("tcp", "0.0.0.0:0")
	if err != nil {
		t.Fatal(err)
	}
	server.Start()
	t.Cleanup(server.Close)
	_, hookPort, _ := net.SplitHostPort(server.Listener.Addr().String())
	server.URL = "http://127.0.0.1:" + hookPort
	hasura := fixture + "-hasura"
	internalDSN := "postgres://postgres:fixture-password@" + postgres + ":5432/authorization_fixture?sslmode=disable"
	run("run", "--detach", "--name", hasura, "--network", fixture, "--publish", "127.0.0.1::8080", "--env", "HASURA_GRAPHQL_DATABASE_URL="+internalDSN, "--env", "HASURA_GRAPHQL_METADATA_DATABASE_URL="+internalDSN, "--env", "HASURA_GRAPHQL_ADMIN_SECRET=fixture-admin-secret", "--env", "HASURA_GRAPHQL_SERVER_PORT=8080", "--env", "HASURA_GRAPHQL_AUTH_HOOK=http://host.docker.internal:"+hookPort+"/graphql/webhook", "--env", "HASURA_GRAPHQL_AUTH_HOOK_MODE=POST", "--env", "HASURA_GRAPHQL_AUTH_HOOK_SEND_REQUEST_BODY=true", "--env", "MYTHIC_ACTIONS_URL_BASE=http://host.docker.internal:"+hookPort, "--entrypoint", "graphql-engine", "mythic_graphql:latest", "serve")
	t.Cleanup(func() { exec.Command("docker", "rm", "--force", hasura).Run() })
	hasuraAddress := run("port", hasura, "8080/tcp")
	client := &http.Client{Timeout: 10 * time.Second}
	deadline = time.Now().Add(40 * time.Second)
	for {
		response, err := client.Get("http://" + hasuraAddress + "/healthz")
		if err == nil {
			response.Body.Close()
			if response.StatusCode == 200 {
				break
			}
		}
		if time.Now().After(deadline) {
			t.Fatal("disposable Hasura did not become ready:", run("logs", hasura))
		}
		time.Sleep(100 * time.Millisecond)
	}
	tables := []interface{}{}
	for name, contents := range generated {
		if strings.HasPrefix(name, "databases/default/tables/public_") && strings.HasSuffix(name, ".yaml") {
			var table interface{}
			if err = yaml.Unmarshal(contents, &table); err != nil {
				t.Fatal(err)
			}
			tables = append(tables, table)
		}
	}
	var actions map[string]interface{}
	if err = yaml.Unmarshal(generated["actions.yaml"], &actions); err != nil {
		t.Fatal(err)
	}
	// Hasura CLI normally merges actions.graphql into actions.yaml on apply.
	// Exercise the same authored SDL here without requiring a CLI or snapshot.
	schema, err := parser.ParseSchema(&ast.Source{Input: string(generated["actions.graphql"])})
	if err != nil {
		t.Fatal(err)
	}
	customTypes := map[string]interface{}{"input_objects": []interface{}{}, "objects": []interface{}{}, "scalars": []interface{}{}, "enums": []interface{}{}}
	for _, definition := range schema.Definitions {
		if definition.Name == "Query" || definition.Name == "Mutation" {
			for _, field := range definition.Fields {
				for _, raw := range actions["actions"].([]interface{}) {
					action := raw.(map[string]interface{})
					if action["name"] != field.Name {
						continue
					}
					config := action["definition"].(map[string]interface{})
					config["type"] = strings.ToLower(definition.Name)
					config["output_type"] = field.Type.String()
					arguments := []interface{}{}
					for _, argument := range field.Arguments {
						arguments = append(arguments, map[string]interface{}{"name": argument.Name, "type": argument.Type.String()})
					}
					config["arguments"] = arguments
				}
			}
			continue
		}
		entry := map[string]interface{}{"name": definition.Name}
		kind := ""
		switch definition.Kind {
		case ast.InputObject, ast.Object:
			kind = "objects"
			if definition.Kind == ast.InputObject {
				kind = "input_objects"
			}
			fields := []interface{}{}
			for _, field := range definition.Fields {
				fields = append(fields, map[string]interface{}{"name": field.Name, "type": field.Type.String()})
			}
			entry["fields"] = fields
		case ast.Scalar:
			kind = "scalars"
		case ast.Enum:
			kind = "enums"
			values := []interface{}{}
			for _, value := range definition.EnumValues {
				values = append(values, map[string]interface{}{"value": value.Name})
			}
			entry["values"] = values
		default:
			t.Fatalf("unsupported Action SDL type %s", definition.Name)
		}
		customTypes[kind] = append(customTypes[kind].([]interface{}), entry)
	}
	actions["custom_types"] = customTypes
	var inherited interface{}
	if err = yaml.Unmarshal(generated["inherited_roles.yaml"], &inherited); err != nil {
		t.Fatal(err)
	}
	fullMetadata := map[string]interface{}{"version": 3, "sources": []interface{}{map[string]interface{}{"name": "default", "kind": "postgres", "configuration": map[string]interface{}{"connection_info": map[string]interface{}{"database_url": internalDSN}}, "tables": tables}}, "actions": actions["actions"], "custom_types": actions["custom_types"], "inherited_roles": inherited}
	payload, _ := json.Marshal(map[string]interface{}{"type": "replace_metadata", "args": map[string]interface{}{"allow_inconsistent_metadata": false, "metadata": fullMetadata}})
	request, _ := http.NewRequest("POST", "http://"+hasuraAddress+"/v1/metadata", bytes.NewReader(payload))
	request.Header.Set("Content-Type", "application/json")
	request.Header.Set("X-Hasura-Admin-Secret", "fixture-admin-secret")
	response, err := client.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	body, _ := io.ReadAll(response.Body)
	response.Body.Close()
	if response.StatusCode != 200 {
		t.Fatalf("generated metadata was rejected: %s", body)
	}
	t.Log("Generated metadata accepted by real Hasura, including credential value field roles")
	create := func(scopes []string) (string, databaseStructs.Apitokens) {
		t.Helper()
		token := databaseStructs.Apitokens{OperatorID: ownerID, OperationID: operationID, CreatedBy: ownerID, TokenType: "api", Name: "fixture token", Active: true}
		plain, err := database.CreateAPIToken(&token, scopes, map[string]bool{"*": true}, token.OperationID)
		if err != nil {
			t.Fatal(err)
		}
		return plain, token
	}
	readToken, readRecord := create([]string{" Credential.Read "})
	// Request helpers reuse the authenticated owner and explicit token operation;
	// login summaries use the same SQL lookup with the owner's actual selection.
	context, _ := gin.CreateTestContext(httptest.NewRecorder())
	context.Request = httptest.NewRequest("POST", "/fixture", nil)
	context.Request.Header.Set("Authorization", "Bearer "+readToken)
	requestOwner, err := authentication.GetRequestUser(context)
	if err != nil {
		t.Fatal(err)
	}
	requestOperation, err := authentication.GetRequestOperation(context)
	if err != nil || requestOperation.CurrentOperation.ID != operationID || requestOperation.CurrentOperator.CurrentOperationID.Int64 != int64(operationID) {
		t.Fatalf("shared lookup followed the owner's selection instead of the token: %v %v", requestOperation, err)
	}
	for i := 0; i < 3; i++ {
		ownerAgain, ownerErr := authentication.GetRequestUser(context)
		operationAgain, operationErr := authentication.GetRequestOperation(context)
		if ownerErr != nil || operationErr != nil || ownerAgain != requestOwner || operationAgain != requestOperation {
			t.Fatalf("request helpers rebuilt authenticated identity/membership: %v %v", ownerErr, operationErr)
		}
	}
	selectedOperation, err := database.GetUserCurrentOperation(ownerID)
	if err != nil || selectedOperation.CurrentOperation.ID != otherOperation {
		t.Fatalf("shared lookup changed the owner's login summary: %v %v", selectedOperation, err)
	}
	// The real issuance boundary now recognizes the value grant and includes
	// metadata read access. Ordinary read/write tokens never gain it implicitly.
	valueToken, _ := create([]string{authorization.SCOPE_CREDENTIAL_VALUE_READ})
	_, wildcardRecord := create([]string{"*"})
	valueGranted := false
	for _, permission := range wildcardRecord.Scopes {
		if permission == "*" {
			t.Fatal("wildcard was not frozen into concrete grants at issuance")
		}
		valueGranted = valueGranted || permission == authorization.SCOPE_CREDENTIAL_VALUE_READ
	}
	if !valueGranted {
		t.Fatal("new wildcard token did not include the registered value grant")
	}
	for _, operation := range []int{operationID, otherOperation} {
		if _, err = db.Exec(`INSERT INTO credential(type,account,realm,credential,operator_id,operation_id) VALUES('plaintext','alice','fixture',convert_to('fixture-secret','utf8'),$1,$2)`, ownerID, operation); err != nil {
			t.Fatal(err)
		}
	}
	query := func(token, document string) map[string]interface{} {
		t.Helper()
		hookCallsBefore := authHookCalls.Load()
		payload, _ := json.Marshal(map[string]interface{}{"query": document})
		request, _ := http.NewRequest("POST", "http://"+hasuraAddress+"/v1/graphql", bytes.NewReader(payload))
		request.Header.Set("Authorization", "Bearer "+token)
		request.Header.Set("Content-Type", "application/json")
		response, err := client.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		defer response.Body.Close()
		var result map[string]interface{}
		if err = json.NewDecoder(response.Body).Decode(&result); err != nil {
			t.Fatal(err)
		}
		if authHookCalls.Load() != hookCallsBefore+1 {
			t.Fatal("HTTP request did not authenticate through exactly one Hasura webhook call")
		}
		if actionSecretLeaks.Load() != 0 {
			t.Fatal("Hasura forwarded its internal credential to an Action handler")
		}
		return result
	}
	t.Run("build parameter ownership alternatives", func(t *testing.T) {
		var payloadTypeID, parameterID int
		if err := db.Get(&payloadTypeID, `INSERT INTO payloadtype(name,mythic_encrypts) VALUES('ownership-fixture',false) RETURNING id`); err != nil {
			t.Fatal(err)
		}
		if err := db.Get(&parameterID, `INSERT INTO buildparameter(name,payload_type_id) VALUES('ownership-parameter',$1) RETURNING id`, payloadTypeID); err != nil {
			t.Fatal(err)
		}
		var ownPayloadID int
		for _, operation := range []int{operationID, otherOperation} {
			var payloadID int
			if err := db.Get(&payloadID, `INSERT INTO payload(uuid,operator_id,payload_type_id,operation_id,build_container)
				VALUES($1,$2,$3,$4,'fixture') RETURNING id`, fmt.Sprintf("ownership-payload-%d", operation), ownerID, payloadTypeID, operation); err != nil {
				t.Fatal(err)
			}
			if operation == operationID {
				ownPayloadID = payloadID
			}
			// Existing payload parameters have no direct operation_id; saved
			// presets have an operation_id and no payload relationship.
			if _, err := db.Exec(`INSERT INTO buildparameterinstance(build_parameter_id,payload_id,value)
				VALUES($1,$2,'payload value')`, parameterID, payloadID); err != nil {
				t.Fatal(err)
			}
			if _, err := db.Exec(`INSERT INTO buildparameterinstance(build_parameter_id,operation_id,instance_name,value)
				VALUES($1,$2,'ownership-preset','preset value')`, parameterID, operation); err != nil {
				t.Fatal(err)
			}
		}
		payloadReader, _ := create([]string{authorization.SCOPE_PAYLOAD_READ})
		result := query(payloadReader, `{buildparameterinstance(order_by:{id:asc}){value operation_id payload_id}}`)
		if result["errors"] != nil {
			t.Fatal(result)
		}
		rows := result["data"].(map[string]interface{})["buildparameterinstance"].([]interface{})
		if len(rows) != 2 {
			t.Fatalf("expected own payload parameters and preset, got %v", result)
		}
		payloadRow, presetRow := rows[0].(map[string]interface{}), rows[1].(map[string]interface{})
		if payloadRow["operation_id"] != nil || payloadRow["payload_id"] != float64(ownPayloadID) || presetRow["operation_id"] != float64(operationID) || presetRow["payload_id"] != nil {
			t.Fatalf("ownership alternatives returned incorrect rows: %v", rows)
		}
		result = query(payloadReader, fmt.Sprintf(`{payload(where:{id:{_eq:%d}}){buildparameterinstances{value buildparameter{name}}}}`, ownPayloadID))
		if result["errors"] != nil {
			t.Fatal(result)
		}
		payloads := result["data"].(map[string]interface{})["payload"].([]interface{})
		if len(payloads) != 1 || len(payloads[0].(map[string]interface{})["buildparameterinstances"].([]interface{})) != 1 {
			t.Fatalf("payload configuration still hides build parameters: %v", result)
		}
		if result = query(readToken, `{buildparameterinstance{value}}`); result["errors"] == nil {
			t.Fatalf("ownership alternatives bypassed payload.read: %v", result)
		}
		payloadWriter, _ := create([]string{authorization.SCOPE_PAYLOAD_WRITE})
		result = query(payloadWriter, `mutation{update_buildparameterinstance(where:{},_set:{value:"updated ownership value"}){affected_rows}}`)
		if result["errors"] != nil {
			t.Fatal(result)
		}
		if result["data"].(map[string]interface{})["update_buildparameterinstance"].(map[string]interface{})["affected_rows"] != float64(2) {
			t.Fatalf("writes did not honor both ownership alternatives: %v", result)
		}
		var untouched int
		if err := db.Get(&untouched, `SELECT count(*) FROM buildparameterinstance
			WHERE build_parameter_id=$1 AND value <> 'updated ownership value'`, parameterID); err != nil || untouched != 2 {
			t.Fatalf("writes crossed the operation boundary: untouched=%d, err=%v", untouched, err)
		}
	})
	// Permission diagnostics remain callable even when the token lacks the
	// permission being checked. They distinguish missing grants from operations.
	for _, test := range []struct {
		token, resource, action, reason string
		operation                       int
		allowed                         bool
	}{
		{token: readToken, resource: "credential", action: "read", operation: operationID, reason: "allowed", allowed: true},
		{token: readToken, resource: "task", action: "read", operation: operationID, reason: "missing_scope"},
		{token: readToken, resource: "credential", action: "read", operation: otherOperation, reason: "operation_not_available"},
		{token: readToken, resource: "credential", action: "value.read", operation: operationID, reason: "missing_scope"},
		{token: valueToken, resource: "credential", action: "value.read", operation: operationID, reason: "allowed", allowed: true},
	} {
		result := query(test.token, fmt.Sprintf(`{scopeCheck(resource:%q,action:%q,operation_id:%d){status allowed reason required_scope message}}`, test.resource, test.action, test.operation))
		if result["errors"] != nil {
			t.Fatalf("scopeCheck was denied by preflight: %v", result)
		}
		check := result["data"].(map[string]interface{})["scopeCheck"].(map[string]interface{})
		if check["status"] != "success" || check["allowed"] != test.allowed || check["reason"] != test.reason || check["required_scope"] != test.resource+"."+test.action || check["message"] == "" {
			t.Fatalf("permission diagnostic changed: %v", result)
		}
	}
	// The existing UI/AI discovery API advertises the value grant only when
	// the caller can delegate it, without maintaining a separate UI scope map.
	for _, test := range []struct {
		token string
		value bool
	}{{readToken, false}, {valueToken, true}} {
		result := query(test.token, `{apiTokenScopeDefinitions{status scopes{name}}}`)
		if result["errors"] != nil {
			t.Fatalf("credential scope discovery failed: %v", result)
		}
		found := false
		for _, raw := range result["data"].(map[string]interface{})["apiTokenScopeDefinitions"].(map[string]interface{})["scopes"].([]interface{}) {
			found = found || raw.(map[string]interface{})["name"] == authorization.SCOPE_CREDENTIAL_VALUE_READ
		}
		if found != test.value {
			t.Fatalf("credential value scope delegation was misreported: %v", result)
		}
	}
	for _, test := range []struct {
		name, token string
		value       bool
	}{{"metadata only", readToken, false}, {"value permission", valueToken, true}} {
		t.Run(test.name, func(t *testing.T) {
			result := query(test.token, `{credential{account credential_raw credential_text operation_id}}`)
			if result["errors"] != nil {
				t.Fatalf("credential projection failed: %v", result)
			}
			rows := result["data"].(map[string]interface{})["credential"].([]interface{})
			if len(rows) != 1 {
				t.Fatalf("fixed operation leaked or disappeared: %v", result)
			}
			row := rows[0].(map[string]interface{})
			if int(row["operation_id"].(float64)) != operationID {
				t.Fatal("token followed owner's selected operation")
			}
			if test.value && row["credential_text"] != "fixture-secret" || !test.value && (row["credential_text"] != nil || row["credential_raw"] != nil) {
				t.Fatalf("bad field masking: %v", row)
			}
		})
	}
	// The two chat grants select different categories from the same table. An
	// explicit target must error even when its requested result would be empty.
	var containerID, standardChannelID, aiChannelID int
	_, chatRecord := create([]string{"chat-ai.write", "apitoken.write"})
	if err = db.Get(&containerID, `INSERT INTO consuming_container(name,type) VALUES('fixture-chat','chat') RETURNING id`); err != nil {
		t.Fatal(err)
	}
	for _, category := range []string{"standard", "ai"} {
		var channelID int
		if err = db.Get(&channelID, `INSERT INTO chat_channel(operation_id,name,slug,channel_type,created_by,chat_container_id,apitokens_id) VALUES($1,$2,$2,$2,$3,$4,$5) RETURNING id`, operationID, category, ownerID, containerID, chatRecord.ID); err != nil {
			t.Fatal(err)
		}
		if category == "ai" {
			aiChannelID = channelID
		} else {
			standardChannelID = channelID
		}
	}
	var aiMessageID, foreignChannelID, foreignMessageID int
	if err = db.Get(&aiMessageID, `INSERT INTO chat_message(operation_id,channel_id,operator_id,message) VALUES($1,$2,$3,'fixture AI message') RETURNING id`, operationID, aiChannelID, ownerID); err != nil {
		t.Fatal(err)
	}
	foreignChatToken := databaseStructs.Apitokens{OperatorID: ownerID, OperationID: otherOperation, CreatedBy: ownerID, TokenType: "api", Name: "foreign AI fixture", Active: true}
	if _, err = database.CreateAPIToken(&foreignChatToken, []string{"chat-ai.write"}, map[string]bool{"*": true}, foreignChatToken.OperationID); err != nil {
		t.Fatal(err)
	}
	if err = db.Get(&foreignChannelID, `INSERT INTO chat_channel(operation_id,name,slug,channel_type,created_by,chat_container_id,apitokens_id) VALUES($1,'foreign AI','foreign-ai','ai',$2,$3,$4) RETURNING id`, otherOperation, ownerID, containerID, foreignChatToken.ID); err != nil {
		t.Fatal(err)
	}
	if err = db.Get(&foreignMessageID, `INSERT INTO chat_message(operation_id,channel_id,operator_id,message) VALUES($1,$2,$3,'foreign AI message') RETURNING id`, otherOperation, foreignChannelID, ownerID); err != nil {
		t.Fatal(err)
	}
	for _, category := range []string{"standard", "ai"} {
		permission := "chat.read"
		if category == "ai" {
			permission = "chat-ai.read"
		}
		token, _ := create([]string{permission})
		result := query(token, `{chat_channel{channel_type}}`)
		if result["errors"] != nil {
			t.Fatalf("chat category projection failed: %v", result)
		}
		rows := result["data"].(map[string]interface{})["chat_channel"].([]interface{})
		if len(rows) == 0 {
			t.Fatalf("chat category disappeared: %v", result)
		}
		for _, row := range rows {
			if row.(map[string]interface{})["channel_type"] != category {
				t.Fatalf("chat category scope leaked: %v", result)
			}
		}
		if category == "standard" {
			for _, document := range []string{
				fmt.Sprintf(`{chat_message(where:{channel_id:{_eq:%d}}){id}}`, aiChannelID),
				fmt.Sprintf(`{chat_message(where:{channel_id:{_in:[%d,%d]}}){id}}`, standardChannelID, aiChannelID),
				fmt.Sprintf(`{chat_message_by_pk(id:%d){id}}`, aiMessageID),
				fmt.Sprintf(`{chat_read_state_by_pk(channel_id:%d,operator_id:%d){channel_id}}`, aiChannelID, ownerID),
			} {
				result = query(token, document)
				encoded, _ := json.Marshal(result)
				if result["errors"] == nil {
					t.Fatalf("declared lookup did not reject explicit AI target %s: %s", document, encoded)
				}
			}
			result = query(token, fmt.Sprintf(`{chat_message_by_pk(id:%d){id}}`, foreignMessageID))
			if result["errors"] != nil || result["data"].(map[string]interface{})["chat_message_by_pk"] != nil {
				t.Fatalf("lookup exposed another operation's category or row: %v", result)
			}
			var initialCalls int64
			if err = db.Get(&initialCalls, `SELECT last_value FROM authorization_lookup_calls`); err != nil {
				t.Fatal(err)
			}
			for requestNumber := int64(1); requestNumber <= 2; requestNumber++ {
				result = query(token, fmt.Sprintf(`{first:chat_message(where:{channel_id:{_eq:%d}}){id} second:chat_message(where:{channel_id:{_eq:%d}}){id}}`, standardChannelID, standardChannelID))
				var calls int64
				if err = db.Get(&calls, `SELECT last_value FROM authorization_lookup_calls`); err != nil || result["errors"] != nil || calls-initialCalls != requestNumber {
					t.Fatalf("target facts were not cached once per HTTP request: calls=%d initial=%d result=%v err=%v", calls, initialCalls, result, err)
				}
			}
			// The hook also authorizes a whole successful HTTP batch once and
			// reuses identical target facts between its entries.
			batch, _ := json.Marshal([]map[string]string{
				{"query": fmt.Sprintf(`{chat_message(where:{channel_id:{_eq:%d}}){id}}`, standardChannelID)},
				{"query": fmt.Sprintf(`{chat_message(where:{channel_id:{_eq:%d}}){id}}`, standardChannelID)},
			})
			request, _ := http.NewRequest("POST", "http://"+hasuraAddress+"/v1/graphql", bytes.NewReader(batch))
			request.Header.Set("Authorization", "Bearer "+token)
			request.Header.Set("Content-Type", "application/json")
			hooksBefore := authHookCalls.Load()
			response, err := client.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			var entries []map[string]interface{}
			err = json.NewDecoder(response.Body).Decode(&entries)
			response.Body.Close()
			if err != nil || len(entries) != 2 || entries[0]["errors"] != nil || entries[1]["errors"] != nil || authHookCalls.Load() != hooksBefore+1 {
				t.Fatalf("whole-batch authorization failed: %v %v", entries, err)
			}
			var calls int64
			if err = db.Get(&calls, `SELECT last_value FROM authorization_lookup_calls`); err != nil || calls-initialCalls != 3 {
				t.Fatalf("batch repeated a target lookup: calls=%d initial=%d err=%v", calls, initialCalls, err)
			}
		} else {
			result = query(token, fmt.Sprintf(`mutation{chatUpdateChannel(channel_id:%d,muted:true){status}}`, aiChannelID))
			encoded, _ := json.Marshal(result)
			if result["errors"] != nil || !bytes.Contains(encoded, []byte(`"status":"success"`)) {
				t.Fatalf("read-only personal chat preference required write grant: %s", encoded)
			}
		}
	}
	standardWriter, _ := create([]string{"chat.write"})
	aiWriter, _ := create([]string{"chat-ai.write"})
	for _, test := range []struct {
		token, document, missing string
	}{
		{standardWriter, fmt.Sprintf(`mutation{chatEditMessage(message_id:%d,message:"denied"){status}}`, aiMessageID), "chat-ai.write"},
		{standardWriter, `mutation{chatCreateChannel(name:"denied",channel_type:"ai"){status}}`, "chat-ai.write"},
		{aiWriter, `mutation{chatCreateChannel(name:"denied"){status}}`, "chat.write"},
		{standardWriter, `mutation{chatCancelRequest(request_id:999999){status}}`, "chat-ai.write"},
	} {
		result := query(test.token, test.document)
		encoded, _ := json.Marshal(result)
		if result["errors"] == nil {
			t.Fatalf("model Action did not enforce %s: %s", test.missing, encoded)
		}
	}
	// Valid JWT and refresh behavior needs the real operator/session tables.
	owner, err := database.GetUserFromID(ownerID)
	if err != nil {
		t.Fatal(err)
	}
	userJWT, refresh, _, err := mythicjwt.GenerateJWT(*owner, mythicjwt.AUTH_METHOD_USER, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	userResult := query(userJWT, `{credential{credential_text operation_id}}`)
	if userResult["errors"] != nil {
		t.Fatalf("valid user session failed: %v", userResult)
	}
	userRows := userResult["data"].(map[string]interface{})["credential"].([]interface{})
	if len(userRows) != 1 || userRows[0].(map[string]interface{})["credential_text"] != "fixture-secret" {
		t.Fatalf("user session behavior changed: %v", userResult)
	}
	if _, _, _, err = mythicjwt.RefreshJWT(userJWT, refresh); err != nil {
		t.Fatalf("valid refresh failed: %v", err)
	}
	for _, test := range []struct {
		token, operationIDs string
	}{{userJWT, fmt.Sprintf("{%d,%d}", operationID, otherOperation)}, {readToken, fmt.Sprintf("{%d}", operationID)}} {
		// Both credentials use operator; their scope claims carry different
		// selected/bound operations instead of selecting different role families.
		payload, _ := json.Marshal(map[string]interface{}{"headers": map[string]string{"authorization": "Bearer " + test.token}, "request": nil})
		request, _ = http.NewRequest("POST", server.URL+"/graphql/webhook", bytes.NewReader(payload))
		request.Header.Set("Content-Type", "application/json")
		response, err = client.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		var claims map[string]interface{}
		err = json.NewDecoder(response.Body).Decode(&claims)
		response.Body.Close()
		if err != nil || claims["x-hasura-role"] != "operator" || claims[authorization.ClaimName("credential.read", true)] != test.operationIDs {
			t.Fatalf("shared role claims did not preserve credential authority: %v %v", claims, err)
		}
	}
	otherToken := databaseStructs.Apitokens{OperatorID: ownerID, OperationID: otherOperation, CreatedBy: ownerID, TokenType: "api", Name: "other operation token", Active: true}
	if _, err = database.CreateAPIToken(&otherToken, []string{"credential.read"}, map[string]bool{"*": true}, otherToken.OperationID); err != nil {
		t.Fatal(err)
	}
	metadataToken, _ := create([]string{"apitoken.read"})
	for _, test := range []struct {
		token      string
		operations int
	}{{userJWT, 2}, {metadataToken, 1}} {
		result := query(test.token, `{apitokens{operation_id}}`)
		if result["errors"] != nil {
			t.Fatalf("owner token metadata view failed: %v", result)
		}
		operations := map[float64]bool{}
		for _, raw := range result["data"].(map[string]interface{})["apitokens"].([]interface{}) {
			operations[raw.(map[string]interface{})["operation_id"].(float64)] = true
		}
		if len(operations) != test.operations || test.operations == 1 && !operations[float64(operationID)] {
			t.Fatalf("shared role changed owner/token operation authority: %v", result)
		}
	}
	var administratorID int
	if err = db.Get(&administratorID, `INSERT INTO operator(username,password,salt,admin,active,current_operation_id) VALUES('fixture-admin','fixture-password','fixture-salt',true,true,$1) RETURNING id`, otherOperation); err != nil {
		t.Fatal(err)
	}
	administrator, err := database.GetUserFromID(administratorID)
	if err != nil {
		t.Fatal(err)
	}
	administratorSummary, err := database.GetUserCurrentOperation(administratorID)
	if err != nil || administratorSummary.CurrentOperation.ID != 0 || !administratorSummary.CurrentOperator.Admin {
		t.Fatalf("login summary changed for an administrator without a selected membership: %v %v", administratorSummary, err)
	}
	administratorJWT, _, _, err := mythicjwt.GenerateJWT(*administrator, mythicjwt.AUTH_METHOD_USER, 0, 0)
	if err != nil {
		t.Fatal(err)
	}
	administratorToken := databaseStructs.Apitokens{OperatorID: administratorID, OperationID: operationID, CreatedBy: administratorID, TokenType: "api", Name: "administrator operation token", Active: true}
	administratorBearer, err := database.CreateAPIToken(&administratorToken, []string{"operation.read"}, map[string]bool{"*": true}, administratorToken.OperationID)
	if err != nil {
		t.Fatal(err)
	}
	for _, test := range []struct {
		token string
		rows  int
	}{{administratorJWT, 2}, {administratorBearer, 1}} {
		result := query(test.token, `{operation{id}}`)
		if result["errors"] != nil {
			t.Fatalf("administrator operation view failed: %v", result)
		}
		rows := result["data"].(map[string]interface{})["operation"].([]interface{})
		if len(rows) != test.rows || test.rows == 1 && int(rows[0].(map[string]interface{})["id"].(float64)) != operationID {
			t.Fatalf("administrator session/token operation boundary changed: %v", result)
		}
	}
	// These two tables previously contained a retired scope OR with a bare {}.
	// Exercise native row permissions independently of HTTP preflight. Only this
	// fixture uses the admin secret with explicit role/connection-time claims.
	var profileID, parameterID int
	if err = db.Get(&profileID, `INSERT INTO c2profile(name) VALUES('fixture-c2') RETURNING id`); err != nil {
		t.Fatal(err)
	}
	if err = db.Get(&parameterID, `INSERT INTO c2profileparameters(c2_profile_id,name,description) VALUES($1,'fixture-parameter','fixture') RETURNING id`, profileID); err != nil {
		t.Fatal(err)
	}
	var parameterInstances, artifacts [2]int
	for i, operation := range []int{operationID, otherOperation} {
		if err = db.Get(&parameterInstances[i], `INSERT INTO c2profileparametersinstance(c2_profile_id,c2_profile_parameters_id,operation_id,value) VALUES($1,$2,$3,'fixture-value') RETURNING id`, profileID, parameterID, operation); err != nil {
			t.Fatal(err)
		}
		if err = db.Get(&artifacts[i], `INSERT INTO taskartifact(operation_id,host) VALUES($1,'fixture-host') RETURNING id`, operation); err != nil {
			t.Fatal(err)
		}
	}
	rowReadToken, _ := create([]string{"payload.read", "task.read"})
	rowWriteToken, _ := create([]string{"payload.write", "task.write"})
	readRows := `{c2profileparametersinstance{operation_id} taskartifact{operation_id}}`
	for _, test := range []struct {
		name, token, document     string
		rows, operation, affected int
		mutation                  bool
	}{
		{name: "scoped rows stay in token operation", token: rowReadToken, document: readRows, rows: 1, operation: operationID},
		{name: "ungranted scopes cannot read rows", token: readToken, document: readRows, rows: 0},
		{name: "session rows stay in selected operation", token: userJWT, document: readRows, rows: 1, operation: otherOperation},
		{name: "write cannot cross operation", token: rowWriteToken, document: fmt.Sprintf(`mutation{update_c2profileparametersinstance(where:{id:{_eq:%d}},_set:{value:"bypass"}){affected_rows} update_taskartifact(where:{id:{_eq:%d}},_set:{host:"bypass"}){affected_rows}}`, parameterInstances[1], artifacts[1]), mutation: true},
		{name: "ungranted scopes cannot write rows", token: readToken, document: fmt.Sprintf(`mutation{update_c2profileparametersinstance(where:{id:{_eq:%d}},_set:{value:"bypass"}){affected_rows} update_taskartifact(where:{id:{_eq:%d}},_set:{host:"bypass"}){affected_rows}}`, parameterInstances[0], artifacts[0]), mutation: true},
		{name: "granted writes still work", token: rowWriteToken, document: fmt.Sprintf(`mutation{update_c2profileparametersinstance(where:{id:{_eq:%d}},_set:{value:"updated"}){affected_rows} update_taskartifact(where:{id:{_eq:%d}},_set:{host:"updated"}){affected_rows}}`, parameterInstances[0], artifacts[0]), mutation: true, affected: 1},
	} {
		t.Run(test.name, func(t *testing.T) {
			payload, _ := json.Marshal(map[string]interface{}{"headers": map[string]string{"authorization": "Bearer " + test.token}, "request": nil})
			request, _ := http.NewRequest("POST", server.URL+"/graphql/webhook", bytes.NewReader(payload))
			request.Header.Set("Content-Type", "application/json")
			response, err := client.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			var sessionVariables map[string]string
			err = json.NewDecoder(response.Body).Decode(&sessionVariables)
			response.Body.Close()
			if err != nil || response.StatusCode != http.StatusOK {
				t.Fatalf("native row fixture could not authenticate: %v %v", sessionVariables, err)
			}
			payload, _ = json.Marshal(map[string]string{"query": test.document})
			request, _ = http.NewRequest("POST", "http://"+hasuraAddress+"/v1/graphql", bytes.NewReader(payload))
			request.Header.Set("Content-Type", "application/json")
			request.Header.Set("X-Hasura-Admin-Secret", "fixture-admin-secret")
			for key, value := range sessionVariables {
				request.Header.Set(key, value)
			}
			response, err = client.Do(request)
			if err != nil {
				t.Fatal(err)
			}
			defer response.Body.Close()
			var result map[string]interface{}
			if err = json.NewDecoder(response.Body).Decode(&result); err != nil || result["errors"] != nil {
				t.Fatalf("native Hasura row check failed: %v %v", result, err)
			}
			for field, value := range result["data"].(map[string]interface{}) {
				if test.mutation {
					if int(value.(map[string]interface{})["affected_rows"].(float64)) != test.affected {
						t.Fatalf("%s write restriction failed: %v", field, result)
					}
					continue
				}
				rows := value.([]interface{})
				if len(rows) != test.rows {
					t.Fatalf("%s row restriction failed: %v", field, result)
				}
				for _, row := range rows {
					if int(row.(map[string]interface{})["operation_id"].(float64)) != test.operation {
						t.Fatalf("%s exposed another operation: %v", field, result)
					}
				}
			}
		})
	}
	// Ordinary callers cannot forge row claims; the existing Hasura admin
	// credential still works for Console and administrative tooling.
	for _, administrative := range []bool{false, true} {
		request, _ = http.NewRequest("POST", "http://"+hasuraAddress+"/v1/graphql", strings.NewReader(`{"query":"{credential{credential_text operation_id}}"}`))
		request.Header.Set("Content-Type", "application/json")
		if administrative {
			request.Header.Set("X-Hasura-Admin-Secret", "fixture-admin-secret")
		} else {
			request.Header.Set("Authorization", "Bearer "+readToken)
			request.Header.Set("X-Hasura-Role", "mythic_admin")
			request.Header.Set("X-Hasura-Current-Operation-Id", strconv.Itoa(otherOperation))
			request.Header.Set(authorization.ClaimName("credential.value.read", true), fmt.Sprintf("{%d}", otherOperation))
		}
		response, err = client.Do(request)
		if err != nil {
			t.Fatal(err)
		}
		var result map[string]interface{}
		err = json.NewDecoder(response.Body).Decode(&result)
		response.Body.Close()
		if err != nil || result["errors"] != nil {
			t.Fatalf("credential header test failed: %v %v", result, err)
		}
		rows := result["data"].(map[string]interface{})["credential"].([]interface{})
		if administrative && len(rows) != 2 || !administrative && (len(rows) != 1 || rows[0].(map[string]interface{})["credential_text"] != nil || int(rows[0].(map[string]interface{})["operation_id"].(float64)) != operationID) {
			t.Fatalf("administrative=%v, unexpected claim authority: %v", administrative, result)
		}
	}
	result := query(readToken, `{task{id}}`)
	if result["errors"] == nil {
		t.Fatal("missing task.read returned data instead of an error")
	}
	extensions := result["errors"].([]interface{})[0].(map[string]interface{})["extensions"].(map[string]interface{})
	if extensions["code"] != "access-denied" {
		t.Fatalf("scope denial did not use Hasura's native authentication error: %v", result)
	}
	result = query(readToken, `{credential(where:{credential_text:{_eq:"fixture-secret"}}){account}}`)
	if result["errors"] == nil {
		t.Fatal("HTTP secret predicate bypassed the field policy")
	}
	result = query(readToken, `{credential_aggregate{nodes{credential_raw credential_text}}}`)
	encoded, _ := json.Marshal(result)
	if result["errors"] != nil || bytes.Contains(encoded, []byte("fixture-secret")) || !bytes.Contains(encoded, []byte(`"credential_raw":null`)) {
		t.Fatalf("aggregate projection did not mask credential value: %s", encoded)
	}
	writeToken, _ := create([]string{"credential.write"})
	var credentialID int
	if err = db.Get(&credentialID, `SELECT id FROM credential WHERE operation_id=$1`, operationID); err != nil {
		t.Fatal(err)
	}
	// A batch is authorized in full before even its first mutation can run.
	batch := fmt.Sprintf(`[{"query":"mutation{update_credential(where:{id:{_eq:%d}},_set:{comment:\"batch executed\"}){affected_rows}}"},{"query":"{task{id}}"}]`, credentialID)
	request, _ = http.NewRequest("POST", "http://"+hasuraAddress+"/v1/graphql", strings.NewReader(batch))
	request.Header.Set("Authorization", "Bearer "+writeToken)
	request.Header.Set("Content-Type", "application/json")
	response, err = client.Do(request)
	if err != nil {
		t.Fatal(err)
	}
	body, _ = io.ReadAll(response.Body)
	response.Body.Close()
	var comment string
	if err = db.Get(&comment, `SELECT comment FROM credential WHERE id=$1`, credentialID); err != nil || comment == "batch executed" || !bytes.Contains(body, []byte("access-denied")) {
		t.Fatalf("batch executed before denial: %s, comment=%q, err=%v", body, comment, err)
	}
	// The same declared fields protect Action responses and direct Go RPCs.
	result = query(writeToken, fmt.Sprintf(`mutation{updateCredential(input:{credential_id:%d,comment:"updated"}){status credential_text}}`, credentialID))
	encoded, _ = json.Marshal(result)
	if result["errors"] != nil || !bytes.Contains(encoded, []byte(`"status":"success"`)) || !bytes.Contains(encoded, []byte(`"credential_text":null`)) {
		t.Fatalf("Action credential projection failed: %s", encoded)
	}
	valueWriter, _ := create([]string{authorization.SCOPE_CREDENTIAL_WRITE, authorization.SCOPE_CREDENTIAL_VALUE_READ})
	result = query(valueWriter, fmt.Sprintf(`mutation{updateCredential(input:{credential_id:%d,comment:"value reader"}){status credential_text}}`, credentialID))
	if result["errors"] != nil || result["data"].(map[string]interface{})["updateCredential"].(map[string]interface{})["credential_text"] != "fixture-secret" {
		t.Fatalf("Action did not return credential value to a granted token: %v", result)
	}
	rpc := rabbitmq.MythicRPCCredentialSearch(rabbitmq.MythicRPCCredentialSearchMessage{}, rabbitmq.RabbitMQAuthContext{OperationID: operationID, SourceScopes: []string{"credential.read"}})
	if !rpc.Success || !bytes.Contains(rpc.Credentials, []byte(`"credential":null`)) {
		t.Fatalf("RPC credential projection failed: %+v", rpc)
	}
	secret := "fixture-secret"
	rpc = rabbitmq.MythicRPCCredentialSearch(rabbitmq.MythicRPCCredentialSearchMessage{SearchCredentials: rabbitmq.MythicRPCCredentialSearchCredentialData{Credential: &secret}}, rabbitmq.RabbitMQAuthContext{OperationID: operationID, SourceScopes: []string{"credential.read"}})
	if rpc.Success || !strings.Contains(rpc.Error, "credential.value.read") {
		t.Fatalf("RPC value predicate bypassed field rule: %+v", rpc)
	}
	rpc = rabbitmq.MythicRPCCredentialSearch(rabbitmq.MythicRPCCredentialSearchMessage{SearchCredentials: rabbitmq.MythicRPCCredentialSearchCredentialData{Credential: &secret}}, rabbitmq.RabbitMQAuthContext{OperationID: operationID, SourceScopes: []string{authorization.SCOPE_CREDENTIAL_READ, authorization.SCOPE_CREDENTIAL_VALUE_READ}})
	if !rpc.Success || !bytes.Contains(rpc.Credentials, []byte(`"credential":"fixture-secret"`)) {
		t.Fatalf("RPC did not return credential value to a granted token: %+v", rpc)
	}
	parent, parentRecord := create([]string{"apitoken.write", "credential.read"})
	result = query(parent, fmt.Sprintf(`mutation{createAPIToken(operation_id:%d,scopes:["credential.read"]){status token_value}}`, operationID))
	if result["errors"] != nil {
		t.Fatalf("child issuance failed: %v", result)
	}
	childResult := result["data"].(map[string]interface{})["createAPIToken"].(map[string]interface{})
	if childResult["status"] != "success" {
		t.Fatalf("child issuance failed: %v", result)
	}
	child := childResult["token_value"].(string)
	result = query(parent, fmt.Sprintf(`mutation{createAPIToken(operation_id:%d,scopes:["task.read"]){status error}}`, operationID))
	if result["errors"] != nil || result["data"].(map[string]interface{})["createAPIToken"].(map[string]interface{})["status"] != "error" {
		t.Fatalf("parent delegated an ungranted permission: %v", result)
	}
	if actionCalls.Load() == 0 {
		t.Fatal("fixture did not exercise Hasura Action execution")
	}
	if _, err = db.Exec(`UPDATE apitokens SET active=false,deleted=true WHERE id=$1`, parentRecord.ID); err != nil {
		t.Fatal(err)
	}
	result = query(child, `{credential{account}}`)
	if result["errors"] != nil {
		t.Fatalf("revoking parent revoked independent child: %v", result)
	}
	// Role reductions cap existing grants on the next request without mutating
	// the frozen permission list; restoring membership authority restores access.
	if _, err = db.Exec(`UPDATE operatoroperation SET view_mode='spectator' WHERE operator_id=$1 AND operation_id=$2`, ownerID, operationID); err != nil {
		t.Fatal(err)
	}
	result = query(writeToken, fmt.Sprintf(`mutation{update_credential(where:{id:{_eq:%d}},_set:{comment:"spectator bypass"}){affected_rows}}`, credentialID))
	if result["errors"] == nil {
		t.Fatalf("spectator owner retained write authority: %v", result)
	}
	result = query(readToken, `{scopeCheck(resource:"task",action:"read"){allowed reason required_scope}}`)
	if result["errors"] != nil || result["data"].(map[string]interface{})["scopeCheck"].(map[string]interface{})["reason"] != "missing_scope" {
		t.Fatalf("spectator could not diagnose a missing permission: %v", result)
	}
	if _, err = db.Exec(`UPDATE operatoroperation SET view_mode='operator' WHERE operator_id=$1 AND operation_id=$2`, ownerID, operationID); err != nil {
		t.Fatal(err)
	}
	// WebSockets use the same auth hook without an HTTP operation and retain
	// their connection-time claims until close, including field masking.
	config, err := websocket.NewConfig("ws://"+hasuraAddress+"/v1/graphql", "http://fixture.local")
	if err != nil {
		t.Fatal(err)
	}
	config.Protocol = []string{"graphql-ws"}
	hookCallsBefore := authHookCalls.Load()
	socket, err := websocket.DialConfig(config)
	if err != nil {
		t.Fatal(err)
	}
	defer socket.Close()
	socket.SetDeadline(time.Now().Add(10 * time.Second))
	if err = websocket.JSON.Send(socket, map[string]interface{}{"type": "connection_init", "payload": map[string]interface{}{"headers": map[string]string{"Authorization": "Bearer " + readToken}}}); err != nil {
		t.Fatal(err)
	}
	for {
		var message map[string]interface{}
		if err = websocket.JSON.Receive(socket, &message); err != nil {
			t.Fatal(err)
		}
		if message["type"] == "connection_ack" {
			break
		}
	}
	if authHookCalls.Load() <= hookCallsBefore {
		t.Fatal("native WebSocket did not authenticate through the Hasura auth webhook")
	}
	if err = websocket.JSON.Send(socket, map[string]interface{}{"id": "credential-mask", "type": "start", "payload": map[string]interface{}{"query": `subscription{credential{credential_text}}`}}); err != nil {
		t.Fatal(err)
	}
	for {
		var message map[string]interface{}
		if err = websocket.JSON.Receive(socket, &message); err != nil {
			t.Fatal(err)
		}
		if message["type"] == "ka" {
			continue
		}
		if message["type"] != "data" {
			t.Fatalf("subscription failed: %v", message)
		}
		encoded, _ := json.Marshal(message)
		if bytes.Contains(encoded, []byte("fixture-secret")) || !bytes.Contains(encoded, []byte(`"credential_text":null`)) {
			t.Fatalf("WebSocket masking failed: %s", encoded)
		}
		break
	}
	// A native WebSocket has no operation preflight. Hasura must also redact
	// the protected value inside predicates so metadata cannot reveal a match.
	if err = websocket.JSON.Send(socket, map[string]interface{}{"id": "credential-probe", "type": "start", "payload": map[string]interface{}{"query": `{credential(where:{credential_text:{_eq:"fixture-secret"}}){account}}`}}); err != nil {
		t.Fatal(err)
	}
	for {
		var message map[string]interface{}
		if err = websocket.JSON.Receive(socket, &message); err != nil {
			t.Fatal(err)
		}
		if message["id"] != "credential-probe" {
			continue
		}
		if message["type"] == "error" {
			break
		}
		if message["type"] != "data" {
			t.Fatalf("unexpected credential predicate response: %v", message)
		}
		payload := message["payload"].(map[string]interface{})
		if payload["errors"] == nil && len(payload["data"].(map[string]interface{})["credential"].([]interface{})) != 0 {
			t.Fatalf("WebSocket predicate exposed a protected credential value: %v", message)
		}
		break
	}
	if _, err = db.Exec(`UPDATE apitokens SET operation_id=$1 WHERE id=$2`, otherOperation, readRecord.ID); err == nil {
		t.Fatal("token operation was mutable")
	}
	if _, err = db.Exec(`DELETE FROM operatoroperation WHERE operator_id=$1 AND operation_id=$2`, ownerID, operationID); err != nil {
		t.Fatal(err)
	}
	if _, err = db.Exec(`INSERT INTO operatoroperation(operator_id,operation_id,view_mode) VALUES($1,$2,'operator')`, ownerID, operationID); err != nil {
		t.Fatal(err)
	}
	if err = db.Get(&active, `SELECT active FROM apitokens WHERE id=$1`, readRecord.ID); err != nil || active {
		t.Fatal("membership rejoin revived token", err)
	}
	if _, err = db.Exec(`UPDATE apitokens SET active=true,deleted=false WHERE id=$1`, readRecord.ID); err == nil {
		t.Fatal("permanent membership revocation could be undone")
	}
	result = query(readToken, `{credential{account}}`)
	if result["errors"] == nil {
		t.Fatal("revoked credential authenticated after rejoin")
	}
}
