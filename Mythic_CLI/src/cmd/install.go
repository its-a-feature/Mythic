package cmd

import (
	"github.com/spf13/cobra"
)

// installCmd represents the config command
var installCmd = &cobra.Command{
	Use:   "install",
	Short: "Install services via git or local folders",
	Long: `Run this command to install services. Use subcommands to
adjust the URLs / paths of where to pull from.`,
	Run: installDisplay,
}

func init() {
	rootCmd.AddCommand(installCmd)
}

func installDisplay(cmd *cobra.Command, args []string) {
	cmd.Help()
}
