package cmd

import (
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var rabbitmqCmd = &cobra.Command{
	Use:   "rabbitmq",
	Short: "interact with the rabbitmq",
	Long:  `Run this command to interact with rabbitmq`,
	Run:   rabbitmqCommand,
}

func init() {
	rootCmd.AddCommand(rabbitmqCmd)
}

func rabbitmqCommand(cmd *cobra.Command, args []string) {

}
