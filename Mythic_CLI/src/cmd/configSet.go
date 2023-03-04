package cmd

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/internal"
	"github.com/spf13/cobra"
)

// configSetCmd represents the configSet command
var configSetCmd = &cobra.Command{
	Use:   "set <configuration> <value>",
	Short: "Set the specified configuration value",
	Long: `Set the specified configuration value. Use quotations around the value
if it contains spaces.
For example: mythic-cli config set DATE_FORMAT "d M Y"`,
	Args: cobra.ExactArgs(2),
	Run:  configSet,
}

func init() {
	configCmd.AddCommand(configSetCmd)
}

func configSet(cmd *cobra.Command, args []string) {
	internal.SetConfigStrings(args[0], args[1])
	fmt.Println("[+] Configuration successfully updated. Bring containers down and up for changes to take effect.")
}
