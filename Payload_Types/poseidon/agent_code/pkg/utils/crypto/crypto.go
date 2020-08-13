package crypto

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/rsa"
	"crypto/sha1"
	"crypto/sha256"
	"crypto/x509"
	"encoding/hex"
	"encoding/pem"
	"errors"
	"io"
	"log"
)

// PKCS7 errors.
var (
	// ErrInvalidBlockSize indicates hash blocksize <= 0.
	ErrInvalidBlockSize = errors.New("invalid blocksize")

	// ErrInvalidPKCS7Data indicates bad input to PKCS7 pad or unpad.
	ErrInvalidPKCS7Data = errors.New("invalid PKCS7 data (empty or not padded)")

	// ErrInvalidPKCS7Padding indicates PKCS7 unpad fails to bad input.
	ErrInvalidPKCS7Padding = errors.New("invalid padding on input")
)

func GenerateRSAKeyPair() ([]byte, *rsa.PrivateKey) {
	serverPrivKey, err := rsa.GenerateKey(rand.Reader, 4096)
	if err != nil {
		log.Println(err.Error())
		return nil, nil
	}

	serverPubKey := &serverPrivKey.PublicKey

	//return both keys

	pubASN1 := x509.MarshalPKCS1PublicKey(serverPubKey)
	pubPem := pem.EncodeToMemory(
		&pem.Block{
			Type:  "RSA PUBLIC KEY",
			Bytes: pubASN1,
		},
	)

	return pubPem, serverPrivKey
}

func RsaDecryptCipherBytes(encryptedData []byte, privateKey *rsa.PrivateKey) []byte {
	//log.Println("In RsaDecryptCipherBytes")

	hash := sha1.New()
	//decryptedData, err := rsa.DecryptOAEP(hash, rand.Reader, privateKey, encryptedData, nil)
	//log.Println("Encrypted data size: ", len(encryptedData))

	decryptedData, err := rsa.DecryptOAEP(hash, rand.Reader, privateKey, encryptedData, nil)
	//decryptedData, err := rsa.DecryptPKCS1v15(rand.Reader, privateKey, encryptedData)
	if err != nil {
		//log.Println("Failed to decrypt data with: ", err.Error())
		return make([]byte, 0)
	}

	return decryptedData
}

func RsaEncryptBytes(plainBytes []byte, publicKey []byte) []byte {
	pubKey, err := x509.ParsePKCS1PublicKey(publicKey)
	if err != nil {
		//log.Println("Error encrypting bytes: ", err)
		return make([]byte, 0)
	}

	hash := sha1.New()
	encryptedData, _ := rsa.EncryptOAEP(hash, rand.Reader, pubKey, plainBytes, nil)
	if err != nil {
		//log.Println("Unable to encrypt ", decErr)
		return make([]byte, 0)
	}

	return encryptedData
}

// https://gist.github.com/mickelsonm/e1bf365a149f3fe59119

func AesEncrypt(key []byte, plainBytes []byte) []byte {
	block, err := aes.NewCipher(key)
	if err != nil {
		log.Println("Key error: ", err.Error())
		return make([]byte, 0)
	}

	iv := make([]byte, aes.BlockSize)
	if _, err = io.ReadFull(rand.Reader, iv); err != nil {
		log.Println(err.Error())
		return make([]byte, 0)
	}

	cbc := cipher.NewCBCEncrypter(block, iv)
	plainBytes, _ = pkcs7Pad(plainBytes, aes.BlockSize)
	encBytes := make([]byte, len(plainBytes))

	cbc.CryptBlocks(encBytes, plainBytes)
	encryptedByptes := append(iv, encBytes...)                   // IV + Ciphertext
	h := hmac.New(sha256.New, key)                               // New hmac with key
	h.Write(encryptedByptes)                                     // Write bytes to hmac
	hmacEncryptedBytes := append(encryptedByptes, h.Sum(nil)...) // IV + Ciphertext + hmac
	return hmacEncryptedBytes
}

//AesDecrypt - Decrypt AES encrypted data with the key
func AesDecrypt(key []byte, encryptedBytes []byte) []byte {
	// TODO: Change the return type to allow for returning error messages
	block, err := aes.NewCipher(key)
	if err != nil {
		log.Println("Key error: ", err)
		return make([]byte, 0)
	}

	if len(encryptedBytes) < aes.BlockSize {
		log.Println("Ciphertext too short")
		return make([]byte, 0)
	}

	iv := encryptedBytes[:aes.BlockSize]                    // gets IV, bytes 0 - 16
	hmacHash := encryptedBytes[(len(encryptedBytes) - 32):] // gets the hmac, the last 32 bytes of the array
	encryptedPortion := encryptedBytes[aes.BlockSize:(len(encryptedBytes) - 32)]
	h := hmac.New(sha256.New, key)
	h.Write(encryptedBytes[:(len(encryptedBytes) - 32)])
	verified := hmac.Equal(h.Sum(nil), hmacHash)
	if verified != true {
		gen := hex.EncodeToString(h.Sum(nil))
		received := hex.EncodeToString(hmacHash)
		log.Printf("HMAC verification failed\n Received HMAC: %s\n Generated HMAC: %s\n", received, gen)
		return make([]byte, 0)
	}

	if len(encryptedPortion)%aes.BlockSize != 0 {
		log.Println("ciphertext not a muiltiple of the block size")
		return make([]byte, 0)
	}
	mode := cipher.NewCBCDecrypter(block, iv)

	unEncryptedBytes := make([]byte, len(encryptedPortion))
	mode.CryptBlocks(unEncryptedBytes, encryptedPortion)
	data, err := pkcs7Unpad(unEncryptedBytes, aes.BlockSize)
	if err != nil {
		log.Printf("padding error: %s", err.Error())
		return make([]byte, 0)
	}
	return data

}

// pkcs7Pad right-pads the given byte slice with 1 to n bytes, where
// n is the block size. The size of the result is x times n, where x
// is at least 1.
func pkcs7Pad(b []byte, blocksize int) ([]byte, error) {
	if blocksize <= 0 {
		return nil, ErrInvalidBlockSize
	}
	if b == nil || len(b) == 0 {
		return nil, ErrInvalidPKCS7Data
	}
	n := blocksize - (len(b) % blocksize)
	pb := make([]byte, len(b)+n)
	copy(pb, b)
	copy(pb[len(b):], bytes.Repeat([]byte{byte(n)}, n))
	return pb, nil
}

// pkcs7Unpad validates and unpads data from the given bytes slice.
// The returned value will be 1 to n bytes smaller depending on the
// amount of padding, where n is the block size.
func pkcs7Unpad(b []byte, blocksize int) ([]byte, error) {
	if blocksize <= 0 {
		return nil, ErrInvalidBlockSize
	}
	if b == nil || len(b) == 0 {
		return nil, ErrInvalidPKCS7Data
	}
	if len(b)%blocksize != 0 {
		return nil, ErrInvalidPKCS7Padding
	}
	c := b[len(b)-1]
	n := int(c)
	if n == 0 || n > len(b) {
		return nil, ErrInvalidPKCS7Padding
	}
	for i := 0; i < n; i++ {
		if b[len(b)-n+i] != c {
			return nil, ErrInvalidPKCS7Padding
		}
	}
	return b[:len(b)-n], nil
}

func pKCS5Padding(ciphertext []byte, blockSize int) []byte {
	padding := blockSize - len(ciphertext)%blockSize
	padtext := bytes.Repeat([]byte{byte(padding)}, padding)
	return append(ciphertext, padtext...)
}

func pKCS5Trimming(encrypt []byte) []byte {
	padding := encrypt[len(encrypt)-1]
	return encrypt[:len(encrypt)-int(padding)]
}
