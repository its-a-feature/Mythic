package cmd

import (
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/spf13/cobra"
	"log"
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
	log.Printf("[*] mythic-cli version:    %s\n", config.Version)
	if fileContents, err := os.ReadFile("VERSION"); err != nil {
		log.Printf("[!] Failed to get Mythic version: %v\n", err)
	} else {
		log.Printf("[*] Mythic Server version: v%s\n", string(fileContents))
	}
	if fileContents, err := os.ReadFile(filepath.Join(".", "MythicReactUI", "src", "index.js")); err != nil {
		log.Printf("[!] Failed to get MythicReactUI version: %v\n", err)
	} else {
		fileLines := strings.Split(string(fileContents), "\n")
		for _, line := range fileLines {
			if strings.Contains(line, "mythicUIVersion") {
				uiVersionPieces := strings.Split(line, "=")
				uiVersion := uiVersionPieces[1]
				log.Printf("[*] React UI Version:      v%s\n", uiVersion[2:len(uiVersion)-2])
				return
			}
		}
	}
}
