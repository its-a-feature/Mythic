package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var logsCmd = &cobra.Command{
	Use:   "logs [container name]",
	Short: "Get docker logs from a running service",
	Long:  `Run this command to get Docker logs from a running service.`,
	Run:   getLogs,
	Args:  cobra.ExactArgs(1),
}

func init() {
	rootCmd.AddCommand(logsCmd)
	logsCmd.Flags().StringP("lines", "l", "200", "Number of lines to display")
	logsCmd.Flags().BoolP(
		"follow",
		"f",
		false,
		`Follow a constant stream of logs from the specified container.`,
	)
}

func getLogs(cmd *cobra.Command, args []string) {
	if cmd.Flag("follow").Value.String() == "true" {
		internal.GetLogs(args[0], cmd.Flag("lines").Value.String(), true)
	} else {
		internal.GetLogs(args[0], cmd.Flag("lines").Value.String(), false)
	}

}
