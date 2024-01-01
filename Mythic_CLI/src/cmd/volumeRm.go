package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var volumeRm = &cobra.Command{
	Use:   "rm",
	Short: "Delete a volume and all of its contents",
	Long:  `Run this command to delete a specific volume and all of its contents `,
	Run:   volumesRmCommand,
}

func init() {
	volumeCmd.AddCommand(volumeRm)
}

func volumesRmCommand(cmd *cobra.Command, args []string) {
	internal.DockerRemoveVolume(args[0])
}
