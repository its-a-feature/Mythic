package internal

import (
	"archive/tar"
	"bufio"
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"golang.org/x/mod/semver"
	"io"
	"io/ioutil"
	"log"
	"math/big"
	"os"
	"path"
	"path/filepath"
	"strings"
	"time"
)

func generateRandomPassword(pwLength int) string {
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
func getCwdFromExe() string {
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get path to current executable\n")
	}
	return filepath.Dir(exe)
}
func stringInSlice(value string, list []string) bool {
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

// https://golangcode.com/check-if-a-file-exists/
func fileExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return !info.IsDir()
}

// https://golangcode.com/check-if-a-file-exists/
func dirExists(path string) bool {
	info, err := os.Stat(path)
	if err != nil {
		if os.IsNotExist(err) {
			return false
		}
	}
	return info.IsDir()
}

// https://blog.depa.do/post/copy-files-and-directories-in-go
func copyFile(src, dst string) error {
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
func copyDir(src string, dst string) error {
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
			if err = copyDir(srcfp, dstfp); err != nil {
				fmt.Println(err)
			}
		} else {
			if err = copyFile(srcfp, dstfp); err != nil {
				fmt.Println(err)
			}
		}
	}
	return nil
}

// https://gist.github.com/r0l1/3dcbb0c8f6cfe9c66ab8008f55f8f28b
func askConfirm(prompt string) bool {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("%s [y/n]: ", prompt)
		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf("[-] Failed to read user input\n")
			return false
		}
		input = strings.ToLower(strings.TrimSpace(input))
		if input == "y" || input == "yes" {
			return true
		} else if input == "n" || input == "no" {
			return false
		}
	}
}

// https://gist.github.com/r0l1/3dcbb0c8f6cfe9c66ab8008f55f8f28b
func askVariable(prompt string) string {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("%s: ", prompt)
		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf("[-] Failed to read user input\n")
			return ""
		}
		input = strings.TrimSpace(input)
		return input
	}
}

// code to generate self-signed certs pulled from github.com/kabukky/httpscerts
// and from http://golang.org/src/crypto/tls/generate_cert.go.
// only modifications were to use a specific elliptic curve cipher
func checkCerts(certPath string, keyPath string) error {
	if _, err := os.Stat(certPath); os.IsNotExist(err) {
		return err
	} else if _, err := os.Stat(keyPath); os.IsNotExist(err) {
		return err
	}
	return nil
}
func generateCerts() error {
	if !dirExists(filepath.Join(getCwdFromExe(), "nginx-docker", "ssl")) {
		err := os.MkdirAll(filepath.Join(getCwdFromExe(), "nginx-docker", "ssl"), os.ModePerm)
		if err != nil {
			fmt.Printf("[-] Failed to make ssl folder in nginx-docker folder\n")
			return err
		}
		fmt.Printf("[+] Successfully made ssl folder in nginx-docker folder\n")
	}
	certPath := filepath.Join(getCwdFromExe(), "nginx-docker", "ssl", "mythic-cert.crt")
	keyPath := filepath.Join(getCwdFromExe(), "nginx-docker", "ssl", "mythic-ssl.key")
	if checkCerts(certPath, keyPath) == nil {
		return nil
	}
	fmt.Printf("[*] Failed to find SSL certs for Nginx container, generating now...\n")
	priv, err := ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	if err != nil {
		fmt.Printf("[-] failed to generate private key: %s\n", err)
		return err
	}
	notBefore := time.Now()
	oneYear := 365 * 24 * time.Hour
	notAfter := notBefore.Add(oneYear)
	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		fmt.Printf("[-] failed to generate serial number: %s\n", err)
		return err
	}
	template := x509.Certificate{
		SerialNumber: serialNumber,
		Subject: pkix.Name{
			Organization: []string{"Mythic"},
		},
		NotBefore: notBefore,
		NotAfter:  notAfter,

		KeyUsage:              x509.KeyUsageKeyEncipherment | x509.KeyUsageDigitalSignature,
		ExtKeyUsage:           []x509.ExtKeyUsage{x509.ExtKeyUsageServerAuth},
		BasicConstraintsValid: true,
	}
	derBytes, err := x509.CreateCertificate(rand.Reader, &template, &template, &priv.PublicKey, priv)
	if err != nil {
		fmt.Printf("[-] Failed to create certificate: %s\n", err)
		return err
	}
	certOut, err := os.Create(certPath)
	if err != nil {
		fmt.Printf("[-] failed to open "+certPath+" for writing: %s\n", err)
		return err
	}
	pem.Encode(certOut, &pem.Block{Type: "CERTIFICATE", Bytes: derBytes})
	certOut.Close()
	keyOut, err := os.OpenFile(keyPath, os.O_WRONLY|os.O_CREATE|os.O_TRUNC, 0600)
	if err != nil {
		log.Print("failed to open "+keyPath+" for writing:", err)
		return err
	}
	marshalKey, err := x509.MarshalECPrivateKey(priv)
	if err != nil {
		fmt.Printf("[-] Unable to marshal ECDSA private key: %v\n", err)
		return err
	}
	pem.Encode(keyOut, &pem.Block{Type: "EC PRIVATE KEY", Bytes: marshalKey})
	keyOut.Close()
	fmt.Printf("[+] Successfully generated new SSL certs\n")
	return nil
}

// generate allow/block lists for nginx from environment variables
func updateNginxBlockLists() {
	ipString := mythicEnv.GetString("allowed_ip_blocks")
	ipList := strings.Split(ipString, ",")
	outputString := ""
	for _, ip := range ipList {
		outputString += fmt.Sprintf("allow %s;\n", ip)
	}
	outputString += "deny all;"
	if mythicEnv.GetBool("nginx_bind_local_mount") {
		ipFilePath := filepath.Join(getCwdFromExe(), "nginx-docker", "config", "blockips.conf")
		if err := os.WriteFile(ipFilePath, []byte(outputString), 0600); err != nil {
			fmt.Printf("[-] Failed to write out block list file: %v\n", err)
			os.Exit(1)
		}
	} else {
		err := moveStringToVolume("mythic_nginx_volume_config", ".", "blockips.conf", outputString)
		if err != nil {
			fmt.Printf("[-] Failed to write out block list file: %v\n", err)
			os.Exit(1)
		}
	}

}

// check docker version to make sure it's high enough for Mythic's features
func checkDockerVersion() bool {
	if outputString, err := runDocker([]string{"version", "--format", "{{.Server.Version}}"}); err != nil {
		fmt.Printf("[-] Failed to get docker version\n")
		return false
	} else if !semver.IsValid("v" + outputString) {
		fmt.Printf("[-] Invalid version string: %s\n", outputString)
		return false
	} else if semver.Compare("v"+outputString, "v20.10.22") >= 0 {
		return true
	} else {
		fmt.Printf("[-] Docker version is too old, %s, for Mythic. Please update\n", outputString)
		return false
	}
}

func generateSavedImageFolder() error {
	savedImagePath := filepath.Join(getCwdFromExe(), "saved_images")
	if dirExists(savedImagePath) {
		return nil
	} else {
		return os.MkdirAll(savedImagePath, 0755)
	}
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

func tarFileToBytes(sourceName string) (*bytes.Buffer, error) {
	source, err := os.Open(sourceName)
	if err != nil {
		return nil, err
	}
	sourceStats, err := source.Stat()
	if err != nil {
		return nil, err
	}
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	if sourceStats.IsDir() {
		// walk through every file in the folder
		err = filepath.Walk(sourceName, func(file string, fi os.FileInfo, err error) error {
			// generate tar header
			header, err := tar.FileInfoHeader(fi, file)
			if err != nil {
				return err
			}

			// must provide real name
			// (see https://golang.org/src/archive/tar/common.go?#L626)
			header.Name = filepath.ToSlash(file)
			// write header
			if err = tw.WriteHeader(header); err != nil {
				return err
			}
			// if not a dir, write file content
			if !fi.IsDir() {
				data, err := os.Open(file)
				if err != nil {
					return err
				}
				if _, err := io.Copy(tw, data); err != nil {
					return err
				}
			}
			return nil
		})
		return &buf, err
	} else {
		err = tw.WriteHeader(&tar.Header{
			Name: sourceName,         // filename
			Mode: 0777,               // permissions
			Size: sourceStats.Size(), // filesize
		})
		if err != nil {
			return nil, err
		}
		content, err := io.ReadAll(source)
		if err != nil {
			return nil, err
		}
		_, err = tw.Write(content)
		if err != nil {
			return nil, err
		}
		err = tw.Close()
		if err != nil {
			return nil, err
		}
		return &buf, nil
	}

}
func tarStringToBytes(sourceName string, data string) (*bytes.Buffer, error) {
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	err := tw.WriteHeader(&tar.Header{
		Name: sourceName,       // filename
		Mode: 0777,             // permissions
		Size: int64(len(data)), // filesize
	})
	if err != nil {
		return nil, err
	}
	_, err = tw.Write([]byte(data))
	if err != nil {
		return nil, err
	}
	err = tw.Close()
	if err != nil {
		return nil, err
	}
	return &buf, nil
}
func moveFileToVolume(volumeName string, destinationName string, sourceName string) error {
	contentBytes, err := tarFileToBytes(sourceName)
	if err != nil {
		return err
	}
	DockerCopyIntoVolume(contentBytes, destinationName, volumeName)
	return nil
}
func moveStringToVolume(volumeName string, destinationName string, sourceName string, content string) error {
	contentBytes, err := tarStringToBytes(sourceName, content)
	if err != nil {
		return err
	}
	DockerCopyIntoVolume(contentBytes, destinationName, volumeName)
	return nil
}
