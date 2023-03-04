package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// installCmd represents the config command
var uninstallMythicSyncCmd = &cobra.Command{
	Use:   "uninstall",
	Short: "uninstall mythic_sync and remove it from disk",
	Long:  `Run this command to uninstall mythic_sync and remove it from disk`,
	Run:   uninstallMythicSyncGitHub,
}

func init() {
	mythicSyncCmd.AddCommand(uninstallMythicSyncCmd)
}

func uninstallMythicSyncGitHub(cmd *cobra.Command, args []string) {
	internal.UninstallMythicSync()
}
