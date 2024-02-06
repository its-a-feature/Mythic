package cmd

import (
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var restoreCmd = &cobra.Command{
	Use:   "restore",
	Short: "Restore various volumes/data from a custom location on disk",
	Long:  `Run various sub commands to restore components`,
	Run:   restore,
}

func init() {
	rootCmd.AddCommand(restoreCmd)
}

func restore(cmd *cobra.Command, args []string) {
	cmd.Help()
}
