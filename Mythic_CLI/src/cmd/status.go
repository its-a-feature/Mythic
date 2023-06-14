package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var statusCmd = &cobra.Command{
	Use:   "status",
	Short: "Get current Mythic container status",
	Long:  `Run this command to get the current status of the Mythic services and containers.`,
	Run:   status,
}
var verbose bool

func init() {
	rootCmd.AddCommand(statusCmd)
	statusCmd.Flags().BoolVarP(
		&verbose,
		"verbose",
		"v",
		false,
		`Display more verbose information about the status, including services installed and not running or those installed and not in docker-compose`,
	)
}

func status(cmd *cobra.Command, args []string) {
	internal.Status(verbose)
}
