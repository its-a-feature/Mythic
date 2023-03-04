package mythicCrypto

import (
	"crypto/rand"
	"errors"

	"github.com/its-a-feature/Mythic/logging"
)

type CryptoKeys struct {
	EncKey   *[]byte `json:"enc_key,omitempty"`
	DecKey   *[]byte `json:"dec_key,omitempty"`
	Value    string  `json:"value"`
	Location string  `json:"location,omitempty"`
}

func GenerateKeysForPayload(cryptoType string) (CryptoKeys, error) {
	switch cryptoType {
	case "aes256_hmac":
		bytes := make([]byte, 32)
		if _, err := rand.Read(bytes); err != nil {
			logging.LogError(err, "Failed to generate new random 32 bytes for aes256 key")
			return CryptoKeys{
				EncKey: nil,
				DecKey: nil,
				Value:  cryptoType,
			}, err
		}
		return CryptoKeys{
			EncKey: &bytes,
			DecKey: &bytes,
			Value:  cryptoType,
		}, nil
	case "none":
		return CryptoKeys{
			EncKey: nil,
			DecKey: nil,
			Value:  cryptoType,
		}, nil
	default:
		return CryptoKeys{
			EncKey: nil,
			DecKey: nil,
			Value:  cryptoType,
		}, errors.New("Unknown crypto type")
	}
}
