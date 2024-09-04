package internal

import (
	"archive/tar"
	"bytes"
	"crypto/ecdsa"
	"crypto/elliptic"
	"crypto/rand"
	"crypto/x509"
	"crypto/x509/pkix"
	"encoding/pem"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"io"
	"log"
	"math/big"
	"os"
	"path/filepath"
	"strings"
	"time"
)

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
	if !utils.DirExists(filepath.Join(utils.GetCwdFromExe(), "nginx-docker", "ssl")) {
		err := os.MkdirAll(filepath.Join(utils.GetCwdFromExe(), "nginx-docker", "ssl"), os.ModePerm)
		if err != nil {
			log.Printf("[-] Failed to make ssl folder in nginx-docker folder\n")
			return err
		}
		log.Printf("[+] Successfully made ssl folder in nginx-docker folder\n")
	}
	certPath := filepath.Join(utils.GetCwdFromExe(), "nginx-docker", "ssl", "mythic-cert.crt")
	keyPath := filepath.Join(utils.GetCwdFromExe(), "nginx-docker", "ssl", "mythic-ssl.key")
	if checkCerts(certPath, keyPath) == nil {
		return nil
	}
	log.Printf("[*] Failed to find SSL certs for Nginx container, generating now...\n")
	priv, err := ecdsa.GenerateKey(elliptic.P384(), rand.Reader)
	if err != nil {
		log.Printf("[-] failed to generate private key: %s\n", err)
		return err
	}
	notBefore := time.Now()
	oneYear := 365 * 24 * time.Hour
	notAfter := notBefore.Add(oneYear)
	serialNumberLimit := new(big.Int).Lsh(big.NewInt(1), 128)
	serialNumber, err := rand.Int(rand.Reader, serialNumberLimit)
	if err != nil {
		log.Printf("[-] failed to generate serial number: %s\n", err)
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
		log.Printf("[-] Failed to create certificate: %s\n", err)
		return err
	}
	certOut, err := os.Create(certPath)
	if err != nil {
		log.Printf("[-] failed to open "+certPath+" for writing: %s\n", err)
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
		log.Printf("[-] Unable to marshal ECDSA private key: %v\n", err)
		return err
	}
	pem.Encode(keyOut, &pem.Block{Type: "EC PRIVATE KEY", Bytes: marshalKey})
	keyOut.Close()
	log.Printf("[+] Successfully generated new SSL certs\n")
	return nil
}

// generate allow/block lists for nginx from environment variables
func updateNginxBlockLists() {
	ipString := config.GetMythicEnv().GetString("allowed_ip_blocks")
	ipList := strings.Split(ipString, ",")
	outputString := ""
	for _, ip := range ipList {
		outputString += fmt.Sprintf("allow %s;\n", ip)
	}
	outputString += "deny all;"
	if !config.GetMythicEnv().GetBool("nginx_use_volume") {
		ipFilePath := filepath.Join(utils.GetCwdFromExe(), "nginx-docker", "config", "blockips.conf")
		if err := os.WriteFile(ipFilePath, []byte(outputString), 0600); err != nil {
			log.Fatalf("[-] Failed to write out block list file: %v\n", err)
		}
	} else {
		err := moveStringToVolume("mythic_nginx", "mythic_nginx_volume_config", "blockips.conf", "blockips.conf", outputString)
		if err != nil {
			log.Fatalf("[-] Failed to write out block list file: %v\n", err)
		}
	}

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
		absSourcePath, err := filepath.Abs(sourceName)
		if err != nil {
			log.Printf("[-] Failed to get absolute path of folder to copy over. Resulting directory structure might be weird\n")
			return nil, err
		}
		// absSourcePath is the parent directory to copy over now
		// ex: say to move over apfell/ so we'll get a folder called apfell on the target volume
		absSourcePath = filepath.Dir(absSourcePath)
		err = filepath.Walk(sourceName, func(file string, fi os.FileInfo, err error) error {
			// generate tar header
			header, err := tar.FileInfoHeader(fi, file)
			if err != nil {
				return err
			}
			header.Name = strings.ReplaceAll(file, absSourcePath, "")
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
func moveFileToVolume(containerName string, volumeName string, destinationName string, sourceName string) error {
	DockerCopyIntoVolume(containerName, sourceName, destinationName, volumeName)
	return nil
}
func moveStringToVolume(containerName string, volumeName string, destinationName string, sourceName string, content string) error {
	file, err := os.CreateTemp("", "*")
	if err != nil {
		log.Printf("[-] failed to create temp file for moving a string into a container: %v", err)
		return err
	}
	file.WriteString(content)
	file.Sync()
	DockerCopyIntoVolume(containerName, file.Name(), destinationName, volumeName)
	return nil
}
