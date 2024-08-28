package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var volumeCopyTo = &cobra.Command{
	Use:   "copy_to",
	Short: "Copy a file to a mounted volume from local disk",
	Long:  `Run this command to copy a file to a mounted volume from local disk.`,
	Run:   volumesCopyToCommand,
}

func init() {
	volumeCmd.AddCommand(volumeCopyTo)
	volumeCopyTo.Flags().StringVarP(
		&containerName,
		"container",
		"c",
		"",
		`Specify the name of the container that has the specified volume.`,
	)
	volumeCopyTo.Flags().StringVarP(
		&volumeName,
		"volume",
		"v",
		"",
		`Specify the volume to copy a file to`,
	)
	volumeCopyTo.Flags().StringVarP(
		&sourceName,
		"source",
		"s",
		"",
		`Specify the path of the file locally`,
	)
	volumeCopyTo.Flags().StringVarP(
		&destinationName,
		"destination",
		"d",
		"",
		`Specify the destination directory to write the file to within the volume`,
	)
}

func volumesCopyToCommand(cmd *cobra.Command, args []string) {
	internal.DockerCopyIntoVolume(containerName, sourceName, destinationName, volumeName)
}
