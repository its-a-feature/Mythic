package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var buildCmd = &cobra.Command{
	Use:   "build [container names]",
	Short: "Build/rebuild a specific container",
	Long:  `Run this command to build or rebuild a specific container by specifying container names.`,
	Run:   buildContainer,
}

func init() {
	rootCmd.AddCommand(buildCmd)
	buildCmd.Flags().BoolVarP(
		&keepVolume,
		"keep-volume",
		"",
		false,
		`Force keep the container's existing volume (if any) when starting the container`,
	)
}

func buildContainer(cmd *cobra.Command, args []string) {
	if err := internal.ServiceBuild(args, keepVolume); err != nil {

	}
}
