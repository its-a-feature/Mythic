package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var stopCmd = &cobra.Command{
	Use:   "stop",
	Short: "Stop all of Mythic",
	Long: `Run this command stop all Mythic containers. Use subcommands to
adjust specific containers to stop.`,
	Run: stop,
}

func init() {
	rootCmd.AddCommand(stopCmd)
}

func stop(cmd *cobra.Command, args []string) {
	if err := internal.ServiceStop(args); err != nil {

	}
}
