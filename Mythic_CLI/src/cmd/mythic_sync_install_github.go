package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// installCmd represents the config command
var installMythicSyncGitHubCmd = &cobra.Command{
	Use:   "github [url] [branch] [-f]",
	Short: "install services from GitHub or other Git-based repositories",
	Long:  `Run this command to install services from Git-based repositories by doing a git clone`,
	Run:   installMythicSyncGitHub,
	Args:  cobra.RangeArgs(0, 2),
}

func init() {
	installMythicSyncCmd.AddCommand(installMythicSyncGitHubCmd)
	installMythicSyncGitHubCmd.Flags().BoolVar(
		&force,
		"f",
		false,
		`Force installing from GitHub and don't prompt to overwrite files if an older version is already installed'`,
	)
}

func installMythicSyncGitHub(cmd *cobra.Command, args []string) {
	if args[0] == "" {
		if err := internal.InstallMythicSync("https://github.com/GhostManager/mythic_sync", ""); err != nil {

		}
	} else {
		if err := internal.InstallService(args[0], args[1], force); err != nil {
			fmt.Printf("[-] Failed to install service: %v\n", err)
		} else {
			fmt.Printf("[+] Successfully installed service!")
		}
	}

}
