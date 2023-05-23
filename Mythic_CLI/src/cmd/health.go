package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var healthCmd = &cobra.Command{
	Use:   "health [container names]",
	Short: "Check health status of containers",
	Long:  `Run this command to get the health_check status from a container`,
	Run:   health,
	Args:  cobra.MinimumNArgs(1),
}

func init() {
	rootCmd.AddCommand(healthCmd)
}

func health(cmd *cobra.Command, args []string) {
	internal.DockerHealth(args)
}
