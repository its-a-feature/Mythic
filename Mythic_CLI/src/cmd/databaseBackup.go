package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var databaseBackupCmd = &cobra.Command{
	Use:   "backup {path}",
	Short: "backup the database",
	Long:  `Run this command to stop mythic and backup the current database (Save a copy to the specified location).`,
	Run:   databaseBackup,
	Args:  cobra.ExactArgs(1),
}

func init() {
	//databaseCmd.AddCommand(databaseBackupCmd)
}

func databaseBackup(cmd *cobra.Command, args []string) {
	internal.DatabaseBackup(args[0])
}
