package authorization

import (
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"encoding/hex"
)

const APITokenValuePrefix = "mtk_"
const APITokenValueHashPrefix = "sha256:"

func HashAPITokenValue(token string) string {
	sum := sha256.Sum256([]byte(token))
	return APITokenValueHashPrefix + hex.EncodeToString(sum[:])
}

func GenerateOpaqueAPIToken() (string, string, error) {
	// Complete the credential before inserting its hash; plaintext and partially
	// initialized token values must never reach persistent storage.
	var random [48]byte
	if _, err := rand.Read(random[:]); err != nil {
		return "", "", err
	}
	value := APITokenValuePrefix + base64.RawURLEncoding.EncodeToString(random[:])
	return value, HashAPITokenValue(value), nil
}
