package rabbitmq

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"testing"
	"time"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
)

func TestParseCredentialMergesIdentityAndSubtype(t *testing.T) {
	parserType := fmt.Sprintf("unit-test-identity-%d", time.Now().UnixNano())
	RegisterCredentialMetadataParser(parserType, func(input CredentialParseInput) CredentialParseResult {
		if input.SuppliedIdentity["existing_identity"] != "value" {
			t.Fatalf("supplied identity was not provided to parser: %#v", input.SuppliedIdentity)
		}
		return CredentialParseResult{
			Metadata: map[string]interface{}{
				"parsed": true,
			},
			Identity: map[string]interface{}{
				"existing_identity": "overwritten",
				"parsed_identity":   true,
			},
			Subtype: "Example",
			Success: true,
		}
	})

	parsed := ParseCredential(parserType, "secret", nil, map[string]interface{}{
		"existing_identity": "value",
	})

	if parsed.Subtype != "example" {
		t.Fatalf("expected normalized subtype, got %q", parsed.Subtype)
	}
	if parsed.Metadata["parsed"] != true {
		t.Fatalf("parsed metadata missing: %#v", parsed.Metadata)
	}
	if parsed.Identity["existing_identity"] != "overwritten" || parsed.Identity["parsed_identity"] != true {
		t.Fatalf("parser identity should merge into supplied identity: %#v", parsed.Identity)
	}
}

func TestProcessCredentialForStorageClearsStaleParserIdentity(t *testing.T) {
	credential := databaseStructs.Credential{
		Type:       "ticket",
		Credential: "not-a-ticket",
		Account:    "alice",
		Realm:      "EXAMPLE.COM",
		Subtype:    "kerberos",
	}
	metadata := map[string]interface{}{
		credentialMetadataParserKey:         "kerberos",
		credentialMetadataKerberosKey:       map[string]interface{}{"ticket_count": 1},
		credentialMetadataParserWarningsKey: []string{"old warning"},
		credentialValidityMetadataKey:       map[string]interface{}{"valid": true},
		"custom":                            "keep",
	}
	identity := map[string]interface{}{
		credentialMetadataKerberosKey: map[string]interface{}{
			"tickets": []map[string]interface{}{
				{"client_principal": "alice@EXAMPLE.COM"},
			},
		},
		"custom_identity": "keep",
	}

	ProcessCredentialForStorage(&credential, metadata, identity)
	parsedMetadata := credential.Metadata.StructValue()
	parsedIdentity := credential.Identity.StructValue()

	if parsedMetadata["custom"] != "keep" {
		t.Fatalf("custom metadata should be preserved: %#v", parsedMetadata)
	}
	if _, ok := parsedMetadata[credentialMetadataKerberosKey]; ok {
		t.Fatalf("stale kerberos metadata should be cleared before reparse: %#v", parsedMetadata)
	}
	if _, ok := parsedIdentity[credentialMetadataKerberosKey]; ok {
		t.Fatalf("stale kerberos identity should be cleared before reparse: %#v", parsedIdentity)
	}
	if parsedIdentity["custom_identity"] != "keep" {
		t.Fatalf("custom identity should be preserved: %#v", parsedIdentity)
	}
	if parsedMetadata[credentialMetadataParserKey] == "kerberos" {
		t.Fatalf("failed ticket parse should clear kerberos parser context: %#v", parsedMetadata)
	}

	credential = databaseStructs.Credential{
		Type:       "ticket",
		Credential: "still-not-a-ticket",
		Account:    "alice",
		Realm:      "EXAMPLE.COM",
		Subtype:    "kerberos",
	}
	ProcessCredentialForStorage(&credential, map[string]interface{}{
		"custom": "keep",
	}, identity)
	parsedIdentity = credential.Identity.StructValue()
	if _, ok := parsedIdentity[credentialMetadataKerberosKey]; ok {
		t.Fatalf("stale kerberos identity should be cleared even when supplied metadata has no parser key: %#v", parsedIdentity)
	}
}

func TestKerberosMetadataIsNamespacedAndLifecycleIsTopLevel(t *testing.T) {
	startTime := time.Now().UTC().Add(-time.Hour).Format(time.RFC3339)
	endTime := time.Now().UTC().Add(time.Hour).Format(time.RFC3339)
	renewUntil := time.Now().UTC().Add(2 * time.Hour).Format(time.RFC3339)
	metadata := map[string]interface{}{
		credentialMetadataParserKey: "kerberos",
	}
	kerberosMetadata := map[string]interface{}{
		"format":       "ccache",
		"ticket_count": 1,
	}
	kerberosIdentity := map[string]interface{}{
		"tickets": []map[string]interface{}{
			{
				"client_principal":  "alice@EXAMPLE.COM",
				"service_principal": "krbtgt/EXAMPLE.COM@EXAMPLE.COM",
				"start_time":        startTime,
				"end_time":          endTime,
				"renew_until":       renewUntil,
			},
		},
	}
	promoteKerberosLifecycleMetadata(metadata, kerberosIdentity)

	if metadata["not_before"] != startTime || metadata["expires_at"] != endTime || metadata["renew_until"] != renewUntil {
		t.Fatalf("lifecycle fields should remain top-level for validity tracking: %#v", metadata)
	}
	if _, ok := kerberosMetadata["tickets"]; ok {
		t.Fatalf("kerberos ticket details should not live in metadata: %#v", kerberosMetadata)
	}
}

func TestParseJWTCredentialMetadataIncludesClaimsAndLifecycle(t *testing.T) {
	issuedAt := time.Now().UTC().Add(-time.Hour).Unix()
	notBefore := time.Now().UTC().Add(-30 * time.Minute).Unix()
	expiresAt := time.Now().UTC().Add(time.Hour).Unix()
	token := testCompactJWT(t, map[string]interface{}{
		"alg": "RS256",
		"typ": "JWT",
		"kid": "key-1",
	}, map[string]interface{}{
		"iss":                "https://issuer.example/tenant",
		"sub":                "subject-1",
		"aud":                []string{"api", "cli"},
		"iat":                issuedAt,
		"nbf":                notBefore,
		"exp":                expiresAt,
		"jti":                "jwt-id-1",
		"preferred_username": "alice@example.com",
	})

	parsed := ParseCredential("jwt", "Bearer "+token, nil, nil)

	if parsed.Subtype != "jwt" {
		t.Fatalf("expected jwt subtype, got %q", parsed.Subtype)
	}
	if parsed.Metadata[credentialMetadataParserKey] != "jwt" {
		t.Fatalf("expected jwt parser metadata: %#v", parsed.Metadata)
	}
	expectedNotBefore := time.Unix(notBefore, 0).UTC().Format(time.RFC3339)
	expectedExpiresAt := time.Unix(expiresAt, 0).UTC().Format(time.RFC3339)
	if parsed.Metadata["not_before"] != expectedNotBefore || parsed.Metadata["expires_at"] != expectedExpiresAt {
		t.Fatalf("JWT lifecycle fields should be promoted for validity tracking: %#v", parsed.Metadata)
	}
	validity, ok := parsed.Metadata[credentialValidityMetadataKey].(map[string]interface{})
	if !ok || validity["valid"] != true || validity["expired"] != false {
		t.Fatalf("JWT expiration should drive credential validity metadata: %#v", parsed.Metadata)
	}
	jwtMetadata, ok := parsed.Metadata[credentialMetadataJWTKey].(map[string]interface{})
	if !ok {
		t.Fatalf("expected namespaced jwt metadata: %#v", parsed.Metadata)
	}
	if jwtMetadata["algorithm"] != "RS256" || jwtMetadata["key_id"] != "key-1" {
		t.Fatalf("expected JWT header summary metadata: %#v", jwtMetadata)
	}
	if jwtMetadata["issuer"] != "https://issuer.example/tenant" || jwtMetadata["subject"] != "subject-1" {
		t.Fatalf("expected JWT claim summary metadata: %#v", jwtMetadata)
	}
	audience, ok := jwtMetadata["audience"].([]string)
	if !ok || len(audience) != 2 || audience[0] != "api" || audience[1] != "cli" {
		t.Fatalf("expected JWT audience metadata: %#v", jwtMetadata)
	}
	jwtIdentity, ok := parsed.Identity[credentialMetadataJWTKey].(map[string]interface{})
	if !ok {
		t.Fatalf("expected namespaced jwt identity: %#v", parsed.Identity)
	}
	claims, ok := jwtIdentity["claims"].(map[string]interface{})
	if !ok || claims["preferred_username"] != "alice@example.com" {
		t.Fatalf("expected JWT claims in credential identity: %#v", jwtIdentity)
	}
}

func TestPopulateCredentialAccountRealmFromKerberosIdentity(t *testing.T) {
	metadata := map[string]interface{}{
		credentialMetadataParserKey: "kerberos",
	}
	identity := map[string]interface{}{
		credentialMetadataKerberosKey: map[string]interface{}{
			"tickets": []map[string]interface{}{
				{
					"client_principal": "alice/admin@EXAMPLE.COM",
					"client_realm":     "EXAMPLE.COM",
				},
			},
		},
	}

	account, realm := PopulateCredentialAccountRealmFromIdentity("", "", metadata, identity)
	if account != "alice/admin" || realm != "EXAMPLE.COM" {
		t.Fatalf("expected account and realm from kerberos identity, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromIdentity("supplied", "", metadata, identity)
	if account != "supplied" || realm != "EXAMPLE.COM" {
		t.Fatalf("supplied account should win while empty realm is filled, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromIdentity("", "SUPPLIED.REALM", metadata, identity)
	if account != "alice/admin" || realm != "SUPPLIED.REALM" {
		t.Fatalf("empty account should be filled while supplied realm wins, got account=%q realm=%q", account, realm)
	}
}

func TestPopulateCredentialAccountRealmFromJWTIdentity(t *testing.T) {
	metadata := map[string]interface{}{
		credentialMetadataParserKey: "jwt",
	}
	identity := map[string]interface{}{
		credentialMetadataJWTKey: map[string]interface{}{
			"claims": map[string]interface{}{
				"preferred_username": "alice@example.com",
				"iss":                "https://issuer.example/tenant",
			},
		},
	}

	account, realm := PopulateCredentialAccountRealmFromIdentity("", "", metadata, identity)
	if account != "alice@example.com" || realm != "https://issuer.example/tenant" {
		t.Fatalf("expected account and realm from jwt identity, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromIdentity("supplied", "", metadata, identity)
	if account != "supplied" || realm != "https://issuer.example/tenant" {
		t.Fatalf("supplied account should win while empty realm is filled, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromIdentity("", "SUPPLIED.REALM", metadata, identity)
	if account != "alice@example.com" || realm != "SUPPLIED.REALM" {
		t.Fatalf("empty account should be filled while supplied realm wins, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromIdentity("", "", metadata, map[string]interface{}{
		credentialMetadataJWTKey: map[string]interface{}{
			"claims": map[string]interface{}{
				"email": "bob@example.com",
			},
		},
	})
	if account != "bob@example.com" || realm != "example.com" {
		t.Fatalf("expected jwt realm fallback from email-style account, got account=%q realm=%q", account, realm)
	}
}

func TestPopulateCredentialAccountRealmIgnoresNonKerberosIdentity(t *testing.T) {
	account, realm := PopulateCredentialAccountRealmFromIdentity("", "", map[string]interface{}{
		credentialMetadataParserKey: "plaintext",
	}, map[string]interface{}{
		credentialMetadataKerberosKey: map[string]interface{}{
			"tickets": []map[string]interface{}{
				{
					"client_principal": "alice/admin@EXAMPLE.COM",
					"client_realm":     "EXAMPLE.COM",
				},
			},
		},
	})
	if account != "" || realm != "" {
		t.Fatalf("non-kerberos identity should not populate account or realm, got account=%q realm=%q", account, realm)
	}
}

func testCompactJWT(t *testing.T, header map[string]interface{}, claims map[string]interface{}) string {
	t.Helper()
	headerBytes, err := json.Marshal(header)
	if err != nil {
		t.Fatalf("failed to marshal JWT header: %v", err)
	}
	claimBytes, err := json.Marshal(claims)
	if err != nil {
		t.Fatalf("failed to marshal JWT claims: %v", err)
	}
	return fmt.Sprintf("%s.%s.signature",
		base64.RawURLEncoding.EncodeToString(headerBytes),
		base64.RawURLEncoding.EncodeToString(claimBytes),
	)
}
