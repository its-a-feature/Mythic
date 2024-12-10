package mythicCrypto

import (
	"bytes"
	"crypto/aes"
	"crypto/cipher"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"errors"
	"io"

	"github.com/its-a-feature/Mythic/logging"
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

// many crypto pieces pulled from https://gist.github.com/huyinghuan/7bf174017bf54efb91ece04a48589b22
func EncryptAES256HMAC(key []byte, message *[]byte) (*[]byte, error) {
	if len(key) == 0 {
		// if there's no key, just return the message
		return message, nil
	}

	//logging.LogTrace("EncryptAES256HMAC", "dataToEncrypt", message, "key", hex.EncodeString(key))
	cipherText, err := EncryptAES256(key, message)
	if err != nil {
		return nil, err
	}
	//logging.LogTrace("EncryptAES256HMAC", "encrypted", cipherText)
	mac := hmac.New(sha256.New, key)
	_, err = mac.Write(*cipherText)
	if err != nil {
		return nil, err
	}
	newMac := mac.Sum(nil)
	//logging.LogTrace("EncryptAES256HMAC", "hmac", newMac)
	newData := append(*cipherText, newMac...)
	return &newData, nil
}

func EncryptAES256(key []byte, message *[]byte) (*[]byte, error) {
	if len(key) == 0 {
		return message, nil
	}
	block, err := aes.NewCipher(key)
	if err != nil {
		logging.LogError(err, "Failed to use key as aeskey")
		return nil, err
	}

	iv := make([]byte, aes.BlockSize)
	_, err = io.ReadFull(rand.Reader, iv)
	if err != nil {
		logging.LogError(err, "Failed to generate IV for aes encryption")
		return nil, err
	}
	cbc := cipher.NewCBCEncrypter(block, iv)
	messagePad, err := pkcs7Pad(*message, aes.BlockSize)
	if err != nil {
		logging.LogError(err, "Failed to pad message for aes block size when encrypting")
		return nil, err
	}
	cbc.CryptBlocks(messagePad, messagePad)
	encryptedByptes := append(iv, messagePad...) // IV + Ciphertext
	return &encryptedByptes, nil
}

func DecryptAES256HMAC(key []byte, message *[]byte) (*[]byte, error) {
	if len(key) == 0 {
		return message, nil
	}
	messageLen := len(*message)
	if messageLen < aes.BlockSize+32 {
		err := errors.New("Message improperly formatted - not long enough")
		logging.LogError(err, "Failed to decrypt message")
		return nil, err
	}
	iv := (*message)[:aes.BlockSize]             // gets IV, bytes 0 - 16
	cipherHMAC := (*message)[(messageLen - 32):] // gets the hmac, the last 32 bytes of the array
	cipherText := (*message)[aes.BlockSize:(messageLen - 32)]
	cipherTextAndIV := (*message)[:(messageLen - 32)]
	//logging.LogTrace("DecryptAES256HMAC", "dataToDecrypt", hex.EncodeToString(cipherText), "cipherHMAC", hex.EncodeToString(cipherHMAC), "key", hex.EncodeToString(key))
	if len(cipherText) < aes.BlockSize {
		logging.LogError(nil, "Message too short for aes block size")
		return nil, errors.New("Message too short for aes block size")
	} else if validHMAC(cipherTextAndIV, cipherHMAC, key) {
		//logging.LogTrace("DecryptAES256HMAC", "dataToDecrypt", hex.EncodeToString(cipherText), "cipherHMAC", hex.EncodeToString(cipherHMAC), "key", hex.EncodeToString(key))
		return DecryptAES256(key, iv, &cipherText)
	} else {
		err := errors.New("Failed to validate HMAC")
		logging.LogError(err, "Failed to decrypt message")
		return nil, err
	}
}

func validHMAC(cipherText []byte, cipherHMAC []byte, key []byte) bool {
	mac := hmac.New(sha256.New, key)
	mac.Write(cipherText)
	expectedMAC := mac.Sum(nil)
	//logging.LogDebug("checking HMAC", "given", hex.EncodeToString(cipherHMAC), "calculated", hex.EncodeToString(expectedMAC))
	return hmac.Equal(cipherHMAC, expectedMAC)
}

func DecryptAES256(key []byte, iv []byte, message *[]byte) (*[]byte, error) {
	if len(key) == 0 {
		return message, nil
	}
	if block, err := aes.NewCipher(key); err != nil {
		logging.LogError(err, "Failed to use aes key for decryption")
		return nil, err
	} else if len(*message)%aes.BlockSize != 0 {
		logging.LogError(nil, "ciphertext not a muiltiple of the block size")
		return nil, errors.New("Ciphertext is not a multiple of aes block size")
	} else {
		mode := cipher.NewCBCDecrypter(block, iv)
		mode.CryptBlocks(*message, *message)
		data, err := pkcs7Unpad(*message, aes.BlockSize)
		if err != nil {
			logging.LogError(err, "ciphertext padding isn't pkcs7")
			return nil, err
		} else {
			return &data, nil
		}
	}

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
