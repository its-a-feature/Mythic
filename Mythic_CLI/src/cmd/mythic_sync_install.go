package cmd

import (
	"github.com/spf13/cobra"
	"log"
)

// installCmd represents the config command
var installMythicSyncCmd = &cobra.Command{
	Use:   "install",
	Short: "install mythic_sync from GitHub or other Git-based repositories or local folder",
	Long: `Run this command to install mythic_sync from Git-based repositories by doing a git clone.
Subcommands of folder/github allow you to specify a local folder or a custom GitHub url + branch to leverage.`,
	Run: installMythicSync,
}

func init() {
	mythicSyncCmd.AddCommand(installMythicSyncCmd)
}

func installMythicSync(cmd *cobra.Command, args []string) {
	log.Fatalf("[-] Must specify github or folder")
}
