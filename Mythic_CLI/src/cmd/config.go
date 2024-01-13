package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/spf13/cobra"
	"os"
	"sort"
	"strings"
	"text/tabwriter"
)

// configCmd represents the config command
var configCmd = &cobra.Command{
	Use:   "config",
	Short: "Display or adjust the configuration",
	Long: `Run this command to display the configuration. Use subcommands to
adjust the configuration or retrieve individual values.`,
	Run: configDisplay,
}

func init() {
	rootCmd.AddCommand(configCmd)
}

func configDisplay(cmd *cobra.Command, args []string) {
	// initialize tabwriter
	writer := new(tabwriter.Writer)
	// Set minwidth, tabwidth, padding, padchar, and flags
	writer.Init(os.Stdout, 8, 8, 1, '\t', 0)

	defer writer.Flush()

	fmt.Println("[+] Current configuration and available variables:")
	fmt.Fprintf(writer, "\n %s\t%s", "Setting", "Value")
	fmt.Fprintf(writer, "\n %s\t%s", "–––––––", "–––––––")

	configuration := config.GetConfigAllStrings()
	keys := make([]string, 0, len(configuration))
	for k := range configuration {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, key := range keys {
		fmt.Fprintf(writer, "\n %s\t%s", strings.ToUpper(key), configuration[key])
	}
	fmt.Fprintln(writer, "")
}
