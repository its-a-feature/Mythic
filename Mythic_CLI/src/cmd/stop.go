package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
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
	stopCmd.Flags().BoolVarP(
		&keepVolume,
		"keep-volume",
		"",
		false,
		`Force keep the container's existing volume (if any) when starting the container`,
	)
}

func stop(cmd *cobra.Command, args []string) {
	localKeepVolume := keepVolume
	if !keepVolume {
		keepVolume = !config.GetMythicEnv().GetBool("REBUILD_ON_START")
	}
	if err := internal.ServiceStop(args, localKeepVolume); err != nil {

	}
}
