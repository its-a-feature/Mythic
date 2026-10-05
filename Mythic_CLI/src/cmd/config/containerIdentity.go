package config

import (
	"crypto/hmac"
	"crypto/sha256"
	"encoding/hex"
	"fmt"
	"strings"
)

func CanonicalContainerPrincipal(service string) string {
	principal := strings.ToLower(strings.TrimSpace(service))
	if principal == "" || len(principal) > 128 {
		return ""
	}
	for index, character := range principal {
		if character >= 'a' && character <= 'z' || character >= '0' && character <= '9' {
			continue
		}
		if index > 0 && (character == '-' || character == '_' || character == '.') {
			continue
		}
		return ""
	}
	return principal
}

func ValidateContainerPrincipal(service, serverUser string) (string, error) {
	principal := CanonicalContainerPrincipal(service)
	if principal == "" {
		return "", fmt.Errorf("service name %q cannot be represented as a secure container principal", service)
	}
	if principal == CanonicalContainerPrincipal(serverUser) || principal == "guest" || principal == "mythic_user" {
		return "", fmt.Errorf("service name %q resolves to reserved RabbitMQ identity %q", service, principal)
	}
	return principal, nil
}

func DeriveContainerIdentityToken(masterSecret, service string) string {
	principal := CanonicalContainerPrincipal(service)
	mac := hmac.New(sha256.New, []byte(masterSecret))
	mac.Write([]byte("mythic-container-principal:v1:"))
	mac.Write([]byte(principal))
	return hex.EncodeToString(mac.Sum(nil))
}

func DeriveContainerBrokerPassword(masterSecret, service string) string {
	principal := CanonicalContainerPrincipal(service)
	mac := hmac.New(sha256.New, []byte(masterSecret))
	mac.Write([]byte("mythic-container-broker:v1:"))
	mac.Write([]byte(principal))
	return hex.EncodeToString(mac.Sum(nil))
}
