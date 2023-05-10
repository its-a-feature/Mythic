package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"os"
)

// installCmd represents the config command
var installMythicSyncFolderCmd = &cobra.Command{
	Use:   "folder {path} ",
	Short: "install mythic_sync from local folder",
	Long:  `Run this command to install mythic_sync from a locally cloned folder`,
	Run:   installMythicSyncFolder,
	Args:  cobra.ExactArgs(1),
}

func init() {
	installMythicSyncCmd.AddCommand(installMythicSyncFolderCmd)
}

func installMythicSyncFolder(cmd *cobra.Command, args []string) {
	if err := internal.InstallMythicSyncFolder(args[0]); err != nil {
		fmt.Printf("[-] Failed to install service: %v\n", err)
		os.Exit(1)
	} else {
		fmt.Printf("[+] Successfully installed service!\n")
	}
}
