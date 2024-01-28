package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var removeCmd = &cobra.Command{
	Use:   "remove_container [container names]",
	Short: "Remove running or exited containers",
	Long:  `Run this command to remove containers. These will say 'Exited' in the 'status' output if they're orphaned'.`,
	Run:   removeContainer,
}

func init() {
	rootCmd.AddCommand(removeCmd)
}

func removeContainer(cmd *cobra.Command, args []string) {
	if err := internal.ServiceRemoveContainers(args); err != nil {

	}
}
