package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// installCmd represents the config command
var installGitHubCmd = &cobra.Command{
	Use:   "github url [branch] [-f]",
	Short: "install services from GitHub or other Git-based repositories",
	Long:  `Run this command to install services from Git-based repositories by doing a git clone`,
	Run:   installGitHub,
	Args:  cobra.RangeArgs(1, 2),
}
var force bool

func init() {
	installCmd.AddCommand(installGitHubCmd)
	installGitHubCmd.Flags().BoolVar(
		&force,
		"f",
		false,
		`Force installing from GitHub and don't prompt to overwrite files if an older version is already installed'`,
	)
}

func installGitHub(cmd *cobra.Command, args []string) {
	if err := internal.InstallService(args[0], args[1], force); err != nil {
		fmt.Printf("[-] Failed to install service: %v\n", err)
	} else {
		fmt.Printf("[+] Successfully installed service!")
	}
}
