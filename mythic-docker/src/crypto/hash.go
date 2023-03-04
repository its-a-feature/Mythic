package mythicCrypto

import (
	"crypto/md5"
	"crypto/sha1"
	"crypto/sha512"
	"fmt"
)

func HashSha512(data []byte) [64]byte {
	return sha512.Sum512(data)
}

func HashMD5(data []byte) string {
	return fmt.Sprintf("%x", md5.Sum(data))
}

func HashSha1(data []byte) string {
	return fmt.Sprintf("%x", sha1.Sum(data))
}
