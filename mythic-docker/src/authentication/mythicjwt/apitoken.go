package mythicjwt

import (
	"crypto/sha256"
	"encoding/hex"
	"fmt"
)

const (
	APITokenValueHashPrefix = "sha256:"
	APITokenValuePrefix     = "mtk_"
)

func HashAPITokenValue(token string) string {
	sum := sha256.Sum256([]byte(token))
	return APITokenValueHashPrefix + hex.EncodeToString(sum[:])
}

func GenerateOpaqueAPIToken() (string, string, error) {
	randomValue, err := generateRandomPassword(64)
	if err != nil {
		return "", "", err
	}
	plainValue := fmt.Sprintf("%s%s", APITokenValuePrefix, randomValue)
	return plainValue, HashAPITokenValue(plainValue), nil
}
