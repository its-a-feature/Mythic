package cmd

import (
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var databaseCmd = &cobra.Command{
	Use:   "database",
	Short: "Interact with the database",
	Long:  `Run this command to interact with the database`,
	Run:   database,
}

func init() {
	rootCmd.AddCommand(databaseCmd)
}

func database(cmd *cobra.Command, args []string) {
	cmd.Help()
}
