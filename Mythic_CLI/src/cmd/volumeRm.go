package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"os"
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
	err := internal.DockerRemoveVolume(args[0])
	if err != nil {
		fmt.Printf("[-] error removing volume: \n%v\n", err)
		os.Exit(1)
	} else {
		fmt.Printf("[+] Successfully removed volume\n")
	}
}
