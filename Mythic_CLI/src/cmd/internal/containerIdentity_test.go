package internal

import (
	"regexp"
	"strings"
	"testing"

	"github.com/MythicMeta/Mythic_CLI/cmd/config"
)

func TestDeriveContainerIdentityTokenIsStableAndServiceScoped(t *testing.T) {
	alpha := deriveContainerIdentityToken("deployment-secret", "alpha")
	if alpha != "038bbf5284523f2c1824b1da5f64fee15a31d5e3846dad29e3a9f31f723db138" {
		t.Fatalf("protocol test vector changed: %s", alpha)
	}
	if alpha == "" || alpha != deriveContainerIdentityToken("deployment-secret", "alpha") {
		t.Fatal("container identity derivation must be stable")
	}
	if alpha == deriveContainerIdentityToken("deployment-secret", "bravo") {
		t.Fatal("two services received the same identity token")
	}
	if alpha == deriveContainerIdentityToken("other-secret", "alpha") {
		t.Fatal("two deployments received the same identity token")
	}
}

func TestCanonicalContainerPrincipal(t *testing.T) {
	if got := canonicalContainerPrincipal("  Apollo  "); got != "apollo" {
		t.Fatalf("principal = %q, want apollo", got)
	}
	for _, invalid := range []string{"", "../apollo", "apollo/name", "-apollo", "apollo name"} {
		if got := canonicalContainerPrincipal(invalid); got != "" {
			t.Fatalf("invalid principal %q normalized to %q", invalid, got)
		}
	}
}

func TestDeriveContainerBrokerPasswordProtocolVector(t *testing.T) {
	got := config.DeriveContainerBrokerPassword("deployment-secret", "alpha")
	want := "bcbd5f4c7eed532f5800ebfe687fbd7067adbe5b609d5901b8421d490bb390c2"
	if got != want {
		t.Fatalf("broker password = %s, want %s", got, want)
	}
}

func TestRabbitMQDefinitionsIsolateContainerPrincipals(t *testing.T) {
	definitions, err := buildRabbitMQDefinitions([]string{"bravo", "alpha"}, "master", "mythic_v4", "mythic_server", "server-password")
	if err != nil {
		t.Fatal(err)
	}
	if len(definitions.Users) != 3 || definitions.Users[1].Name != "alpha" || definitions.Users[2].Name != "bravo" {
		t.Fatalf("unexpected users: %#v", definitions.Users)
	}
	if len(definitions.TopicPermissions) != 6 {
		t.Fatalf("topic permissions = %d, want 6", len(definitions.TopicPermissions))
	}
	if len(definitions.Exchanges) != 3 || definitions.Exchanges[0].Type != "topic" || definitions.Exchanges[1].Type != "topic" || definitions.Exchanges[2].Type != "topic" {
		t.Fatalf("shared exchanges were not pre-provisioned as topics: %#v", definitions.Exchanges)
	}
	for _, exchange := range definitions.Exchanges {
		if exchange.AutoDelete {
			t.Fatalf("security boundary exchange %s must not disappear when its last binding closes", exchange.Name)
		}
	}
	if got := definitions.TopicPermissions[1].Read; got != `^alpha\.(emit_log|emit_webhook)\.[a-z0-9_]+$` {
		t.Fatalf("alpha telemetry read permission = %q", got)
	}
	if got := definitions.Permissions[1].Write; got == ".*" || strings.Contains(got, "amq\\.default") {
		t.Fatalf("alpha received broad write permission: %q", got)
	}
	writeRoutes := regexp.MustCompile(definitions.TopicPermissions[0].Write)
	for _, route := range []string{"c2_sync", "pt_build_response", "mythic_rpc_agentstorage_create"} {
		if !writeRoutes.MatchString(route) {
			t.Fatalf("legitimate container-to-server route %q is not writable", route)
		}
	}
	for _, route := range []string{"bravo_payload_build", "alpha_payload_build", "emit_log.new_task"} {
		if writeRoutes.MatchString(route) {
			t.Fatalf("server-to-container route %q is unexpectedly writable", route)
		}
	}
	telemetryRead := regexp.MustCompile(definitions.TopicPermissions[1].Read)
	if !telemetryRead.MatchString("alpha.emit_log.new_task") || telemetryRead.MatchString("bravo.emit_log.new_task") {
		t.Fatalf("telemetry permission is not principal-scoped: %q", definitions.TopicPermissions[1].Read)
	}
	replyWrite := regexp.MustCompile(definitions.TopicPermissions[2].Write)
	if !replyWrite.MatchString("alpha.reply.123e4567-e89b-12d3-a456-426614174000") || replyWrite.MatchString("bravo.reply.123e4567-e89b-12d3-a456-426614174000") {
		t.Fatalf("reply permission is not principal-scoped: %q", definitions.TopicPermissions[2].Write)
	}
	if definitions.Users[1].PasswordHash == definitions.Users[2].PasswordHash {
		t.Fatal("container broker password hashes are not service-scoped")
	}
}

func TestRabbitMQDefinitionsRejectCanonicalCollisionsAndReservedNames(t *testing.T) {
	if _, err := buildRabbitMQDefinitions([]string{"Alpha", " alpha "}, "master", "mythic_v4", "mythic_server", "server-password"); err == nil {
		t.Fatal("canonical identity collision was accepted")
	}
	for _, reserved := range []string{"guest", "mythic_user", "mythic_server"} {
		if _, err := buildRabbitMQDefinitions([]string{reserved}, "master", "mythic_v4", "mythic_server", "server-password"); err == nil {
			t.Fatalf("reserved identity %q was accepted", reserved)
		}
	}
	for _, reservedServer := range []string{"guest", "mythic_user", "../invalid"} {
		if _, err := buildRabbitMQDefinitions(nil, "master", "mythic_v4", reservedServer, "server-password"); err == nil {
			t.Fatalf("reserved server identity %q was accepted", reservedServer)
		}
	}
}

func TestRabbitMQIdentityBoundaryRejectsLegacyCredentialReuse(t *testing.T) {
	for _, test := range []struct {
		name, secureVhost, serverUser, legacyVhost, legacyUser string
	}{
		{"same vhost", "mythic", "mythic_server", "mythic", "mythic_user"},
		{"same user", "mythic_v4", "bootstrap", "mythic", "bootstrap"},
		{"guest server", "mythic_v4", "guest", "mythic", "mythic_user"},
	} {
		t.Run(test.name, func(t *testing.T) {
			if err := validateRabbitMQIdentityBoundary(test.secureVhost, test.serverUser, test.legacyVhost, test.legacyUser); err == nil {
				t.Fatal("unsafe identity boundary was accepted")
			}
		})
	}
	if err := validateRabbitMQIdentityBoundary("mythic_v4", "mythic_server", "mythic", "mythic_user"); err != nil {
		t.Fatalf("dedicated identity boundary rejected: %v", err)
	}
}
