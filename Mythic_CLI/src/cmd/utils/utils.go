package utils

import (
	"crypto/rand"
	"errors"
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

// EnsureFileExists creates an empty file if it does not already exist. The
// exclusive create prevents a concurrent caller from truncating a file that
// another process created after checking for it.
func EnsureFileExists(filename string, perm os.FileMode) error {
	f, err := os.OpenFile(filename, os.O_WRONLY|os.O_CREATE|os.O_EXCL, perm)
	if errors.Is(err, os.ErrExist) {
		return nil
	}
	if err != nil {
		return err
	}
	return f.Close()
}

// AtomicWriteFile writes data to a temporary file in the destination directory
// and atomically replaces filename only after the complete contents have been
// written and synced. Concurrent writers may replace one another, but readers
// will only observe a complete version from one writer.
func AtomicWriteFile(filename string, data []byte, perm os.FileMode) (retErr error) {
	if info, err := os.Stat(filename); err == nil {
		perm = info.Mode().Perm()
	} else if !errors.Is(err, os.ErrNotExist) {
		return err
	}

	tempFile, err := os.CreateTemp(filepath.Dir(filename), "."+filepath.Base(filename)+".tmp-*")
	if err != nil {
		return err
	}
	tempName := tempFile.Name()
	tempClosed := false
	defer func() {
		if !tempClosed {
			if err := tempFile.Close(); retErr == nil {
				retErr = err
			}
		}
		if err := os.Remove(tempName); err != nil && !errors.Is(err, os.ErrNotExist) && retErr == nil {
			retErr = err
		}
	}()

	if err := tempFile.Chmod(perm); err != nil {
		return err
	}
	if written, err := tempFile.Write(data); err != nil {
		return err
	} else if written != len(data) {
		return io.ErrShortWrite
	}
	if err := tempFile.Sync(); err != nil {
		return err
	}
	if err := tempFile.Close(); err != nil {
		return err
	}
	tempClosed = true

	return os.Rename(tempName, filename)
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
