package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var removeDockerComposeCmd = &cobra.Command{
	Use:   "remove [service name]",
	Short: "Remove local service folder from docker compose",
	Long:  `Run this command to remove a local Mythic service folder from docker-compose.`,
	Run:   removeDockerCompose,
	Args:  cobra.ExactArgs(1),
}

func init() {
	rootCmd.AddCommand(removeDockerComposeCmd)
}

func removeDockerCompose(cmd *cobra.Command, args []string) {
	if err := internal.RemoveDockerComposeEntry(args[0]); err != nil {

	}
}
