package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var volumeCopyFrom = &cobra.Command{
	Use:   "copy_from",
	Short: "Copy a file from a mounted volume to local disk",
	Long:  `Run this command to copy a file out of a mounted volume to local disk.`,
	Run:   volumesCopyFromCommand,
}

func init() {
	volumeCmd.AddCommand(volumeCopyFrom)
	volumeCopyFrom.Flags().StringVarP(
		&containerName,
		"container",
		"c",
		"",
		`Specify the name of the container that has the specified volume.`,
	)
	volumeCopyFrom.Flags().StringVarP(
		&volumeName,
		"volume",
		"v",
		"",
		`Specify the volume to copy a file from`,
	)
	volumeCopyFrom.Flags().StringVarP(
		&sourceName,
		"source",
		"s",
		"",
		`Specify the path of the file within the volume`,
	)
	volumeCopyFrom.Flags().StringVarP(
		&destinationName,
		"destination",
		"d",
		"",
		`Specify the destination path to write the file to`,
	)
}

func volumesCopyFromCommand(cmd *cobra.Command, args []string) {
	internal.DockerCopyFromVolume(containerName, volumeName, sourceName, destinationName)
}
