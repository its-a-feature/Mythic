package internal

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
)

func DatabaseReset() {
	fmt.Printf("[*] Stopping Mythic\n")
	DockerStop([]string{})
	workingPath := getCwdFromExe()
	fmt.Printf("[*] Removing database files\n")
	err := os.RemoveAll(filepath.Join(workingPath, "postgres-docker", "database"))
	if err != nil {
		fmt.Printf("[-] Failed to remove database files\n")
	} else {
		fmt.Printf("[+] Successfully reset datbase files\n")
	}
}
func RabbitmqReset(explicitCall bool) {
	if explicitCall {
		fmt.Printf("[*] Stopping Mythic\n")
		DockerStop([]string{})
		fmt.Printf("[*] Removing rabbitmq files\n")
	}
	workingPath := getCwdFromExe()
	err := os.RemoveAll(filepath.Join(workingPath, "rabbitmq-docker", "storage"))
	if err != nil {
		log.Fatalf("[-] Failed to reset rabbitmq files: %v\n", err)
	} else {
		if explicitCall {
			fmt.Printf("[+] Successfully reset rabbitmq files\n")
		}
	}
}
