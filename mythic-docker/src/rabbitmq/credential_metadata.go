package rabbitmq

import (
	"encoding/base64"
	"encoding/json"
	"fmt"
	"strings"
	"sync"
	"time"

	databaseStructs "github.com/its-a-feature/Mythic/database/structs"
	"github.com/jcmturner/gofork/encoding/asn1"
	"github.com/jcmturner/gokrb5/v8/credentials"
	"github.com/jcmturner/gokrb5/v8/messages"
	"github.com/jcmturner/gokrb5/v8/types"
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

func init() {
	RegisterCredentialMetadataParser("ticket", parseKerberosCredentialMetadata)
}

func RegisterCredentialMetadataParser(credentialType string, parser CredentialMetadataParser) {
	credentialMetadataParserRegistry.Lock()
	defer credentialMetadataParserRegistry.Unlock()
	credentialMetadataParserRegistry.parsers[strings.ToLower(strings.TrimSpace(credentialType))] = parser
}

func ParseCredential(credentialType string, credentialText string, suppliedMetadata interface{}) (databaseStructs.MythicJSONText, []string) {
	metadata := NormalizeCredentialMetadataInput(suppliedMetadata)
	credentialMetadataParserRegistry.RLock()
	parser, ok := credentialMetadataParserRegistry.parsers[strings.ToLower(strings.TrimSpace(credentialType))]
	credentialMetadataParserRegistry.RUnlock()
	if !ok {
		applyCredentialValidityToMetadata(metadata, time.Now().UTC())
		return GetMythicJSONTextFromStruct(metadata), nil
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
	return GetMythicJSONTextFromStruct(metadata), result.Warnings
}

func ParseCredentialMetadata(credentialType string, credentialText string, suppliedMetadata interface{}) databaseStructs.MythicJSONText {
	metadata, _ := ParseCredential(credentialType, credentialText, suppliedMetadata)
	return metadata
}

func NormalizeCredentialMetadataInput(input interface{}) map[string]interface{} {
	switch v := input.(type) {
	case nil:
		return map[string]interface{}{}
	case map[string]interface{}:
		return copyCredentialMetadataMap(v)
	case databaseStructs.MythicJSONText:
		return copyCredentialMetadataMap(v.StructValue())
	case *databaseStructs.MythicJSONText:
		if v == nil {
			return map[string]interface{}{}
		}
		return copyCredentialMetadataMap(v.StructValue())
	case json.RawMessage:
		return normalizeCredentialMetadataBytes(v)
	case []byte:
		return normalizeCredentialMetadataBytes(v)
	case string:
		return normalizeCredentialMetadataString(v)
	default:
		raw, err := json.Marshal(v)
		if err != nil {
			return map[string]interface{}{"value": fmt.Sprintf("%v", v)}
		}
		return normalizeCredentialMetadataBytes(raw)
	}
}

func normalizeCredentialMetadataBytes(raw []byte) map[string]interface{} {
	if len(raw) == 0 {
		return map[string]interface{}{}
	}
	var object map[string]interface{}
	if err := json.Unmarshal(raw, &object); err == nil && object != nil {
		return object
	}
	var value interface{}
	if err := json.Unmarshal(raw, &value); err == nil && value != nil {
		return map[string]interface{}{"value": value}
	}
	return map[string]interface{}{"text": string(raw)}
}

func normalizeCredentialMetadataString(raw string) map[string]interface{} {
	raw = strings.TrimSpace(raw)
	if raw == "" {
		return map[string]interface{}{}
	}
	return normalizeCredentialMetadataBytes([]byte(raw))
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

func parseKerberosCredentialMetadata(input CredentialParseInput) CredentialParseResult {
	candidates := credentialByteCandidates(input.CredentialText)
	allWarnings := make([]string, 0)
	for _, candidate := range candidates {
		metadata, warnings, ok := parseKerberosCCache(candidate)
		if ok {
			return CredentialParseResult{
				Metadata: metadata,
				Warnings: warnings,
			}
		}
		allWarnings = append(allWarnings, warnings...)
	}
	krbCredWarnings := make([]string, 0)
	for _, candidate := range candidates {
		metadata, warnings, ok := parseKerberosKRBCred(candidate)
		if ok {
			return CredentialParseResult{
				Metadata: metadata,
				Warnings: warnings,
			}
		}
		krbCredWarnings = append(krbCredWarnings, warnings...)
	}
	allWarnings = append(allWarnings, krbCredWarnings...)
	allWarnings = append(allWarnings, "unable to parse ticket credential as ccache or KRB_CRED/kirbi")
	return CredentialParseResult{
		Metadata: map[string]interface{}{
			credentialMetadataParserKey: "kerberos",
		},
		Warnings: allWarnings,
	}
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

func parseKerberosCCache(raw []byte) (metadata map[string]interface{}, warnings []string, ok bool) {
	defer func() {
		if r := recover(); r != nil {
			metadata = nil
			warnings = []string{fmt.Sprintf("ccache parser recovered from panic: %v", r)}
			ok = false
		}
	}()
	ccache := credentials.CCache{}
	if err := ccache.Unmarshal(raw); err != nil {
		return nil, []string{fmt.Sprintf("ccache parse failed: %s", err.Error())}, false
	}
	entries := ccache.GetEntries()
	tickets := make([]map[string]interface{}, 0, len(entries))
	for _, entry := range entries {
		tickets = append(tickets, kerberosTicketMetadataFromCCache(entry))
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey: "kerberos",
		"credential_format":         "ccache",
		"ticket_count":              len(tickets),
		"tickets":                   tickets,
		"client_principal":          credentialPrincipalWithRealm(ccache.GetClientPrincipalName(), ccache.GetClientRealm()),
		"client_realm":              ccache.GetClientRealm(),
	}
	promoteRepresentativeKerberosTicket(metadata, tickets)
	return metadata, nil, true
}

func parseKerberosKRBCred(raw []byte) (metadata map[string]interface{}, warnings []string, ok bool) {
	defer func() {
		if r := recover(); r != nil {
			metadata = nil
			warnings = []string{fmt.Sprintf("KRB_CRED parser recovered from panic: %v", r)}
			ok = false
		}
	}()
	krbCred := messages.KRBCred{}
	if err := krbCred.Unmarshal(raw); err != nil {
		return nil, []string{fmt.Sprintf("KRB_CRED parse failed: %s", err.Error())}, false
	}
	tickets := make([]map[string]interface{}, 0)
	if len(krbCred.EncPart.Cipher) > 0 {
		encPart := messages.EncKrbCredPart{}
		if err := encPart.Unmarshal(krbCred.EncPart.Cipher); err == nil {
			for _, ticketInfo := range encPart.TicketInfo {
				tickets = append(tickets, kerberosTicketMetadataFromKRBCredInfo(ticketInfo))
			}
		} else {
			warnings = append(warnings, "KRB_CRED encrypted part was not parseable without a decryption key; lifecycle metadata may be unavailable")
		}
	}
	if len(tickets) == 0 {
		for _, ticket := range krbCred.Tickets {
			tickets = append(tickets, map[string]interface{}{
				"service_principal": credentialPrincipalWithRealm(ticket.SName, ticket.Realm),
				"service_realm":     ticket.Realm,
			})
		}
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey: "kerberos",
		"credential_format":         "krb_cred",
		"ticket_count":              len(tickets),
		"tickets":                   tickets,
	}
	promoteRepresentativeKerberosTicket(metadata, tickets)
	return metadata, warnings, true
}

func kerberosTicketMetadataFromCCache(entry *credentials.Credential) map[string]interface{} {
	ticket := map[string]interface{}{
		"client_principal":  credentialPrincipalWithRealm(entry.Client.PrincipalName, entry.Client.Realm),
		"client_realm":      entry.Client.Realm,
		"service_principal": credentialPrincipalWithRealm(entry.Server.PrincipalName, entry.Server.Realm),
		"service_realm":     entry.Server.Realm,
		"key_type":          entry.Key.KeyType,
	}
	setKerberosTimeFields(ticket, "auth_time", entry.AuthTime)
	setKerberosTimeFields(ticket, "start_time", entry.StartTime)
	setKerberosTimeFields(ticket, "end_time", entry.EndTime)
	setKerberosTimeFields(ticket, "renew_until", entry.RenewTill)
	if len(entry.TicketFlags.Bytes) > 0 {
		ticket["flags"] = asn1BitStringHex(entry.TicketFlags)
	}
	return ticket
}

func kerberosTicketMetadataFromKRBCredInfo(info messages.KrbCredInfo) map[string]interface{} {
	ticket := map[string]interface{}{
		"client_principal":  credentialPrincipalWithRealm(info.PName, info.PRealm),
		"client_realm":      info.PRealm,
		"service_principal": credentialPrincipalWithRealm(info.SName, info.SRealm),
		"service_realm":     info.SRealm,
		"key_type":          info.Key.KeyType,
	}
	setKerberosTimeFields(ticket, "auth_time", info.AuthTime)
	setKerberosTimeFields(ticket, "start_time", info.StartTime)
	setKerberosTimeFields(ticket, "end_time", info.EndTime)
	setKerberosTimeFields(ticket, "renew_until", info.RenewTill)
	if len(info.Flags.Bytes) > 0 {
		ticket["flags"] = asn1BitStringHex(info.Flags)
	}
	return ticket
}

func promoteRepresentativeKerberosTicket(metadata map[string]interface{}, tickets []map[string]interface{}) {
	if len(tickets) == 0 {
		return
	}
	representative := tickets[0]
	for _, key := range []string{
		"client_principal",
		"client_realm",
		"service_principal",
		"service_realm",
		"auth_time",
		"start_time",
		"end_time",
		"renew_until",
	} {
		if value, ok := representative[key]; ok && fmt.Sprintf("%v", value) != "" {
			metadata[key] = value
		}
	}
	if value, ok := representative["start_time"]; ok {
		metadata["not_before"] = value
	}
	if value, ok := representative["end_time"]; ok {
		metadata["expires_at"] = value
	}
}

func setKerberosTimeFields(metadata map[string]interface{}, key string, value time.Time) {
	if value.IsZero() || value.Unix() <= 0 {
		return
	}
	metadata[key] = value.UTC().Format(time.RFC3339)
}

func credentialPrincipalWithRealm(principalName types.PrincipalName, realm string) string {
	principal := principalName.PrincipalNameString()
	if principal == "" {
		return ""
	}
	if realm == "" {
		return principal
	}
	return fmt.Sprintf("%s@%s", principal, realm)
}

func asn1BitStringHex(value asn1.BitString) string {
	return fmt.Sprintf("%x", value.Bytes)
}
