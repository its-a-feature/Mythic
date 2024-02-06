package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var databaseRestoreCmd = &cobra.Command{
	Use:   "database {path to .tar file} ",
	Short: "restore the database from the specified tar file created from the 'backup database` command",
	Long:  `Run this command to restore the database from a saved copy.`,
	Run:   databaseRestore,
	Args:  cobra.ExactArgs(1),
}

func init() {
	restoreCmd.AddCommand(databaseRestoreCmd)
}

func databaseRestore(cmd *cobra.Command, args []string) {
	internal.DatabaseRestore(args[0])
}
