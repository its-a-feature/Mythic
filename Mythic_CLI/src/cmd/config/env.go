package config

import (
	"bufio"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"github.com/spf13/viper"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"
)

var MythicPossibleServices = []string{
	"mythic_postgres",
	"mythic_react",
	"mythic_server",
	"mythic_nginx",
	"mythic_rabbitmq",
	"mythic_graphql",
	"mythic_documentation",
	"mythic_jupyter",
	"mythic_sync",
	"mythic_grafana",
	"mythic_prometheus",
	"mythic_postgres_exporter",
}
var mythicEnv = viper.New()

// GetIntendedMythicServiceNames uses MythicEnv host values for various services to see if they should be local or remote
func GetIntendedMythicServiceNames() ([]string, error) {
	// need to see about adding services back in if they were for remote hosts before
	containerList := []string{}
	for _, service := range MythicPossibleServices {
		// service is a mythic service, but it's not in our current container list (i.e. not in docker-compose)
		switch service {
		case "mythic_react":
			if mythicEnv.GetString("MYTHIC_REACT_HOST") == "127.0.0.1" || mythicEnv.GetString("MYTHIC_REACT_HOST") == "mythic_react" {
				containerList = append(containerList, service)
			}
		case "mythic_nginx":
			if mythicEnv.GetString("NGINX_HOST") == "127.0.0.1" || mythicEnv.GetString("NGINX_HOST") == "mythic_nginx" {
				containerList = append(containerList, service)
			}
		case "mythic_rabbitmq":
			if mythicEnv.GetString("RABBITMQ_HOST") == "127.0.0.1" || mythicEnv.GetString("RABBITMQ_HOST") == "mythic_rabbitmq" {
				containerList = append(containerList, service)
			}
		case "mythic_server":
			if mythicEnv.GetString("MYTHIC_SERVER_HOST") == "127.0.0.1" || mythicEnv.GetString("MYTHIC_SERVER_HOST") == "mythic_server" {
				containerList = append(containerList, service)
			}
		case "mythic_postgres":
			if mythicEnv.GetString("POSTGRES_HOST") == "127.0.0.1" || mythicEnv.GetString("POSTGRES_HOST") == "mythic_postgres" {
				containerList = append(containerList, service)
			}
		case "mythic_graphql":
			if mythicEnv.GetString("HASURA_HOST") == "127.0.0.1" || mythicEnv.GetString("HASURA_HOST") == "mythic_graphql" {
				containerList = append(containerList, service)
			}
		case "mythic_documentation":
			if mythicEnv.GetString("DOCUMENTATION_HOST") == "127.0.0.1" || mythicEnv.GetString("DOCUMENTATION_HOST") == "mythic_documentation" {
				containerList = append(containerList, service)
			}
		case "mythic_jupyter":
			if mythicEnv.GetString("JUPYTER_HOST") == "127.0.0.1" || mythicEnv.GetString("JUPYTER_HOST") == "mythic_jupyter" {
				containerList = append(containerList, service)
			}
		case "mythic_grafana":
			if mythicEnv.GetBool("postgres_debug") {
				containerList = append(containerList, service)
			}
		case "mythic_prometheus":
			if mythicEnv.GetBool("postgres_debug") {
				containerList = append(containerList, service)
			}
		case "mythic_postgres_exporter":
			if mythicEnv.GetBool("postgres_debug") {
				containerList = append(containerList, service)
			}
			/*
				case "mythic_sync":
					if mythicSyncPath, err := filepath.Abs(filepath.Join(utils.GetCwdFromExe(), InstalledServicesFolder, "mythic_sync")); err != nil {
						fmt.Printf("[-] Failed to get the absolute path to mythic_sync: %v\n", err)
					} else if _, err = os.Stat(mythicSyncPath); !os.IsNotExist(err) {
						// this means that the mythic_sync folder _does_ exist
						containerList = append(containerList, service)
					}

			*/
		}
	}
	return containerList, nil
}
func GetMythicEnv() *viper.Viper {
	return mythicEnv
}
func setMythicConfigDefaultValues() {
	// global configuration
	mythicEnv.SetDefault("debug_level", "warning")
	// nginx configuration
	mythicEnv.SetDefault("nginx_port", 7443)
	mythicEnv.SetDefault("nginx_host", "mythic_nginx")
	mythicEnv.SetDefault("nginx_bind_localhost_only", false)
	mythicEnv.SetDefault("nginx_use_ssl", true)
	mythicEnv.SetDefault("nginx_use_ipv4", true)
	mythicEnv.SetDefault("nginx_use_ipv6", true)
	mythicEnv.SetDefault("nginx_bind_local_mount", true)
	// mythic react UI configuration
	mythicEnv.SetDefault("mythic_react_host", "mythic_react")
	mythicEnv.SetDefault("mythic_react_port", 3000)
	mythicEnv.SetDefault("mythic_react_bind_localhost_only", true)
	mythicEnv.SetDefault("mythic_react_local_mount", true)
	// documentation configuration
	mythicEnv.SetDefault("documentation_host", "mythic_documentation")
	mythicEnv.SetDefault("documentation_port", 8090)
	mythicEnv.SetDefault("documentation_bind_localhost_only", true)
	mythicEnv.SetDefault("documentation_bind_local_mount", true)
	// mythic server configuration
	mythicEnv.SetDefault("mythic_debug_agent_message", false)
	mythicEnv.SetDefault("mythic_server_port", 17443)
	mythicEnv.SetDefault("mythic_server_grpc_port", 17444)
	mythicEnv.SetDefault("mythic_server_host", "mythic_server")
	mythicEnv.SetDefault("mythic_server_bind_localhost_only", true)
	mythicEnv.SetDefault("mythic_server_cpus", "2")
	mythicEnv.SetDefault("mythic_server_mem_limit", "")
	mythicEnv.SetDefault("mythic_server_dynamic_ports", "7000-7010")
	mythicEnv.SetDefault("mythic_server_dynamic_ports_bind_localhost_only", false)
	mythicEnv.SetDefault("mythic_server_bind_local_mount", true)
	mythicEnv.SetDefault("mythic_server_command", "")
	mythicEnv.SetDefault("mythic_sync_cpus", "2")
	mythicEnv.SetDefault("mythic_sync_mem_limit", "")
	// postgres configuration
	mythicEnv.SetDefault("postgres_host", "mythic_postgres")
	mythicEnv.SetDefault("postgres_port", 5432)
	mythicEnv.SetDefault("postgres_bind_localhost_only", true)
	mythicEnv.SetDefault("postgres_db", "mythic_db")
	mythicEnv.SetDefault("postgres_user", "mythic_user")
	mythicEnv.SetDefault("postgres_password", utils.GenerateRandomPassword(30))
	mythicEnv.SetDefault("postgres_cpus", "2")
	mythicEnv.SetDefault("postgres_mem_limit", "")
	mythicEnv.SetDefault("postgres_bind_local_mount", true)
	// rabbitmq configuration
	mythicEnv.SetDefault("rabbitmq_host", "mythic_rabbitmq")
	mythicEnv.SetDefault("rabbitmq_port", 5672)
	mythicEnv.SetDefault("rabbitmq_bind_localhost_only", true)
	mythicEnv.SetDefault("rabbitmq_user", "mythic_user")
	mythicEnv.SetDefault("rabbitmq_password", utils.GenerateRandomPassword(30))
	mythicEnv.SetDefault("rabbitmq_vhost", "mythic_vhost")
	mythicEnv.SetDefault("rabbitmq_cpus", "2")
	mythicEnv.SetDefault("rabbitmq_mem_limit", "")
	mythicEnv.SetDefault("rabbitmq_bind_local_mount", true)
	// jwt configuration
	mythicEnv.SetDefault("jwt_secret", utils.GenerateRandomPassword(30))
	// hasura configuration
	mythicEnv.SetDefault("hasura_host", "mythic_graphql")
	mythicEnv.SetDefault("hasura_port", 8080)
	mythicEnv.SetDefault("hasura_bind_localhost_only", true)
	mythicEnv.SetDefault("hasura_secret", utils.GenerateRandomPassword(30))
	mythicEnv.SetDefault("hasura_cpus", "2")
	mythicEnv.SetDefault("hasura_mem_limit", "2gb")
	mythicEnv.SetDefault("hasura_bind_local_mount", true)
	// docker-compose configuration
	mythicEnv.SetDefault("COMPOSE_PROJECT_NAME", "mythic")
	mythicEnv.SetDefault("REBUILD_ON_START", true)
	// Mythic instance configuration
	mythicEnv.SetDefault("mythic_admin_user", "mythic_admin")
	mythicEnv.SetDefault("mythic_admin_password", utils.GenerateRandomPassword(30))
	mythicEnv.SetDefault("default_operation_name", "Operation Chimera")
	mythicEnv.SetDefault("allowed_ip_blocks", "0.0.0.0/0,::/0")
	mythicEnv.SetDefault("default_operation_webhook_url", "")
	mythicEnv.SetDefault("default_operation_webhook_channel", "")
	// jupyter configuration
	mythicEnv.SetDefault("jupyter_port", 8888)
	mythicEnv.SetDefault("jupyter_host", "mythic_jupyter")
	mythicEnv.SetDefault("jupyter_token", "mythic")
	mythicEnv.SetDefault("jupyter_cpus", "2")
	mythicEnv.SetDefault("jupyter_mem_limit", "")
	mythicEnv.SetDefault("jupyter_bind_localhost_only", true)
	mythicEnv.SetDefault("jupyter_bind_local_mount", true)
	// debugging help
	mythicEnv.SetDefault("postgres_debug", false)
	mythicEnv.SetDefault("mythic_react_debug", false)
	// installed service configuration
	mythicEnv.SetDefault("installed_service_cpus", "1")
	mythicEnv.SetDefault("installed_service_mem_limit", "")
	mythicEnv.SetDefault("webhook_default_url", "")
	mythicEnv.SetDefault("webhook_default_callback_channel", "")
	mythicEnv.SetDefault("webhook_default_feedback_channel", "")
	mythicEnv.SetDefault("webhook_default_startup_channel", "")
	mythicEnv.SetDefault("webhook_default_alert_channel", "")
	mythicEnv.SetDefault("webhook_default_custom_channel", "")

}
func parseMythicEnvironmentVariables() {
	setMythicConfigDefaultValues()
	mythicEnv.SetConfigName(".env")
	mythicEnv.SetConfigType("env")
	mythicEnv.AddConfigPath(utils.GetCwdFromExe())
	mythicEnv.AutomaticEnv()
	if !utils.FileExists(filepath.Join(utils.GetCwdFromExe(), ".env")) {
		_, err := os.Create(filepath.Join(utils.GetCwdFromExe(), ".env"))
		if err != nil {
			log.Fatalf("[-] .env doesn't exist and couldn't be created\n")
		}
	}
	if err := mythicEnv.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in .env file: %s\n", err)
		} else {
			log.Fatalf("[-]Error while parsing .env file: %s\n", err)
		}
	}
	portChecks := map[string][]string{
		"MYTHIC_SERVER_HOST": {
			"MYTHIC_SERVER_PORT",
			"mythic_server",
		},
		"POSTGRES_HOST": {
			"POSTGRES_PORT",
			"mythic_postgres",
		},
		"HASURA_HOST": {
			"HASURA_PORT",
			"mythic_graphql",
		},
		"RABBITMQ_HOST": {
			"RABBITMQ_PORT",
			"mythic_rabbitmq",
		},
		"DOCUMENTATION_HOST": {
			"DOCUMENTATION_PORT",
			"mythic_documentation",
		},
		"NGINX_HOST": {
			"NGINX_PORT",
			"mythic_nginx",
		},
		"MYTHIC_REACT_HOST": {
			"MYTHIC_REACT_PORT",
			"mythic_react",
		},
		"MYTHIC_JUPYTER_HOST": {
			"MYTHIC_JUPYTER_PORT",
			"mythic_jupyter",
		},
	}
	for key, val := range portChecks {
		if mythicEnv.GetString(key) == "127.0.0.1" {
			mythicEnv.Set(key, val[1])
		}
	}
	writeMythicEnvironmentVariables()
}
func writeMythicEnvironmentVariables() {
	c := mythicEnv.AllSettings()
	// to make it easier to read and look at, get all the keys, sort them, and display variables in order
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	f, err := os.Create(filepath.Join(utils.GetCwdFromExe(), ".env"))
	if err != nil {
		log.Fatalf("[-] Error writing out environment!\n%v", err)
	}
	defer f.Close()
	for _, key := range keys {
		if len(mythicEnv.GetString(key)) == 0 {
			_, err = f.WriteString(fmt.Sprintf("%s=\n", strings.ToUpper(key)))
		} else {
			_, err = f.WriteString(fmt.Sprintf("%s=\"%s\"\n", strings.ToUpper(key), mythicEnv.GetString(key)))
		}

		if err != nil {
			log.Fatalf("[-] Failed to write out environment!\n%v", err)
		}
	}
	return
}
func GetConfigAllStrings() map[string]string {
	c := mythicEnv.AllSettings()
	// to make it easier to read and look at, get all the keys, sort them, and display variables in order
	keys := make([]string, 0)
	for k := range c {
		keys = append(keys, k)
	}
	resultMap := make(map[string]string)
	for _, key := range keys {
		resultMap[key] = mythicEnv.GetString(key)
	}
	return resultMap
}
func GetConfigStrings(args []string) map[string]string {
	resultMap := make(map[string]string)
	for i := 0; i < len(args[0:]); i++ {
		setting := strings.ToLower(args[i])
		val := mythicEnv.GetString(setting)
		if val == "" {
			log.Fatalf("Config variable `%s` not found", setting)
		} else {
			resultMap[setting] = val
		}
	}
	return resultMap
}
func SetConfigStrings(key string, value string) {
	if strings.ToLower(value) == "true" {
		mythicEnv.Set(key, true)
	} else if strings.ToLower(value) == "false" {
		mythicEnv.Set(key, false)
	} else {
		mythicEnv.Set(key, value)
	}
	mythicEnv.Get(key)
	writeMythicEnvironmentVariables()
}
func GetBuildArguments() []string {
	var buildEnv = viper.New()
	buildEnv.SetConfigName("build.env")
	buildEnv.SetConfigType("env")
	buildEnv.AddConfigPath(utils.GetCwdFromExe())
	buildEnv.AutomaticEnv()
	if !utils.FileExists(filepath.Join(utils.GetCwdFromExe(), "build.env")) {
		return []string{}
	}
	if err := buildEnv.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in build.env file: %s\n", err)
		} else {
			log.Fatalf("[-]Error while parsing build.env file: %s\n", err)
		}
	}
	c := buildEnv.AllSettings()
	// to make it easier to read and look at, get all the keys, sort them, and display variables in order
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	var args []string
	for _, key := range keys {
		args = append(args, fmt.Sprintf("%s=%s", strings.ToUpper(key), buildEnv.GetString(key)))
	}
	return args
}

// https://gist.github.com/r0l1/3dcbb0c8f6cfe9c66ab8008f55f8f28b
func AskConfirm(prompt string) bool {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("%s [y/n]: ", prompt)
		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf("[-] Failed to read user input\n")
			return false
		}
		input = strings.ToLower(strings.TrimSpace(input))
		if input == "y" || input == "yes" {
			return true
		} else if input == "n" || input == "no" {
			return false
		}
	}
}

// https://gist.github.com/r0l1/3dcbb0c8f6cfe9c66ab8008f55f8f28b
func AskVariable(prompt string, environmentVariable string) {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("%s: ", prompt)
		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf("[-] Failed to read user input\n")
		}
		input = strings.TrimSpace(input)
		mythicEnv.Set(environmentVariable, input)
		writeMythicEnvironmentVariables()
	}
}
func Initialize() {
	parseMythicEnvironmentVariables()
	writeMythicEnvironmentVariables()
}
