package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var rabbitmqResetCmd = &cobra.Command{
	Use:   "reset",
	Short: "reset the rabbitmq storage",
	Long:  `Run this command to delete the current rabbitmq storage cache. Rabbitmq will recreate this on startup.`,
	Run:   rabbitmqReset,
}

func init() {
	rabbitmqCmd.AddCommand(rabbitmqResetCmd)
	rabbitmqResetCmd.Flags().BoolVarP(
		&force,
		"force",
		"f",
		false,
		`Force deleting the rabbitmq storage and don't prompt for confirmation`,
	)
}

func rabbitmqReset(cmd *cobra.Command, args []string) {
	internal.RabbitmqReset(force)
}
