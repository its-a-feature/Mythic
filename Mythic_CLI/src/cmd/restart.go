package cmd

import (
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var restartCmd = &cobra.Command{
	Use:   "restart",
	Short: "Start all of Mythic",
	Long: `Run this command restart all Mythic containers. Use subcommands to
adjust specific containers to restart.`,
	Run: start,
}

func init() {
	rootCmd.AddCommand(restartCmd)
}
