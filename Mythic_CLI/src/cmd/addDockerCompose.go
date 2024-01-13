package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var addDockerComposeCmd = &cobra.Command{
	Use:   "add [service name]",
	Short: "Add local service folder to docker compose",
	Long:  `Run this command to register a local Mythic service folder with docker-compose.`,
	Run:   addDockerCompose,
	Args:  cobra.ExactArgs(1),
}

func init() {
	rootCmd.AddCommand(addDockerComposeCmd)
}

func addDockerCompose(cmd *cobra.Command, args []string) {
	if err := internal.Add3rdPartyService(args[0], make(map[string]interface{})); err != nil {

	}
}
