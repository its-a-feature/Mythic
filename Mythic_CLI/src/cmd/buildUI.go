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
This outputs ignored code in the mythic-react-docker/mythic/public folder for local use without the development container.
Set mythic_react_use_build_context to true and mythic_react_use_volume to false to serve this local build. Release images compile the UI directly from MythicReactUI.`,
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
