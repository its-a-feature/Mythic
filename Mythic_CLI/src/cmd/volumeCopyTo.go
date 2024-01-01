package cmd

import (
	"archive/tar"
	"bytes"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"io"
	"os"
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
	source, err := os.Open(sourceName)
	if err != nil {
		fmt.Printf("[-] Failed to open file locally: %v\n", err)
		os.Exit(1)
	}
	sourceStats, err := source.Stat()
	if err != nil {
		fmt.Printf("[-] Failed to stat file: %v\n", err)
		os.Exit(1)
	}
	var buf bytes.Buffer
	tw := tar.NewWriter(&buf)
	err = tw.WriteHeader(&tar.Header{
		Name: sourceName,         // filename
		Mode: 0777,               // permissions
		Size: sourceStats.Size(), // filesize
	})
	if err != nil {
		fmt.Printf("[-] Failed to create tar: %v\n", err)
		os.Exit(1)
	}
	content, err := io.ReadAll(source)
	if err != nil {
		fmt.Printf("[-] Failed to read file contents: %v\n", err)
		os.Exit(1)
	}
	_, err = tw.Write(content)
	if err != nil {
		fmt.Printf("[-] Failed to write to temp tar: %v\n", err)
		os.Exit(1)
	}
	err = tw.Close()
	if err != nil {
		fmt.Printf("[-] Failed to close temp tar: %v\n", err)
		os.Exit(1)
	}
	internal.DockerCopyIntoVolume(&buf, destinationName, volumeName)
}
