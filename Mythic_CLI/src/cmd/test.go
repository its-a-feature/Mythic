package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var testCmd = &cobra.Command{
	Use:   "test",
	Short: "Test mythic service connections",
	Long:  `Run this command to test mythic connections to RabbitMQ and the Mythic UI`,
	Run:   test,
}

func init() {
	rootCmd.AddCommand(testCmd)
}

func test(cmd *cobra.Command, args []string) {
	internal.TestMythicRabbitmqConnection()
	internal.TestMythicConnection()
}
