package internal

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"log"
)

func DatabaseReset() {
	confirm := config.AskConfirm("Are you sure you want to reset the database? ")
	if confirm {
		confirm = config.AskConfirm("Are you absolutely sure? This will delete ALL data with your database forever. ")
		if confirm {
			log.Printf("[*] Stopping Mythic\n")
			manager.GetManager().StopServices([]string{}, config.GetMythicEnv().GetBool("REBUILD_ON_START"))
			manager.GetManager().ResetDatabase(config.GetMythicEnv().GetBool("postgres_bind_local_mount"))
			log.Printf("[*] Removing database files\n")
		}
	}

}
