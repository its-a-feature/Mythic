package cmd

import (
	"fmt"
	"log"
	"os"
	"sort"
	"strings"
	"text/tabwriter"

	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/spf13/cobra"
)

// configServiceCmd
var configServiceCmd = &cobra.Command{
	Use:   "service [name]",
	Short: "Get configurations for remote services",
	Long: `Get configuration variables to use with a remote service - 
a service that runs on a host other than the host where Mythic is running`,
	Args: cobra.ExactArgs(1),
	Run:  configService,
}

func init() {
	configCmd.AddCommand(configServiceCmd)
}

func configService(cmd *cobra.Command, args []string) {
	// initialize tabwriter
	writer := new(tabwriter.Writer)
	// Set minwidth, tabwidth, padding, padchar, and flags
	writer.Init(os.Stdout, 8, 8, 1, '\t', 0)

	defer writer.Flush()

	fmt.Println("[+] Getting configuration values:")
	fmt.Fprintf(writer, "\n %s\t%s", "Setting", "Value")
	fmt.Fprintf(writer, "\n %s\t%s", "–––––––", "–––––––")

	configuration := config.GetConfigStrings([]string{
		"MYTHIC_SERVER_HOST",
		"MYTHIC_SERVER_PORT",
		"MYTHIC_SERVER_GRPC_PORT",
		"RABBITMQ_HOST",
		"RABBITMQ_PORT",
	})
	serviceName, validationErr := config.ValidateContainerPrincipal(args[0], config.GetMythicEnv().GetString("rabbitmq_server_user"))
	if validationErr != nil {
		log.Printf("[-] %v\n", validationErr)
		return
	}
	installed, installedErr := manager.GetManager().GetAllInstalled3rdPartyServiceNames()
	if installedErr != nil {
		log.Printf("[-] Failed to read provisioned services: %v\n", installedErr)
		return
	}
	found := false
	for _, candidate := range installed {
		if config.CanonicalContainerPrincipal(candidate) == serviceName {
			found = true
			break
		}
	}
	if !found {
		log.Printf("[-] Service %q is not provisioned in docker-compose; install/add it before requesting credentials\n", serviceName)
		return
	}
	configuration["RABBITMQ_USER"] = serviceName
	configuration["RABBITMQ_PASSWORD"] = config.DeriveContainerBrokerPassword(
		config.GetMythicEnv().GetString("container_identity_secret"), serviceName)
	configuration["RABBITMQ_VHOST"] = config.GetMythicEnv().GetString("rabbitmq_secure_vhost")
	configuration["MYTHIC_CONTAINER_PRINCIPAL"] = serviceName
	configuration["MYTHIC_CONTAINER_AUTH_TOKEN"] = config.DeriveContainerIdentityToken(
		config.GetMythicEnv().GetString("container_identity_secret"), serviceName)
	keys := make([]string, 0, len(configuration))
	for k := range configuration {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	for _, key := range keys {
		fmt.Fprintf(writer, "\n %s\t%s", strings.ToUpper(key), configuration[key])
	}
	mythicServerStatus := config.GetConfigStrings([]string{"MYTHIC_SERVER_BIND_LOCALHOST_ONLY"})
	if val, ok := mythicServerStatus["MYTHIC_SERVER_BIND_LOCALHOST_ONLY"]; ok {
		if val == "true" {
			fmt.Fprintf(writer, "\t\t")
			fmt.Fprintf(writer, "MYTHIC_SERVER_BIND_LOCALHOST_ONLY is set to true - set this to false and restart Mythic")
		}
	}
	rabbitmqStatus := config.GetConfigStrings([]string{"RABBITMQ_BIND_LOCALHOST_ONLY"})
	if val, ok := rabbitmqStatus["RABBITMQ_BIND_LOCALHOST_ONLY"]; ok {
		if val == "true" {
			fmt.Fprintf(writer, "\t\t")
			fmt.Fprintf(writer, "RABBITMQ_BIND_LOCALHOST_ONLY is set to true - set this to false and restart Mythic")
		}
	}
	fmt.Fprintln(writer, "")
}
