package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/spf13/cobra"
	"os"
	"path/filepath"
	"strings"
)

var versionCmd = &cobra.Command{
	Use:   "version",
	Short: "Print information about the mythic-cli and Mythic versions",
	Long:  `Run this command to print versioning information about Mythic and mythic-cli `,
	Run:   mythicVersion,
}

func init() {
	rootCmd.AddCommand(versionCmd)
}

func mythicVersion(cmd *cobra.Command, args []string) {
	fmt.Printf("[*] mythic-cli version:    %s\n", config.Version)
	if fileContents, err := os.ReadFile("VERSION"); err != nil {
		fmt.Printf("[!] Failed to get Mythic version: %v\n", err)
	} else {
		fmt.Printf("[*] Mythic Server version: v%s\n", string(fileContents))
	}
	if fileContents, err := os.ReadFile(filepath.Join(".", "MythicReactUI", "src", "index.js")); err != nil {
		fmt.Printf("[!] Failed to get MythicReactUI version: %v\n", err)
	} else {
		fileLines := strings.Split(string(fileContents), "\n")
		for _, line := range fileLines {
			if strings.Contains(line, "mythicUIVersion") {
				uiVersionPieces := strings.Split(line, "=")
				uiVersion := uiVersionPieces[1]
				fmt.Printf("[*] React UI Version:      v%s\n", uiVersion[2:len(uiVersion)-2])
				return
			}
		}
	}
}
