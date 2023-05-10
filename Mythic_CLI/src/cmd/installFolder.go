package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"os"
)

// installCmd represents the config command
var installFolderCmd = &cobra.Command{
	Use:   "folder path [-f]",
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
		`Force installing from local folder and don't prompt to overwrite files if an older version is already installed'`,
	)
}

func installFolder(cmd *cobra.Command, args []string) {
	if err := internal.InstallFolder(args[0], force); err != nil {
		fmt.Printf("[-] Failed to install service: %v\n", err)
		os.Exit(1)
	} else {
		fmt.Printf("[+] Successfully installed service!\n")
	}
}
