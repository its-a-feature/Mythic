package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"log"
	"os"
)

// installCmd represents the config command
var installFolderCmd = &cobra.Command{
	Use:   "folder path [-f] [-kv]",
	Short: "install services from local folder",
	Long:  `Run this command to install a properly formatted ExternalAgent folder into Mythic.`,
	Run:   installFolder,
	Args:  cobra.ExactArgs(1),
}

func init() {
	installCmd.AddCommand(installFolderCmd)
	installFolderCmd.Flags().BoolVarP(
		&force,
		"force",
		"f",
		false,
		`Force installing from local folder and don't prompt to overwrite files if an older version is already installed`,
	)
	installFolderCmd.Flags().BoolVarP(
		&keepVolume,
		"keep-volume",
		"",
		false,
		`Force keep the container's existing volume (if any) when starting the container`,
	)
}

func installFolder(cmd *cobra.Command, args []string) {
	localKeepVolume := keepVolume
	if !keepVolume {
		localKeepVolume = !config.GetMythicEnv().GetBool("REBUILD_ON_START")
	}
	if err := internal.InstallFolder(args[0], force, localKeepVolume, ""); err != nil {
		log.Printf("[-] Failed to install service: %v\n", err)
		os.Exit(1)
	} else {
		log.Printf("[+] Successfully installed service!\n")
	}
}
