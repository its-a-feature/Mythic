package rabbitmq

import (
	"encoding/base64"
	"fmt"
	"strings"
	"sync"
	"time"
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
	SuppliedIdentity map[string]interface{}
}

type CredentialParseResult struct {
	Metadata map[string]interface{}
	Identity map[string]interface{}
	Subtype  string
	Warnings []string
	Success  bool
}

type ParsedCredentialData struct {
	Metadata map[string]interface{}
	Identity map[string]interface{}
	Subtype  string
	Warnings []string
}

type CredentialMetadataParser func(input CredentialParseInput) CredentialParseResult

var credentialMetadataParserRegistry = struct {
	sync.RWMutex
	parsers map[string][]CredentialMetadataParser
}{
	parsers: make(map[string][]CredentialMetadataParser),
}

type CredentialAccountRealmParser func(input CredentialParseAccountRealmInput) CredentialParseAccountRealmResult
type CredentialParseAccountRealmInput struct {
	Metadata map[string]interface{}
	Identity map[string]interface{}
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
	credentialType = strings.ToLower(strings.TrimSpace(credentialType))
	credentialMetadataParserRegistry.parsers[credentialType] = append(credentialMetadataParserRegistry.parsers[credentialType], parser)
}
func RegisterCredentialParseAccountRealm(parserType string, parser CredentialAccountRealmParser) {
	credentialParseAccountRealmRegistry.Lock()
	defer credentialParseAccountRealmRegistry.Unlock()
	parserType = strings.ToLower(strings.TrimSpace(parserType))
	credentialParseAccountRealmRegistry.parsers[parserType] = parser
}

func ParseCredential(credentialType string, credentialText string, suppliedMetadata map[string]interface{}, suppliedIdentity map[string]interface{}) ParsedCredentialData {
	metadata := copyCredentialMap(suppliedMetadata)
	identity := copyCredentialMap(suppliedIdentity)
	credentialMetadataParserRegistry.RLock()
	parsers, ok := credentialMetadataParserRegistry.parsers[strings.ToLower(strings.TrimSpace(credentialType))]
	credentialMetadataParserRegistry.RUnlock()
	if !ok {
		applyCredentialValidityToMetadata(metadata, time.Now().UTC())
		return ParsedCredentialData{
			Metadata: metadata,
			Identity: identity,
		}
	}
	for _, parser := range parsers {
		result := parser(CredentialParseInput{
			Type:             credentialType,
			CredentialText:   credentialText,
			SuppliedMetadata: metadata,
			SuppliedIdentity: identity,
		})
		if !result.Success {
			continue
		}
		for key, value := range result.Metadata {
			metadata[key] = value
		}
		for key, value := range result.Identity {
			identity[key] = value
		}
		if len(result.Warnings) > 0 {
			metadata[credentialMetadataParserWarningsKey] = appendCredentialParserWarnings(metadata[credentialMetadataParserWarningsKey], result.Warnings)
		}
		metadata[credentialMetadataParsedAtKey] = time.Now().UTC().Format(time.RFC3339)
		applyCredentialValidityToMetadata(metadata, time.Now().UTC())
		return ParsedCredentialData{
			Metadata: metadata,
			Identity: identity,
			Subtype:  strings.ToLower(strings.TrimSpace(result.Subtype)),
			Warnings: result.Warnings,
		}
	}
	applyCredentialValidityToMetadata(metadata, time.Now().UTC())
	return ParsedCredentialData{
		Metadata: metadata,
		Identity: identity,
	}
}

func stripCredentialParserData(metadata map[string]interface{}, identity map[string]interface{}) (map[string]interface{}, map[string]interface{}) {
	cleanMetadata := copyCredentialMap(metadata)
	cleanIdentity := copyCredentialMap(identity)
	parserName, ok := cleanMetadata[credentialMetadataParserKey]
	if ok {
		parserNameString := strings.ToLower(strings.TrimSpace(parserName.(string)))
		if parserNameString != "" {
			delete(cleanMetadata, parserNameString)
			delete(cleanIdentity, parserNameString)
		}
	}
	credentialParseAccountRealmRegistry.RLock()
	for parserNamespace := range credentialParseAccountRealmRegistry.parsers {
		delete(cleanMetadata, parserNamespace)
		delete(cleanIdentity, parserNamespace)
	}
	credentialParseAccountRealmRegistry.RUnlock()
	delete(cleanMetadata, credentialMetadataParserKey)
	delete(cleanMetadata, credentialMetadataParsedAtKey)
	delete(cleanMetadata, credentialMetadataParserWarningsKey)
	delete(cleanMetadata, credentialValidityMetadataKey)
	delete(cleanMetadata, "not_before")
	delete(cleanMetadata, "expires_at")
	delete(cleanMetadata, "renew_until")
	return cleanMetadata, cleanIdentity
}

func copyCredentialMap(input map[string]interface{}) map[string]interface{} {
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

func PopulateCredentialAccountRealmFromIdentity(account string, realm string, metadata map[string]interface{}, identity map[string]interface{}) (string, string) {
	parserStringKeyword, ok := metadata[credentialMetadataParserKey]
	if !ok {
		return account, realm
	}
	parserName, ok := parserStringKeyword.(string)
	if !ok {
		return account, realm
	}
	credentialParseAccountRealmRegistry.RLock()
	parserFunc, ok := credentialParseAccountRealmRegistry.parsers[strings.ToLower(strings.TrimSpace(parserName))]
	credentialParseAccountRealmRegistry.RUnlock()
	if !ok {
		return account, realm
	}
	result := parserFunc(CredentialParseAccountRealmInput{
		Metadata: metadata,
		Identity: identity,
		Account:  account,
		Realm:    realm,
	})
	return result.Account, result.Realm
}
