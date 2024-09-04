package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var startCmd = &cobra.Command{
	Use:   "start [container names]",
	Short: "Start Mythic containers",
	Long:  `Run this command to start all Mythic containers. If you want to only start certain containers, specify their names.`,
	Run:   start,
}

func init() {
	rootCmd.AddCommand(startCmd)
	startCmd.Flags().BoolVarP(
		&keepVolume,
		"keep-volume",
		"",
		false,
		`Force keep the container's existing volume (if any) when starting the container`,
	)
}

func start(cmd *cobra.Command, args []string) {
	localKeepVolume := keepVolume
	if !keepVolume {
		keepVolume = !config.GetMythicEnv().GetBool("REBUILD_ON_START")
	}
	if err := internal.ServiceStart(args, localKeepVolume); err != nil {

	}
}
