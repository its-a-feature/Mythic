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

var startAgain bool

func init() {
	rabbitmqCmd.AddCommand(rabbitmqResetCmd)
	rabbitmqResetCmd.Flags().BoolVarP(
		&force,
		"force",
		"f",
		false,
		`Force deleting the rabbitmq storage and don't prompt for confirmation`,
	)
	rabbitmqResetCmd.Flags().BoolVarP(
		&startAgain,
		"start-again",
		"s",
		true,
		`Start the container again after making changes`,
	)
}

func rabbitmqReset(cmd *cobra.Command, args []string) {
	internal.RabbitmqReset(force, startAgain)
}
