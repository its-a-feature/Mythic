package internal

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"github.com/spf13/viper"
)

var mythicEnv = viper.New()

func setMythicConfigDefaultValues() {
	// nginx configuration
	mythicEnv.SetDefault("nginx_port", 7443)
	mythicEnv.SetDefault("nginx_host", "mythic_nginx")
	mythicEnv.SetDefault("nginx_bind_localhost_only", false)
	mythicEnv.SetDefault("nginx_use_ssl", true)
	// mythic react UI configuration
	mythicEnv.SetDefault("mythic_react_host", "mythic_react")
	mythicEnv.SetDefault("mythic_react_port", 3000)
	mythicEnv.SetDefault("mythic_react_bind_localhost_only", true)
	// mythic server configuration
	mythicEnv.SetDefault("documentation_host", "mythic_documentation")
	mythicEnv.SetDefault("documentation_port", 8090)
	mythicEnv.SetDefault("documentation_bind_localhost_only", true)
	mythicEnv.SetDefault("debug_level", "warning")
	mythicEnv.SetDefault("mythic_debug_agent_message", false)
	mythicEnv.SetDefault("mythic_server_port", 17443)
	mythicEnv.SetDefault("mythic_server_grpc_port", 17444)
	mythicEnv.SetDefault("mythic_server_host", "mythic_server")
	mythicEnv.SetDefault("mythic_server_bind_localhost_only", true)
	mythicEnv.SetDefault("mythic_server_cpus", "2")
	mythicEnv.SetDefault("mythic_server_dynamic_ports", "7000-7010")
	mythicEnv.SetDefault("mythic_server_command", "")
	mythicEnv.SetDefault("mythic_sync_cpus", "2")
	// postgres configuration
	mythicEnv.SetDefault("postgres_host", "mythic_postgres")
	mythicEnv.SetDefault("postgres_port", 5432)
	mythicEnv.SetDefault("postgres_bind_localhost_only", true)
	mythicEnv.SetDefault("postgres_db", "mythic_db")
	mythicEnv.SetDefault("postgres_user", "mythic_user")
	mythicEnv.SetDefault("postgres_password", generateRandomPassword(30))
	mythicEnv.SetDefault("postgres_cpus", "2")
	// rabbitmq configuration
	mythicEnv.SetDefault("rabbitmq_host", "mythic_rabbitmq")
	mythicEnv.SetDefault("rabbitmq_port", 5672)
	mythicEnv.SetDefault("rabbitmq_bind_localhost_only", true)
	mythicEnv.SetDefault("rabbitmq_user", "mythic_user")
	mythicEnv.SetDefault("rabbitmq_password", generateRandomPassword(30))
	mythicEnv.SetDefault("rabbitmq_vhost", "mythic_vhost")
	mythicEnv.SetDefault("rabbitmq_cpus", "2")
	// jwt configuration
	mythicEnv.SetDefault("jwt_secret", generateRandomPassword(30))
	// hasura configuration
	mythicEnv.SetDefault("hasura_host", "mythic_graphql")
	mythicEnv.SetDefault("hasura_port", 8080)
	mythicEnv.SetDefault("hasura_bind_localhost_only", true)
	mythicEnv.SetDefault("hasura_secret", generateRandomPassword(30))
	mythicEnv.SetDefault("hasura_cpus", "2")
	// docker-compose configuration
	mythicEnv.SetDefault("COMPOSE_PROJECT_NAME", "mythic")
	mythicEnv.SetDefault("REBUILD_ON_START", true)
	// Mythic instance configuration
	mythicEnv.SetDefault("mythic_admin_user", "mythic_admin")
	mythicEnv.SetDefault("mythic_admin_password", generateRandomPassword(30))
	mythicEnv.SetDefault("default_operation_name", "Operation Chimera")
	mythicEnv.SetDefault("allowed_ip_blocks", "0.0.0.0/0,::/0")
	mythicEnv.SetDefault("default_operation_webhook_url", "")
	mythicEnv.SetDefault("default_operation_webhook_channel", "")
	// jupyter configuration
	mythicEnv.SetDefault("jupyter_port", 8888)
	mythicEnv.SetDefault("jupyter_host", "mythic_jupyter")
	mythicEnv.SetDefault("jupyter_token", "mythic")
	mythicEnv.SetDefault("jupyter_cpus", "2")
	mythicEnv.SetDefault("jupyter_bind_localhost_only", true)
	// mlflow configuration
	mythicEnv.SetDefault("mlflow_port", 5000)
	mythicEnv.SetDefault("mlflow_host", "mythic_mlflow")
	mythicEnv.SetDefault("mlflow_cpus", "2")
	mythicEnv.SetDefault("mlflow_bind_localhost_only", true)
	// debugging help
	mythicEnv.SetDefault("postgres_debug", false)
	mythicEnv.SetDefault("mythic_react_debug", false)
	// installed service configuration
	mythicEnv.SetDefault("installed_service_cpus", "1")
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
	mythicEnv.AddConfigPath(getCwdFromExe())
	mythicEnv.AutomaticEnv()
	if !fileExists(filepath.Join(getCwdFromExe(), ".env")) {
		_, err := os.Create(filepath.Join(getCwdFromExe(), ".env"))
		if err != nil {
			log.Fatalf("[-] .env doesn't exist and couldn't be created")
		}
	}
	if err := mythicEnv.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in .env file: %s", err)
		} else {
			log.Fatalf("[-]Error while parsing .env file: %s", err)
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
		"MYTHIC_MLFLOW_HOST": {
			"MYTHIC_MLFLOW_PORT",
			"mythic_mlflow",
		},
	}
	for key, val := range portChecks {
		if mythicEnv.GetString(key) == "127.0.0.1" {
			mythicEnv.Set(key, val[1])
		}
	}
	writeMythicEnvironmentVariables()
	/*
		if !mythicEnv.GetBool("postgres_debug") {
			// update the MythicPossibleServices to not include the two debugging services of grafana and postgres_exporter
			MythicPossibleServices = []string{
				"mythic_postgres",
				"mythic_react",
				"mythic_server",
				"mythic_nginx",
				"mythic_rabbitmq",
				"mythic_graphql",
				"mythic_documentation",
				"mythic_jupyter",
				"mythic_sync",
			}
		}

	*/
}
func writeMythicEnvironmentVariables() {
	c := mythicEnv.AllSettings()
	// to make it easier to read and look at, get all the keys, sort them, and display variables in order
	keys := make([]string, 0, len(c))
	for k := range c {
		keys = append(keys, k)
	}
	sort.Strings(keys)
	f, err := os.Create(filepath.Join(getCwdFromExe(), ".env"))
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
func Initialize() {
	parseMythicEnvironmentVariables()
	writeMythicEnvironmentVariables()
	CheckDockerCompose()
}
