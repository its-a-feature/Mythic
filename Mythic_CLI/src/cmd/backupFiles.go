package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var filesBackupCmd = &cobra.Command{
	Use:   "files {path}",
	Short: "backup the various files uploaded/downloaded with Mythic",
	Long:  `Run this command to backup the uploaded/downloaded files associated with Mythic (Save a copy to the specified location).`,
	Run:   fileBackup,
	Args:  cobra.ExactArgs(1),
}

func init() {
	backupCmd.AddCommand(filesBackupCmd)
}

func fileBackup(cmd *cobra.Command, args []string) {
	internal.FilesBackup(args[0])
}
