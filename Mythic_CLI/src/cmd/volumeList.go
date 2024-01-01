package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var volumeList = &cobra.Command{
	Use:   "ls",
	Short: "list information about the volumes Mythic can use",
	Long:  `Run this command to list specific information about all of the volumes Mythic can use. `,
	Run:   volumesListCommand,
}

func init() {
	volumeCmd.AddCommand(volumeList)
}

func volumesListCommand(cmd *cobra.Command, args []string) {
	internal.VolumesList()
}
