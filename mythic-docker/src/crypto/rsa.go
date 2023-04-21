package mythicCrypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/pem"
	"errors"
	"fmt"

	"github.com/its-a-feature/Mythic/logging"
)

func GenerateRSAKeyPair() ([]byte, *rsa.PrivateKey, error) {
	if serverPrivKey, err := rsa.GenerateKey(rand.Reader, 4096); err != nil {
		logging.LogError(err, "Failed to generate a new RSA keypair")
		errorString := fmt.Sprintf("Failed to generate a new RSA keypair: %s", err.Error())
		return nil, nil, errors.New(errorString)
	} else {
		serverPubKey := &serverPrivKey.PublicKey
		pubASN1 := x509.MarshalPKCS1PublicKey(serverPubKey)
		pubPem := pem.EncodeToMemory(
			&pem.Block{
				Type:  "RSA PUBLIC KEY",
				Bytes: pubASN1,
			},
		)
		return pubPem, serverPrivKey, nil
	}
}

func RsaDecryptCipherBytes(encryptedData []byte, privateKey *rsa.PrivateKey) ([]byte, error) {
	hash := sha1.New()
	if decryptedData, err := rsa.DecryptOAEP(hash, rand.Reader, privateKey, encryptedData, nil); err != nil {
		logging.LogError(err, "Failed to decrypt with RSA private key")
		stringErr := errors.New(fmt.Sprintf("Failed to decrypt with RSA private key: %s", err.Error()))
		return nil, stringErr
	} else {
		return decryptedData, nil
	}
}

func RsaEncryptBytes(plainBytes []byte, publicKey []byte) ([]byte, error) {
	hash := sha1.New()
	//logging.LogInfo("about to parse public key in RsaEncryptBytes", "public key", publicKey)
	if pkcs1RSAPublicKey, _ := pem.Decode(publicKey); pkcs1RSAPublicKey == nil {
		logging.LogError(nil, "Failed to find PEM encoded public key")
		return nil, errors.New("Failed to find PEM encoded public key")
	} else {
		var pubKey *rsa.PublicKey
		var err error
		if pubKey, err = x509.ParsePKCS1PublicKey(pkcs1RSAPublicKey.Bytes); err != nil {
			if pubAny, err := x509.ParsePKIXPublicKey(pkcs1RSAPublicKey.Bytes); err != nil {
				logging.LogError(err, "Failed to parse public key to encrypt with RSA")
				errorString := fmt.Sprintf("Failed to parse public key to encrypt with RSA: %s", err.Error())
				return nil, errors.New(errorString)
			} else {
				pubKey = pubAny.(*rsa.PublicKey)
			}
		}
		if encryptedData, err := rsa.EncryptOAEP(hash, rand.Reader, pubKey, plainBytes, nil); err != nil {
			logging.LogError(err, "Failed to encrypt with RSA key")
			errorString := fmt.Sprintf("Failed to encrypt with RSA key: %s", err.Error())
			return nil, errors.New(errorString)
		} else {
			return encryptedData, nil
		}
	}
}
