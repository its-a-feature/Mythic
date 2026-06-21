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

	metadataJSON, warnings := ParseCredential(parserType, "secret", map[string]interface{}{
		"existing": "value",
	})
	metadata := metadataJSON.StructValue()

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
	rawWarnings, ok := metadata[credentialMetadataParserWarningsKey].([]interface{})
	if !ok || len(rawWarnings) != 1 || rawWarnings[0] != "parser warning" {
		t.Fatalf("parser warnings were not persisted in metadata: %#v", metadata)
	}
}

func TestNormalizeCredentialMetadataInput(t *testing.T) {
	metadata := NormalizeCredentialMetadataInput(`{"alpha": "bravo"}`)
	if metadata["alpha"] != "bravo" {
		t.Fatalf("json object string did not normalize: %#v", metadata)
	}
	metadata = NormalizeCredentialMetadataInput("not-json")
	if metadata["text"] != "not-json" {
		t.Fatalf("plain metadata string should be preserved as text: %#v", metadata)
	}
}
