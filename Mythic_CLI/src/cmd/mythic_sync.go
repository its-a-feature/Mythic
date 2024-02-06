package cmd

import (
	"github.com/spf13/cobra"
)

// installCmd represents the config command
var mythicSyncCmd = &cobra.Command{
	Use:   "mythic_sync",
	Short: "Install/Uninstall mythic_sync",
	Long:  `Run this command's subcommands to install/uninstall mythic_sync `,
	Run:   mythicSync,
}

func init() {
	rootCmd.AddCommand(mythicSyncCmd)
}

func mythicSync(cmd *cobra.Command, args []string) {
	cmd.Help()
}
