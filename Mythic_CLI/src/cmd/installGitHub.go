package cmd

import (
	"log"
	"os"
	"slices"
	"strings"

	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/spf13/cobra"
)

// installCmd represents the config command
var installGitHubCmd = &cobra.Command{
	Use:     "github url [branch] [-f]",
	Short:   "install services from GitHub or other Git-based repositories",
	Long:    `Run this command to install services from Git-based repositories by doing a git clone`,
	Aliases: []string{"git"},
	Run:     installGitHub,
	Args:    cobra.RangeArgs(1, 2),
}

func init() {
	installCmd.AddCommand(installGitHubCmd)
	installGitHubCmd.Flags().BoolVarP(
		&force,
		"force",
		"f",
		false,
		`Force installing from GitHub and don't prompt to overwrite files if an older version is already installed`,
	)
	installGitHubCmd.Flags().StringVarP(
		&branch,
		"branch",
		"b",
		"",
		`Install a specific branch from GitHub instead of the main/master branch`,
	)
	installGitHubCmd.Flags().BoolVarP(
		&keepVolume,
		"keep-volume",
		"",
		false,
		`Force keep the container's existing volume (if any) when starting the container`,
	)
}

func installGitHub(cmd *cobra.Command, args []string) {
	if len(args) == 2 {
		branch = args[1]
	}
	localKeepVolume := keepVolume
	if !keepVolume {
		localKeepVolume = !config.GetMythicEnv().GetBool("REBUILD_ON_START")
	}
	err, additionalServices := internal.InstallService(args[0], branch, force, localKeepVolume)
	if err != nil {
		log.Printf("[-] Failed to install service: %v\n", err)
		os.Exit(1)
	}
	log.Printf("[+] Successfully installed service!\n")
	if len(additionalServices) > 0 {
		log.Printf("[*] Attempting to install additional services.\n")
	}
	for serviceName, servicePath := range additionalServices {
		existing3rdParty, _ := manager.GetManager().GetAllInstalled3rdPartyServiceNames()
		if !slices.Contains(existing3rdParty, serviceName) && (force || config.AskConfirm("[*] Would you like to install "+serviceName+"? ")) {
			if strings.HasPrefix(servicePath, "http") || strings.HasPrefix(servicePath, "git@") {
				installGitHub(cmd, strings.Split(servicePath, " "))
			} else {
				installFolder(cmd, []string{servicePath})
			}
		}
	}
}
