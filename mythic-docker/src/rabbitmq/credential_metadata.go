package rabbitmq

import (
	"encoding/base64"
	"fmt"
	"strings"
	"sync"
	"time"

	"github.com/its-a-feature/Mythic/logging"
)

const (
	credentialMetadataParserKey         = "parser"
	credentialMetadataParsedAtKey       = "parsed_at"
	credentialMetadataParserWarningsKey = "parser_warnings"
)

type CredentialParseInput struct {
	Type             string
	CredentialText   string
	SuppliedMetadata map[string]interface{}
}

type CredentialParseResult struct {
	Metadata map[string]interface{}
	Warnings []string
}

type CredentialMetadataParser func(input CredentialParseInput) CredentialParseResult

var credentialMetadataParserRegistry = struct {
	sync.RWMutex
	parsers map[string]CredentialMetadataParser
}{
	parsers: make(map[string]CredentialMetadataParser),
}

type CredentialAccountRealmParser func(input CredentialParseAccountRealmInput) CredentialParseAccountRealmResult
type CredentialParseAccountRealmInput struct {
	Metadata map[string]interface{}
	Account  string
	Realm    string
}

type CredentialParseAccountRealmResult struct {
	Account string
	Realm   string
}

var credentialParseAccountRealmRegistry = struct {
	sync.RWMutex
	parsers map[string]CredentialAccountRealmParser
}{
	parsers: make(map[string]CredentialAccountRealmParser),
}

func RegisterCredentialMetadataParser(credentialType string, parser CredentialMetadataParser) {
	credentialMetadataParserRegistry.Lock()
	defer credentialMetadataParserRegistry.Unlock()
	credentialMetadataParserRegistry.parsers[strings.ToLower(strings.TrimSpace(credentialType))] = parser
}
func RegisterCredentialParseAccountRealm(parserType string, parser CredentialAccountRealmParser) {
	credentialParseAccountRealmRegistry.Lock()
	defer credentialParseAccountRealmRegistry.Unlock()
	credentialParseAccountRealmRegistry.parsers[strings.ToLower(strings.TrimSpace(parserType))] = parser
}

func ParseCredential(credentialType string, credentialText string, suppliedMetadata map[string]interface{}) (map[string]interface{}, []string) {
	metadata := copyCredentialMetadataMap(suppliedMetadata)
	credentialMetadataParserRegistry.RLock()
	parser, ok := credentialMetadataParserRegistry.parsers[strings.ToLower(strings.TrimSpace(credentialType))]
	credentialMetadataParserRegistry.RUnlock()
	if !ok {
		applyCredentialValidityToMetadata(metadata, time.Now().UTC())
		return metadata, nil
	}

	result := parser(CredentialParseInput{
		Type:             credentialType,
		CredentialText:   credentialText,
		SuppliedMetadata: copyCredentialMetadataMap(metadata),
	})
	for key, value := range result.Metadata {
		metadata[key] = value
	}
	if len(result.Warnings) > 0 {
		metadata[credentialMetadataParserWarningsKey] = appendCredentialParserWarnings(metadata[credentialMetadataParserWarningsKey], result.Warnings)
	}
	metadata[credentialMetadataParsedAtKey] = time.Now().UTC().Format(time.RFC3339)
	applyCredentialValidityToMetadata(metadata, time.Now().UTC())
	return metadata, result.Warnings
}

func MergeCredentialMetadata(credentialType string, credentialText string, existingMetadata map[string]interface{}, suppliedMetadata map[string]interface{}) map[string]interface{} {
	mergedMetadata := existingMetadata
	incomingMetadata, errorList := ParseCredential(credentialType, credentialText, suppliedMetadata)
	if errorList != nil {
		logging.LogInfo("unable to parse credential metadata", "errors", errorList)
		return existingMetadata
	}
	for key, value := range incomingMetadata {
		mergedMetadata[key] = value
	}
	applyCredentialValidityToMetadata(mergedMetadata, time.Now().UTC())
	return mergedMetadata
}

func copyCredentialMetadataMap(input map[string]interface{}) map[string]interface{} {
	output := make(map[string]interface{}, len(input))
	for key, value := range input {
		output[key] = value
	}
	return output
}

func appendCredentialParserWarnings(existing interface{}, warnings []string) []string {
	seen := make(map[string]bool)
	combined := make([]string, 0)
	add := func(value string) {
		value = strings.TrimSpace(value)
		if value == "" || seen[value] {
			return
		}
		seen[value] = true
		combined = append(combined, value)
	}
	switch v := existing.(type) {
	case []string:
		for _, warning := range v {
			add(warning)
		}
	case []interface{}:
		for _, warning := range v {
			add(fmt.Sprintf("%v", warning))
		}
	case string:
		add(v)
	}
	for _, warning := range warnings {
		add(warning)
	}
	return combined
}

func credentialByteCandidates(credentialText string) [][]byte {
	raw := []byte(strings.TrimSpace(credentialText))
	candidates := make([][]byte, 0)
	add := func(candidate []byte) {
		if len(candidate) == 0 {
			return
		}
		for _, existing := range candidates {
			if string(existing) == string(candidate) {
				return
			}
		}
		candidates = append(candidates, candidate)
	}
	withoutWhitespace := strings.NewReplacer("\n", "", "\r", "", "\t", "", " ", "").Replace(strings.TrimSpace(credentialText))
	for _, encoding := range []*base64.Encoding{
		base64.StdEncoding,
		base64.RawStdEncoding,
		base64.URLEncoding,
		base64.RawURLEncoding,
	} {
		if decoded, err := encoding.DecodeString(withoutWhitespace); err == nil {
			add(decoded)
		}
	}
	add(raw)
	return candidates
}

func PopulateCredentialAccountRealmFromMetadata(account string, realm string, metadata map[string]interface{}) (string, string) {
	parser, ok := metadata[credentialMetadataParserKey]
	if !ok {
		return account, realm
	}
	credentialParseAccountRealmRegistry.RLock()
	parserFunc, ok := credentialParseAccountRealmRegistry.parsers[parser.(string)]
	credentialParseAccountRealmRegistry.RUnlock()
	if !ok {
		return account, realm
	}
	result := parserFunc(CredentialParseAccountRealmInput{
		Metadata: metadata,
		Account:  account,
		Realm:    realm,
	})
	return result.Account, result.Realm
}
