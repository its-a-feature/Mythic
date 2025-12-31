package cmd

import (
	"fmt"

	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/spf13/cobra"
)

// configCmd represents the config command
var removeImageCmd = &cobra.Command{
	Use:   "remove_images",
	Short: "Remove dangling images",
	Long:  `Run this command to remove unused images`,
	Run:   removeImages,
}

func init() {
	rootCmd.AddCommand(removeImageCmd)
}

func removeImages(cmd *cobra.Command, args []string) {
	err := manager.GetManager().RemoveImages()
	if err != nil {
		fmt.Println(err)
	}
}
