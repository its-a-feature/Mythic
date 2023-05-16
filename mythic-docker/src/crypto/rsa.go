package mythicCrypto

import (
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/x509"
	"encoding/pem"
	"fmt"
)

func GenerateRSAKeyPair() ([]byte, *rsa.PrivateKey, error) {
	serverPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		return nil, nil, fmt.Errorf("failed to generate a new RSA keypair: %v", err)
	}

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

func RsaDecryptCipherBytes(encryptedData []byte, privateKey *rsa.PrivateKey) ([]byte, error) {
	hash := sha1.New()
	decryptedData, err := rsa.DecryptOAEP(hash, rand.Reader, privateKey, encryptedData, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to decrypt with RSA private key: %v", err)
	}

	return decryptedData, nil
}

func RsaEncryptBytes(plainBytes []byte, publicKey []byte) ([]byte, error) {
	hash := sha1.New()
	//logging.LogInfo("about to parse public key in RsaEncryptBytes", "public key", publicKey)
	pkcs1RSAPublicKey, _ := pem.Decode(publicKey)
	if pkcs1RSAPublicKey == nil {
		return nil, fmt.Errorf("failed to find PEM encoded public key")
	}

	pubKey, err := x509.ParsePKCS1PublicKey(pkcs1RSAPublicKey.Bytes)
	if err != nil {
		// Fallback to parsing PKIX instead of PKCS1
		pubAny, err := x509.ParsePKIXPublicKey(pkcs1RSAPublicKey.Bytes)
		if err != nil {
			return nil, fmt.Errorf("failed to parse public key to encrypt with RSA: %v", err)
		}
		pubKey = pubAny.(*rsa.PublicKey)
	}

	encryptedData, err := rsa.EncryptOAEP(hash, rand.Reader, pubKey, plainBytes, nil)
	if err != nil {
		return nil, fmt.Errorf("failed to encrypt with RSA key: %v", err)
	}

	return encryptedData, nil
}
