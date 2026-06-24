package rabbitmq

import (
	"fmt"
	"testing"
	"time"
)

func TestParseCredentialMergesSuppliedMetadataAndWarnings(t *testing.T) {
	parserType := fmt.Sprintf("unit-test-%d", time.Now().UnixNano())
	RegisterCredentialMetadataParser(parserType, func(input CredentialParseInput) CredentialParseResult {
		if input.CredentialText != "secret" {
			t.Fatalf("unexpected credential text: %q", input.CredentialText)
		}
		if input.SuppliedMetadata["existing"] != "value" {
			t.Fatalf("supplied metadata was not provided to parser: %#v", input.SuppliedMetadata)
		}
		return CredentialParseResult{
			Metadata: map[string]interface{}{
				"parsed":   true,
				"existing": "overwritten",
			},
			Warnings: []string{"parser warning"},
		}
	})

	metadata, warnings := ParseCredential(parserType, "secret", map[string]interface{}{
		"existing": "value",
	})

	if len(warnings) != 1 || warnings[0] != "parser warning" {
		t.Fatalf("unexpected warnings: %#v", warnings)
	}
	if metadata["existing"] != "overwritten" {
		t.Fatalf("parser metadata should override supplied metadata: %#v", metadata)
	}
	if metadata["parsed"] != true {
		t.Fatalf("parsed metadata missing: %#v", metadata)
	}
	if metadata[credentialMetadataParsedAtKey] == nil {
		t.Fatalf("parsed_at was not added: %#v", metadata)
	}
	rawWarnings, ok := metadata[credentialMetadataParserWarningsKey].([]string)
	if !ok || len(rawWarnings) != 1 || rawWarnings[0] != "parser warning" {
		t.Fatalf("parser warnings were not persisted in metadata: %#v", metadata)
	}
}

func TestMergeCredentialMetadataPreservesExistingKeysOnEmptyIncoming(t *testing.T) {
	existing := map[string]interface{}{
		"custom": "keep",
	}

	metadata := MergeCredentialMetadata("plaintext", "secret", existing, nil)

	if metadata["custom"] != "keep" {
		t.Fatalf("existing metadata should be preserved on empty incoming metadata: %#v", metadata)
	}
	if len(metadata) != 1 {
		t.Fatalf("empty incoming metadata should not add unrelated keys: %#v", metadata)
	}
}

func TestMergeCredentialMetadataIncomingKeysOverwriteExistingKeys(t *testing.T) {
	existing := map[string]interface{}{
		"custom":   "keep",
		"conflict": "old",
	}

	metadata := MergeCredentialMetadata("plaintext", "secret", existing, map[string]interface{}{
		"conflict": "new",
	})

	if metadata["custom"] != "keep" {
		t.Fatalf("unrelated existing metadata should be preserved: %#v", metadata)
	}
	if metadata["conflict"] != "new" {
		t.Fatalf("incoming metadata should overwrite conflicting existing metadata: %#v", metadata)
	}
}

func TestMergeCredentialMetadataParserOutputDoesNotDropExistingKeys(t *testing.T) {
	parserType := fmt.Sprintf("unit-test-merge-%d", time.Now().UnixNano())
	RegisterCredentialMetadataParser(parserType, func(input CredentialParseInput) CredentialParseResult {
		if input.SuppliedMetadata["incoming"] != "value" {
			t.Fatalf("incoming metadata was not provided to parser: %#v", input.SuppliedMetadata)
		}
		return CredentialParseResult{
			Metadata: map[string]interface{}{
				"parsed":   true,
				"conflict": "parser",
			},
		}
	})
	existing := map[string]interface{}{
		"custom":   "keep",
		"conflict": "existing",
	}

	metadata := MergeCredentialMetadata(parserType, "secret", existing, map[string]interface{}{
		"incoming": "value",
	})

	if metadata["custom"] != "keep" {
		t.Fatalf("parser merge should preserve unrelated existing metadata: %#v", metadata)
	}
	if metadata["incoming"] != "value" {
		t.Fatalf("parser merge should preserve incoming metadata: %#v", metadata)
	}
	if metadata["parsed"] != true {
		t.Fatalf("parser metadata missing after merge: %#v", metadata)
	}
	if metadata["conflict"] != "parser" {
		t.Fatalf("parser metadata should overwrite conflicting existing metadata: %#v", metadata)
	}
}

func TestMergeCredentialMetadataRefreshesValidityFromExistingLifecycle(t *testing.T) {
	existing := map[string]interface{}{
		"expires_at": time.Now().UTC().Add(-time.Hour).Format(time.RFC3339),
		"validity": map[string]interface{}{
			"valid":   true,
			"expired": false,
		},
	}

	metadata := MergeCredentialMetadata("plaintext", "secret", existing, nil)
	validity, ok := metadata[credentialValidityMetadataKey].(map[string]interface{})
	if !ok {
		t.Fatalf("validity metadata missing after merge: %#v", metadata)
	}
	if validity["valid"] != false || validity["expired"] != true {
		t.Fatalf("validity metadata should be refreshed from existing lifecycle fields: %#v", validity)
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
		"credential_format": "ccache",
		"ticket_count":      1,
	}

	promoteRepresentativeKerberosTicket(kerberosMetadata, []map[string]interface{}{
		{
			"client_principal":  "alice@EXAMPLE.COM",
			"service_principal": "krbtgt/EXAMPLE.COM@EXAMPLE.COM",
			"start_time":        startTime,
			"end_time":          endTime,
			"renew_until":       renewUntil,
		},
	})
	promoteKerberosLifecycleMetadata(metadata, kerberosMetadata)

	if metadata["client_principal"] != nil || metadata["credential_format"] != nil || metadata["ticket_count"] != nil {
		t.Fatalf("kerberos details should not be promoted into top-level metadata: %#v", metadata)
	}
	if kerberosMetadata["client_principal"] != "alice@EXAMPLE.COM" {
		t.Fatalf("kerberos client principal missing from namespaced metadata: %#v", kerberosMetadata)
	}
	if metadata["not_before"] != startTime || metadata["expires_at"] != endTime || metadata["renew_until"] != renewUntil {
		t.Fatalf("lifecycle fields should remain top-level for validity tracking: %#v", metadata)
	}
}

func TestPopulateCredentialAccountRealmFromKerberosMetadata(t *testing.T) {
	metadata := map[string]interface{}{
		credentialMetadataParserKey: "kerberos",
		credentialMetadataKerberosKey: map[string]interface{}{
			"client_principal": "alice/admin@EXAMPLE.COM",
			"client_realm":     "EXAMPLE.COM",
		},
	}

	account, realm := PopulateCredentialAccountRealmFromMetadata("", "", metadata)
	if account != "alice/admin" || realm != "EXAMPLE.COM" {
		t.Fatalf("expected account and realm from kerberos metadata, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromMetadata("supplied", "", metadata)
	if account != "supplied" || realm != "EXAMPLE.COM" {
		t.Fatalf("supplied account should win while empty realm is filled, got account=%q realm=%q", account, realm)
	}

	account, realm = PopulateCredentialAccountRealmFromMetadata("", "SUPPLIED.REALM", metadata)
	if account != "alice/admin" || realm != "SUPPLIED.REALM" {
		t.Fatalf("empty account should be filled while supplied realm wins, got account=%q realm=%q", account, realm)
	}
}

func TestPopulateCredentialAccountRealmIgnoresNonKerberosMetadata(t *testing.T) {
	account, realm := PopulateCredentialAccountRealmFromMetadata("", "", map[string]interface{}{
		credentialMetadataParserKey: "plaintext",
		credentialMetadataKerberosKey: map[string]interface{}{
			"client_principal": "alice@EXAMPLE.COM",
			"client_realm":     "EXAMPLE.COM",
		},
	})
	if account != "" || realm != "" {
		t.Fatalf("non-kerberos metadata should not populate account or realm, got account=%q realm=%q", account, realm)
	}
}
