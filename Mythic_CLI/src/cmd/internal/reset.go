package internal

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"log"
)

func DatabaseReset(force bool) {
	if force {
		log.Printf("[*] Stopping Mythic\n")
		manager.GetManager().StopServices([]string{}, config.GetMythicEnv().GetBool("REBUILD_ON_START"), false)
		log.Printf("[*] Removing database files\n")
		manager.GetManager().ResetDatabase(config.GetMythicEnv().GetBool("postgres_use_volume"))
		return
	}
	confirm := config.AskConfirm("Are you sure you want to reset the database? ")
	if confirm {
		confirm = config.AskConfirm("Are you absolutely sure? This will delete ALL data with your database forever. ")
		if confirm {
			log.Printf("[*] Stopping Mythic\n")
			manager.GetManager().StopServices([]string{}, config.GetMythicEnv().GetBool("REBUILD_ON_START"), false)
			log.Printf("[*] Removing database files\n")
			manager.GetManager().ResetDatabase(config.GetMythicEnv().GetBool("postgres_use_volume"))
		}
	}
}
func RabbitmqReset(force bool, startAgain bool) {
	if force {
		manager.GetManager().StopServices([]string{"mythic_rabbitmq"}, config.GetMythicEnv().GetBool("REBUILD_ON_START"), false)
		log.Printf("[*] Removing rabbitmq storage files\n")
		manager.GetManager().ResetRabbitmq(config.GetMythicEnv().GetBool("rabbitmq_use_volume"))
		if startAgain {
			manager.GetManager().StartServices([]string{"mythic_rabbitmq"}, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
		}
		return
	}
	confirm := config.AskConfirm("Are you sure you want to reset the rabbitmq storage? ")
	if confirm {
		manager.GetManager().StopServices([]string{"mythic_rabbitmq"}, config.GetMythicEnv().GetBool("REBUILD_ON_START"), false)
		log.Printf("[*] Removing rabbitmq storage files\n")
		manager.GetManager().ResetRabbitmq(config.GetMythicEnv().GetBool("rabbitmq_use_volume"))
		if startAgain {
			manager.GetManager().StartServices([]string{"mythic_rabbitmq"}, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
		}
	}
}

func DatabaseBackup(backupPath string) {
	confirm := config.AskConfirm("Are you sure you want to backup the database? ")
	if confirm {
		err := manager.GetManager().BackupDatabase(backupPath, config.GetMythicEnv().GetBool("postgres_use_volume"))
		if err != nil {
			log.Fatalf("[-] Failed to backup database: %v\n", err)
		}
	}
}
func DatabaseRestore(backupPath string) {
	confirm := config.AskConfirm("Are you sure you want to restore the database and delete your existing database? ")
	if confirm {
		confirm = config.AskConfirm("Aare you absolutely sure? This will delete ALL data with your existing database forever.")
		if confirm {
			err := manager.GetManager().RestoreDatabase(backupPath, config.GetMythicEnv().GetBool("postgres_use_volume"))
			if err != nil {
				log.Fatalf("[-] Failed to restore database: %v\n", err)
			} else {
				manager.GetManager().StopServices([]string{"mythic_postgres"}, false, true)
				manager.GetManager().StartServices([]string{"mythic_postgres"}, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
			}
		}
	}
}
func FilesBackup(backupPath string) {
	confirm := config.AskConfirm("Are you sure you want to backup the files? ")
	if confirm {
		err := manager.GetManager().BackupFiles(backupPath, config.GetMythicEnv().GetBool("mythic_server_use_volume"))
		if err != nil {
			log.Fatalf("[-] Failed to backup Mythic's files: %v\n", err)
		}
	}
}
func FilesRestore(backupPath string) {
	confirm := config.AskConfirm("Are you sure you want to restore the files and delete your existing files? ")
	if confirm {
		confirm = config.AskConfirm("Aare you absolutely sure? This will delete ALL data with your existing uploads/downloads forever.")
		if confirm {
			err := manager.GetManager().RestoreFiles(backupPath, config.GetMythicEnv().GetBool("mythic_server_use_volume"))
			if err != nil {
				log.Fatalf("[-] Failed to restore files: %v\n", err)
			} else {
				manager.GetManager().StopServices([]string{"mythic_server"}, false, true)
				manager.GetManager().StartServices([]string{"mythic_server"}, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
			}
		}
	}
}
