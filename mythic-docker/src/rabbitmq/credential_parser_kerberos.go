package rabbitmq

import (
	"fmt"
	"strings"
	"time"

	"github.com/its-a-feature/Mythic/logging"
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
	kerberosIdentity, ok := input.Identity[credentialMetadataKerberosKey].(map[string]interface{})
	if !ok {
		logging.LogDebug("kerberos identity not map")
		return result
	}
	kerberosTickets, ok := kerberosIdentity["tickets"].([]map[string]interface{})
	if !ok {
		logging.LogDebug("tickets not array of map", "tickets", kerberosIdentity)
		return result
	}
	for _, ticket := range kerberosTickets {
		clientPrincipal := strings.TrimSpace(fmt.Sprintf("%v", ticket["client_principal"]))
		clientRealm := strings.TrimSpace(fmt.Sprintf("%v", ticket["client_realm"]))
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
		metadata, identity, warnings, ok := parseKerberosCCache(candidate)
		if ok {
			return CredentialParseResult{
				Metadata: metadata,
				Identity: identity,
				Subtype:  "kerberos",
				Warnings: warnings,
				Success:  true,
			}
		}
		allWarnings = append(allWarnings, warnings...)
	}
	for _, candidate := range candidates {
		metadata, identity, warnings, ok := parseKerberosKRBCred(candidate)
		if ok {
			return CredentialParseResult{
				Metadata: metadata,
				Identity: identity,
				Subtype:  "kerberos",
				Warnings: warnings,
				Success:  true,
			}
		}
		allWarnings = append(allWarnings, warnings...)
	}
	allWarnings = append(allWarnings, "no valid kerberos credential format found")
	return CredentialParseResult{
		Metadata: map[string]interface{}{},
		Identity: map[string]interface{}{},
		Warnings: allWarnings,
		Success:  false,
	}
}

func parseKerberosCCache(raw []byte) (metadata map[string]interface{}, identity map[string]interface{}, warnings []string, ok bool) {
	defer func() {
		if r := recover(); r != nil {
			metadata = nil
			identity = nil
			warnings = []string{fmt.Sprintf("ccache parser recovered from panic: %v", r)}
			ok = false
		}
	}()
	ccache := credentials.CCache{}
	if err := ccache.Unmarshal(raw); err != nil {
		return nil, nil, []string{fmt.Sprintf("ccache parse failed: %s", err.Error())}, false
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
		if len(entry.Key.KeyValue) > 0 {
			ticket["key"] = bytesStringHex(entry.Key.KeyValue)
		}
		tickets = append(tickets, ticket)
	}
	kerberosMetadata := map[string]interface{}{
		"format":       "ccache",
		"ticket_count": len(tickets),
	}
	kerberosIdentity := map[string]interface{}{
		"tickets": tickets,
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey:   "kerberos",
		credentialMetadataKerberosKey: kerberosMetadata,
	}
	identity = map[string]interface{}{
		credentialMetadataKerberosKey: kerberosIdentity,
	}
	promoteKerberosLifecycleMetadata(metadata, kerberosIdentity)
	return metadata, identity, nil, true
}

func parseKerberosKRBCred(raw []byte) (metadata map[string]interface{}, identity map[string]interface{}, warnings []string, ok bool) {
	defer func() {
		if r := recover(); r != nil {
			metadata = nil
			identity = nil
			warnings = []string{fmt.Sprintf("KRB_CRED parser recovered from panic: %v", r)}
			ok = false
		}
	}()
	krbCred := messages.KRBCred{}
	if err := krbCred.Unmarshal(raw); err != nil {
		return nil, nil, []string{fmt.Sprintf("KRB_CRED parse failed: %s", err.Error())}, false
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
				if len(ticketInfo.Key.KeyValue) > 0 {
					ticket["key"] = bytesStringHex(ticketInfo.Key.KeyValue)
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
		"format":       "krb_cred",
		"ticket_count": len(tickets),
	}
	kerberosIdentity := map[string]interface{}{
		"tickets": tickets,
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey:   "kerberos",
		credentialMetadataKerberosKey: kerberosMetadata,
	}
	identity = map[string]interface{}{
		credentialMetadataKerberosKey: kerberosIdentity,
	}
	promoteKerberosLifecycleMetadata(metadata, kerberosIdentity)
	return metadata, identity, warnings, true
}

func promoteKerberosLifecycleMetadata(metadata map[string]interface{}, kerberosIdentity map[string]interface{}) {
	tickets, ok := kerberosIdentity["tickets"].([]map[string]interface{})
	if !ok || len(tickets) == 0 {
		return
	}
	representative := tickets[0]
	if value, ok := representative["start_time"]; ok {
		metadata["not_before"] = value
	}
	if value, ok := representative["end_time"]; ok {
		metadata["expires_at"] = value
	}
	if value, ok := representative["renew_until"]; ok {
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
func bytesStringHex(value []byte) string {
	return fmt.Sprintf("%x", value)
}
