package utils

import (
	"crypto/rand"
	"fmt"
	"io"
	"io/ioutil"
	"log"
	"math/big"
	"os"
	"path"
	"path/filepath"
	"slices"
	"strings"
)

func GenerateRandomPassword(pwLength int) string {
	chars := []rune("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789")
	var b strings.Builder
	for i := 0; i < pwLength; i++ {
		nBig, err := rand.Int(rand.Reader, big.NewInt(int64(len(chars))))
		if err != nil {
			log.Fatalf("[-] Failed to generate random number for password generation\n")
		}
		b.WriteRune(chars[nBig.Int64()])
	}
	return b.String()
}
func GetCwdFromExe() string {
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get path to current executable\n")
	}
	return filepath.Dir(exe)
}
func StringInSlice(value string, list []string) bool {
	for _, e := range list {
		if e == value {
			return true
		}
	}
	return false
}
func RemoveStringFromSliceNoOrder(source []string, str string) []string {

	for index, value := range source {
		if str == value {
			source[index] = source[len(source)-1]
			source[len(source)-1] = ""
			source = source[:len(source)-1]
			return source
		}
	}
	// we didn't find the element to remove
	return source
}
func UpdateEnvironmentVariables(originalList []interface{}, updates []string) []string {
	var finalList []string
	for _, entry := range originalList {
		entryPieces := strings.Split(entry.(string), "=")
		found := false
		for _, update := range updates {
			updatePieces := strings.Split(update, "=")
			if updatePieces[0] == entryPieces[0] {
				// the current env vars has a key that we want to update, so don't include the old version
				found = true
			}
		}
		if !found {
			if !slices.Contains(finalList, entry.(string)) {
				finalList = append(finalList, entry.(string))
			}

		}
	}
	for _, update := range updates {
		if !slices.Contains(finalList, update) {
			finalList = append(finalList, update)
		}
	}
	return finalList
}
func ByteCountSI(b int64) string {
	const unit = 1000
	if b < unit {
		return fmt.Sprintf("%d B", b)
	}
	div, exp := int64(unit), 0
	for n := b / unit; n >= unit; n /= unit {
		div *= unit
		exp++
	}
	return fmt.Sprintf("%.1f %cB",
		float64(b)/float64(div), "kMGTPE"[exp])
}

// https://golangcode.com/check-if-a-file-exists/
func FileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return !info.IsDir()
}

// https://golangcode.com/check-if-a-file-exists/
func DirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return info.IsDir()
}

// https://blog.depa.do/post/copy-files-and-directories-in-go
func CopyFile(src, dst string) error {
	var err error
	var srcfd *os.File
	var dstfd *os.File
	var srcinfo os.FileInfo

	if srcfd, err = os.Open(src); err != nil {
		return err
	}
	defer srcfd.Close()

	if dstfd, err = os.Create(dst); err != nil {
		return err
	}
	defer dstfd.Close()

	if _, err = io.Copy(dstfd, srcfd); err != nil {
		return err
	}
	if srcinfo, err = os.Stat(src); err != nil {
		return err
	}
	return os.Chmod(dst, srcinfo.Mode())
}

// https://blog.depa.do/post/copy-files-and-directories-in-go
func CopyDir(src string, dst string) error {
	var err error
	var fds []os.FileInfo
	var srcinfo os.FileInfo

	if srcinfo, err = os.Stat(src); err != nil {
		return err
	}

	if err = os.MkdirAll(dst, srcinfo.Mode()); err != nil {
		return err
	}

	if fds, err = ioutil.ReadDir(src); err != nil {
		return err
	}
	for _, fd := range fds {
		srcfp := path.Join(src, fd.Name())
		dstfp := path.Join(dst, fd.Name())

		if fd.IsDir() {
			if err = CopyDir(srcfp, dstfp); err != nil {
				fmt.Println(err)
			}
		} else {
			if err = CopyFile(srcfp, dstfp); err != nil {
				fmt.Println(err)
			}
		}
	}
	return nil
}
