package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"log"
	"os"
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
	installMythicSyncGitHubCmd.Flags().BoolVarP(
		&force,
		"force",
		"f",
		false,
		`Force installing from GitHub and don't prompt to overwrite files if an older version is already installed`,
	)
	installMythicSyncGitHubCmd.Flags().StringVarP(
		&branch,
		"branch",
		"b",
		"",
		`Install a specific branch from GitHub instead of the main/master branch`,
	)
}

func installMythicSyncGitHub(cmd *cobra.Command, args []string) {
	if len(args) == 0 {
		if err := internal.InstallMythicSync("https://github.com/GhostManager/mythic_sync", ""); err != nil {
			log.Printf("[-] Failed to install service: %v\n", err)
			os.Exit(1)
		}
	} else {
		if len(args) == 2 {
			branch = args[1]
		}
		if err := internal.InstallMythicSync(args[0], branch); err != nil {
			log.Printf("[-] Failed to install service: %v\n", err)
			os.Exit(1)
		} else {
			log.Printf("[+] Successfully installed service!\n")
		}
	}

}
