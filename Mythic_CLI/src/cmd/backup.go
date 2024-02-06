package cmd

import (
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var backupCmd = &cobra.Command{
	Use:   "backup",
	Short: "Backup various volumes/data to a custom location on disk",
	Long:  `Run various sub commands to backup and restore components`,
	Run:   backup,
}

func init() {
	rootCmd.AddCommand(backupCmd)
}

func backup(cmd *cobra.Command, args []string) {
	cmd.Help()
}
