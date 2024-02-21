package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var databaseResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "reset the database",
	Long: `Run this command to stop mythic and delete the current database. 
THIS DELETES THE CURRENT DATABASE AND ALL DATA WITHIN IT`,
	Run: databaseReset,
}

func init() {
	databaseCmd.AddCommand(databaseResetCmd)
	databaseResetCmd.Flags().BoolVarP(
		&force,
		"force",
		"f",
		false,
		`Force deleting the database and don't prompt for confirmation`,
	)
}

func databaseReset(cmd *cobra.Command, args []string) {
	internal.DatabaseReset(force)
}
