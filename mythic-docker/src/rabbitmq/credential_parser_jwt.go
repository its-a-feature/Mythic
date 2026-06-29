package rabbitmq

import (
	"bytes"
	"encoding/base64"
	"encoding/json"
	"fmt"
	"math"
	"strconv"
	"strings"
	"time"
)

const (
	credentialMetadataJWTKey = "jwt"
)

func init() {
	RegisterCredentialMetadataParser("jwt", parseJWTCredentialMetadata)
	RegisterCredentialParseAccountRealm(credentialMetadataJWTKey, parseJWTAccountRealmFromMetadata)
}

func parseJWTAccountRealmFromMetadata(input CredentialParseAccountRealmInput) CredentialParseAccountRealmResult {
	result := CredentialParseAccountRealmResult{
		Account: input.Account,
		Realm:   input.Realm,
	}
	if input.Metadata[credentialMetadataParserKey] != "jwt" {
		return result
	}
	jwtIdentity, ok := input.Identity[credentialMetadataJWTKey].(map[string]interface{})
	if !ok {
		return result
	}
	claims, ok := jwtIdentity["claims"].(map[string]interface{})
	if !ok {
		return result
	}
	account := firstJWTStringClaim(claims, []string{
		"preferred_username",
		"upn",
		"unique_name",
		"email",
		"username",
		"user_name",
		"name",
		"sub",
	})
	if strings.TrimSpace(input.Account) == "" {
		result.Account = account
	}
	if strings.TrimSpace(input.Realm) == "" {
		if issuer := jwtStringClaim(claims, "iss"); issuer != "" {
			result.Realm = issuer
		} else if tenantID := firstJWTStringClaim(claims, []string{"tid", "tenant_id"}); tenantID != "" {
			result.Realm = tenantID
		} else if _, realm := splitJWTAccountRealm(account); realm != "" {
			result.Realm = realm
		}
	}
	return result
}

func parseJWTCredentialMetadata(input CredentialParseInput) CredentialParseResult {
	metadata, identity, warnings, ok := parseJWTMetadata(input.CredentialText)
	if !ok {
		return CredentialParseResult{
			Metadata: map[string]interface{}{},
			Identity: map[string]interface{}{},
			Warnings: warnings,
			Success:  false,
		}
	}
	return CredentialParseResult{
		Metadata: metadata,
		Identity: identity,
		Subtype:  "jwt",
		Warnings: warnings,
		Success:  true,
	}
}

func parseJWTMetadata(credentialText string) (metadata map[string]interface{}, identity map[string]interface{}, warnings []string, ok bool) {
	tokenString := normalizeJWTString(credentialText)
	if tokenString == "" {
		return nil, nil, []string{"empty JWT credential"}, false
	}
	parts := strings.Split(tokenString, ".")
	if len(parts) != 3 {
		if len(parts) == 5 {
			return nil, nil, []string{"encrypted JWT/JWE credentials are not supported for metadata parsing"}, false
		}
		return nil, nil, []string{"JWT credential must use compact serialization with three segments"}, false
	}
	header, err := decodeJWTJSONSegment(parts[0])
	if err != nil {
		return nil, nil, []string{fmt.Sprintf("JWT header parse failed: %s", err.Error())}, false
	}
	claims, err := decodeJWTJSONSegment(parts[1])
	if err != nil {
		return nil, nil, []string{fmt.Sprintf("JWT claims parse failed: %s", err.Error())}, false
	}
	jwtMetadata := map[string]interface{}{
		"claim_count":       len(claims),
		"signature_present": parts[2] != "",
	}
	setJWTStringMetadata(jwtMetadata, "algorithm", header, "alg")
	setJWTStringMetadata(jwtMetadata, "type", header, "typ")
	setJWTStringMetadata(jwtMetadata, "content_type", header, "cty")
	setJWTStringMetadata(jwtMetadata, "key_id", header, "kid")
	setJWTStringMetadata(jwtMetadata, "issuer", claims, "iss")
	setJWTStringMetadata(jwtMetadata, "subject", claims, "sub")
	setJWTStringMetadata(jwtMetadata, "jwt_id", claims, "jti")
	if audience := jwtStringListClaim(claims, "aud"); len(audience) > 0 {
		jwtMetadata["audience"] = audience
	}
	setJWTTimeMetadata(jwtMetadata, "issued_at", claims["iat"])
	setJWTTimeMetadata(jwtMetadata, "not_before", claims["nbf"])
	setJWTTimeMetadata(jwtMetadata, "expires_at", claims["exp"])
	if algorithm := strings.ToLower(jwtStringClaim(header, "alg")); algorithm == "none" {
		warnings = append(warnings, "JWT uses the none signing algorithm")
	}
	metadata = map[string]interface{}{
		credentialMetadataParserKey: "jwt",
		credentialMetadataJWTKey:    jwtMetadata,
	}
	identity = map[string]interface{}{
		credentialMetadataJWTKey: map[string]interface{}{
			"header": header,
			"claims": claims,
		},
	}
	promoteJWTLifecycleMetadata(metadata, jwtMetadata)
	return metadata, identity, warnings, true
}

func promoteJWTLifecycleMetadata(metadata map[string]interface{}, jwtMetadata map[string]interface{}) {
	if value, ok := jwtMetadata["not_before"]; ok {
		metadata["not_before"] = value
	}
	if value, ok := jwtMetadata["expires_at"]; ok {
		metadata["expires_at"] = value
	}
}

func normalizeJWTString(credentialText string) string {
	credentialText = strings.TrimSpace(credentialText)
	credentialText = strings.Trim(credentialText, "\"'`")
	fields := strings.Fields(credentialText)
	if len(fields) == 2 && strings.EqualFold(fields[0], "bearer") {
		return strings.TrimSpace(fields[1])
	}
	return credentialText
}

func decodeJWTJSONSegment(segment string) (map[string]interface{}, error) {
	decoded, err := decodeJWTBase64URLSegment(segment)
	if err != nil {
		return nil, err
	}
	decoder := json.NewDecoder(bytes.NewReader(decoded))
	decoder.UseNumber()
	output := make(map[string]interface{})
	if err := decoder.Decode(&output); err != nil {
		return nil, err
	}
	if output == nil {
		output = make(map[string]interface{})
	}
	return output, nil
}

func decodeJWTBase64URLSegment(segment string) ([]byte, error) {
	for _, encoding := range []*base64.Encoding{
		base64.RawURLEncoding,
		base64.URLEncoding,
		base64.RawStdEncoding,
		base64.StdEncoding,
	} {
		if decoded, err := encoding.DecodeString(segment); err == nil {
			return decoded, nil
		}
	}
	return nil, fmt.Errorf("invalid base64url segment")
}

func setJWTStringMetadata(metadata map[string]interface{}, metadataKey string, claims map[string]interface{}, claimKey string) {
	if value := jwtStringClaim(claims, claimKey); value != "" {
		metadata[metadataKey] = value
	}
}

func setJWTTimeMetadata(metadata map[string]interface{}, key string, value interface{}) {
	if parsed, ok := jwtTimeClaim(value); ok {
		metadata[key] = parsed.UTC().Format(time.RFC3339)
	}
}

func firstJWTStringClaim(claims map[string]interface{}, keys []string) string {
	for _, key := range keys {
		if value := jwtStringClaim(claims, key); value != "" {
			return value
		}
	}
	return ""
}

func jwtStringClaim(claims map[string]interface{}, key string) string {
	value, ok := claims[key]
	if !ok || value == nil {
		return ""
	}
	switch typedValue := value.(type) {
	case string:
		return strings.TrimSpace(typedValue)
	case json.Number:
		return strings.TrimSpace(typedValue.String())
	case []byte:
		return strings.TrimSpace(string(typedValue))
	default:
		return strings.TrimSpace(fmt.Sprintf("%v", typedValue))
	}
}

func jwtStringListClaim(claims map[string]interface{}, key string) []string {
	value, ok := claims[key]
	if !ok || value == nil {
		return nil
	}
	values := make([]string, 0)
	add := func(candidate string) {
		candidate = strings.TrimSpace(candidate)
		if candidate != "" {
			values = append(values, candidate)
		}
	}
	switch typedValue := value.(type) {
	case string:
		add(typedValue)
	case []string:
		for _, candidate := range typedValue {
			add(candidate)
		}
	case []interface{}:
		for _, candidate := range typedValue {
			add(fmt.Sprintf("%v", candidate))
		}
	}
	return values
}

func jwtTimeClaim(value interface{}) (time.Time, bool) {
	switch typedValue := value.(type) {
	case nil:
		return time.Time{}, false
	case json.Number:
		return jwtNumericDateToTime(typedValue.String())
	case float64:
		return jwtNumericDateFloatToTime(typedValue)
	case float32:
		return jwtNumericDateFloatToTime(float64(typedValue))
	case int:
		return jwtUnixSecondsToTime(int64(typedValue))
	case int64:
		return jwtUnixSecondsToTime(typedValue)
	case int32:
		return jwtUnixSecondsToTime(int64(typedValue))
	case uint:
		return jwtUnixSecondsToTime(int64(typedValue))
	case uint64:
		if typedValue > math.MaxInt64 {
			return time.Time{}, false
		}
		return jwtUnixSecondsToTime(int64(typedValue))
	case uint32:
		return jwtUnixSecondsToTime(int64(typedValue))
	case string:
		typedValue = strings.TrimSpace(typedValue)
		if typedValue == "" {
			return time.Time{}, false
		}
		if parsed, ok := jwtNumericDateToTime(typedValue); ok {
			return parsed, true
		}
		return parseCredentialMetadataTimeString(typedValue)
	default:
		return jwtNumericDateToTime(fmt.Sprintf("%v", typedValue))
	}
}

func jwtNumericDateToTime(value string) (time.Time, bool) {
	if seconds, err := strconv.ParseInt(value, 10, 64); err == nil {
		return jwtUnixSecondsToTime(seconds)
	}
	seconds, err := strconv.ParseFloat(value, 64)
	if err != nil {
		return time.Time{}, false
	}
	return jwtNumericDateFloatToTime(seconds)
}

func jwtNumericDateFloatToTime(seconds float64) (time.Time, bool) {
	if math.IsNaN(seconds) || math.IsInf(seconds, 0) || seconds <= 0 || seconds > 253402300799 {
		return time.Time{}, false
	}
	wholeSeconds, fractionalSeconds := math.Modf(seconds)
	return time.Unix(int64(wholeSeconds), int64(fractionalSeconds*float64(time.Second))).UTC(), true
}

func jwtUnixSecondsToTime(seconds int64) (time.Time, bool) {
	if seconds <= 0 || seconds > 253402300799 {
		return time.Time{}, false
	}
	return time.Unix(seconds, 0).UTC(), true
}

func splitJWTAccountRealm(account string) (string, string) {
	account = strings.TrimSpace(account)
	if account == "" {
		return "", ""
	}
	atIndex := strings.LastIndex(account, "@")
	if atIndex < 0 || atIndex == len(account)-1 {
		return account, ""
	}
	return account[:atIndex], account[atIndex+1:]
}
