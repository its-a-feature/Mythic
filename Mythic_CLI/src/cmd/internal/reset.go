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
	if mythicEnv.GetBool("postgres_bind_local_mount") {
		err := os.RemoveAll(filepath.Join(workingPath, "postgres-docker", "database"))
		if err != nil {
			fmt.Printf("[-] Failed to remove database files\n%v\n", err)
		} else {
			fmt.Printf("[+] Successfully reset datbase files\n")
		}
	} else {
		DockerRemoveContainers([]string{"mythic_postgres"})
		err := DockerRemoveVolume("mythic_postgres_volume")
		if err != nil {
			fmt.Printf("[-] Failed to remove database:\n%v\n", err)
		}
	}

}
func RabbitmqReset(explicitCall bool) {
	if explicitCall {
		fmt.Printf("[*] Stopping Mythic\n")
		DockerStop([]string{})
		fmt.Printf("[*] Removing rabbitmq files\n")
	}
	if mythicEnv.GetBool("rabbitmq_bind_local_mount") {
		workingPath := getCwdFromExe()
		err := os.RemoveAll(filepath.Join(workingPath, "rabbitmq-docker", "storage"))
		if err != nil {
			log.Fatalf("[-] Failed to reset rabbitmq files: %v\n", err)
		} else {
			if explicitCall {
				fmt.Printf("[+] Successfully reset rabbitmq files\n")
			}
		}
	} else {
		DockerRemoveContainers([]string{"mythic_rabbitmq"})
		err := DockerRemoveVolume("mythic_rabbitmq_volume")
		if err != nil {
			fmt.Printf("[-] Failed to remove rabbitmq files:\n%v\n", err)
		}
	}
}
