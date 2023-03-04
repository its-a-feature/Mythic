package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var rabbitmqResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "reset rabbitmq",
	Long: `Run this command to stop mythic and delete the current RabbitMQ storage`,
	Run: rabbitmqReset,
}

func init() {
	rabbitmqCmd.AddCommand(rabbitmqResetCmd)
}

func rabbitmqReset(cmd *cobra.Command, args []string) {
	internal.RabbitmqReset(true)
}
