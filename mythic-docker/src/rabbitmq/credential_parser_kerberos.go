package rabbitmq

import (
	"fmt"
	"strings"
	"time"

	"github.com/jcmturner/gofork/encoding/asn1"
	"github.com/jcmturner/gokrb5/v8/credentials"
	"github.com/jcmturner/gokrb5/v8/messages"
	"github.com/jcmturner/gokrb5/v8/types"
)

const (
	credentialMetadataKerberosKey = "kerberos"
)

func init() {
	RegisterCredentialMetadataParser("ticket", parseKerberosCredentialMetadata)
	RegisterCredentialParseAccountRealm(credentialMetadataKerberosKey, parseKerberosAccountRealmFromMetadata)
}

func parseKerberosAccountRealmFromMetadata(input CredentialParseAccountRealmInput) CredentialParseAccountRealmResult {
	result := CredentialParseAccountRealmResult{
		Account: input.Account,
		Realm:   input.Realm,
	}
	if input.Metadata[credentialMetadataParserKey] != "kerberos" {
		return result
	}
	kerberosMetadata, ok := input.Metadata[credentialMetadataKerberosKey].(map[string]interface{})
	if !ok {
		return result
	}
	clientPrincipal := strings.TrimSpace(fmt.Sprintf("%v", kerberosMetadata["client_principal"]))
	clientRealm := strings.TrimSpace(fmt.Sprintf("%v", kerberosMetadata["client_realm"]))
	principalAccount, principalRealm := splitKerberosPrincipal(clientPrincipal)
	if strings.TrimSpace(input.Account) == "" {
		result.Account = principalAccount
	}
	if strings.TrimSpace(input.Realm) == "" {
		if clientRealm != "" && clientRealm != "<nil>" {
			result.Realm = clientRealm
		} else {
			result.Realm = principalRealm
		}
	}
	return result
}

func splitKerberosPrincipal(principal string) (string, string) {
	principal = strings.TrimSpace(principal)
	if principal == "" || principal == "<nil>" {
		return "", ""
	}
	atIndex := strings.LastIndex(principal, "@")
	if atIndex < 0 {
		return principal, ""
	}
	return principal[:atIndex], principal[atIndex+1:]
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
		tickets = append(tickets, ticket)
	}
	kerberosMetadata := map[string]interface{}{
		"credential_format": "ccache",
		"ticket_count":      len(tickets),
		"tickets":           tickets,
		"client_principal":  credentialPrincipalWithRealm(ccache.GetClientPrincipalName(), ccache.GetClientRealm()),
		"client_realm":      ccache.GetClientRealm(),
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey:   "kerberos",
		credentialMetadataKerberosKey: kerberosMetadata,
	}
	promoteRepresentativeKerberosTicket(kerberosMetadata, tickets)
	promoteKerberosLifecycleMetadata(metadata, kerberosMetadata)
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
				ticket := map[string]interface{}{
					"client_principal":  credentialPrincipalWithRealm(ticketInfo.PName, ticketInfo.PRealm),
					"client_realm":      ticketInfo.PRealm,
					"service_principal": credentialPrincipalWithRealm(ticketInfo.SName, ticketInfo.SRealm),
					"service_realm":     ticketInfo.SRealm,
					"key_type":          ticketInfo.Key.KeyType,
				}
				setKerberosTimeFields(ticket, "auth_time", ticketInfo.AuthTime)
				setKerberosTimeFields(ticket, "start_time", ticketInfo.StartTime)
				setKerberosTimeFields(ticket, "end_time", ticketInfo.EndTime)
				setKerberosTimeFields(ticket, "renew_until", ticketInfo.RenewTill)
				if len(ticketInfo.Flags.Bytes) > 0 {
					ticket["flags"] = asn1BitStringHex(ticketInfo.Flags)
				}
				tickets = append(tickets, ticket)
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
	kerberosMetadata := map[string]interface{}{
		"credential_format": "krb_cred",
		"ticket_count":      len(tickets),
		"tickets":           tickets,
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey:   "kerberos",
		credentialMetadataKerberosKey: kerberosMetadata,
	}
	promoteRepresentativeKerberosTicket(kerberosMetadata, tickets)
	promoteKerberosLifecycleMetadata(metadata, kerberosMetadata)
	return metadata, warnings, true
}

func promoteRepresentativeKerberosTicket(kerberosMetadata map[string]interface{}, tickets []map[string]interface{}) {
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
			kerberosMetadata[key] = value
		}
	}
}

func promoteKerberosLifecycleMetadata(metadata map[string]interface{}, kerberosMetadata map[string]interface{}) {
	if value, ok := kerberosMetadata["start_time"]; ok {
		metadata["not_before"] = value
	}
	if value, ok := kerberosMetadata["end_time"]; ok {
		metadata["expires_at"] = value
	}
	if value, ok := kerberosMetadata["renew_until"]; ok {
		metadata["renew_until"] = value
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
