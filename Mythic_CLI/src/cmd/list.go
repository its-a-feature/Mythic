package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var listCmd = &cobra.Command{
	Use:   "services",
	Short: "List out installed services",
	Long:  `Run this command to list out installed services.`,
	Run:   getInstalledServices,
}

func init() {
	rootCmd.AddCommand(listCmd)
}

func getInstalledServices(cmd *cobra.Command, args []string) {
	internal.ListServices()
}
