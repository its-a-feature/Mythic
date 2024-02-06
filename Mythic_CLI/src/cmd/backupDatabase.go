package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var databaseBackupCmd = &cobra.Command{
	Use:   "database {path to folder}",
	Short: "backup a tar of the current database to the specified folder",
	Long:  `Run this command to backup the current database (Save a copy to the specified location).`,
	Run:   databaseBackup,
	Args:  cobra.ExactArgs(1),
}

func init() {
	backupCmd.AddCommand(databaseBackupCmd)
}

func databaseBackup(cmd *cobra.Command, args []string) {
	internal.DatabaseBackup(args[0])
}
