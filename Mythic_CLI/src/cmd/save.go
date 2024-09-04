package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"log"
)

// configCmd represents the config command
var saveCmd = &cobra.Command{
	Use:   "save [container names]",
	Short: "Save tar versions of the specified container's images",
	Long: `Run this command to create TAR files for the specified container's backing images. If you want to only save certain containers, specify their names.
You can then use the 'load' command to load these images on a separate server that doesn't have internet connectivity or a slow internet connection.'`,
	Run: save,
}

func init() {
	rootCmd.AddCommand(saveCmd)
}

func save(cmd *cobra.Command, args []string) {
	if err := internal.DockerSave(args); err != nil {
		log.Printf("%v\n", err)
	} else {
		log.Printf("[+] Successfully saved file\n")
	}
}
