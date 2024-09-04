package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
	"log"
)

// configCmd represents the config command
var buildReactUICmd = &cobra.Command{
	Use:   "build_ui",
	Short: "Build/rebuild the React UI",
	Long: `Run this command to build or rebuild the React UI after you've done some modifications.
This outputs code in the mythic-react-docker/mythic/public folder so it's ready for use without the development container.`,
	Run: buildReactUI,
}

func init() {
	rootCmd.AddCommand(buildReactUICmd)
}

func buildReactUI(cmd *cobra.Command, args []string) {
	if err := internal.DockerBuildReactUI(); err != nil {
		log.Printf("[-] Failed to build UI\n")
	} else {
		log.Printf("[+] Successfully built UI!\n")
	}
}
