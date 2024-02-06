package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var filesRestoreCmd = &cobra.Command{
	Use:   "files {path}",
	Short: "restore the uploaded/downloaded files from a path",
	Long:  `Run this command to restore Mythic's uploaded/downloaded files from a saved copy.`,
	Run:   filesRestore,
	Args:  cobra.ExactArgs(1),
}

func init() {
	restoreCmd.AddCommand(filesRestoreCmd)
}

func filesRestore(cmd *cobra.Command, args []string) {
	internal.FilesRestore(args[0])
}
