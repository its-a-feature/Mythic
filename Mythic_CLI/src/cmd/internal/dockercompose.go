package internal

import (
	"bufio"
	"context"
	"fmt"
	"log"
	"os"
	"os/exec"
	"path/filepath"
	"sort"
	"strings"

	"github.com/docker/docker/api/types"
	"github.com/docker/docker/client"
	"github.com/spf13/viper"
)

func isServiceRunning(service string) bool {
	cli, err := client.NewClientWithOpts(client.FromEnv, client.WithAPIVersionNegotiation())
	if err != nil {
		log.Fatalf("[-] Failed to get client connection to Docker: %v", err)
	}
	containers, err := cli.ContainerList(context.Background(), types.ContainerListOptions{
		All: true,
	})
	if err != nil {
		log.Fatalf("[-] Failed to get container list from Docker: %v", err)
	}
	if len(containers) > 0 {
		for _, container := range containers {
			if container.Labels["name"] == strings.ToLower(service) {
				return true
			}
		}
	}
	return false
}

func addMythicServiceDockerComposeEntry(service string) {
	var curConfig = viper.New()
	curConfig.SetConfigName("docker-compose")
	curConfig.SetConfigType("yaml")
	curConfig.AddConfigPath(getCwdFromExe())
	if err := curConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in docker-compose file: %s\n", err)
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s\n", err)
		}
	}
	networkInfo := map[string]interface{}{
		"default_network": map[string]interface{}{
			"driver": "bridge",
			"driver_opts": map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			},
			"ipam": map[string]interface{}{
				"config": []map[string]interface{}{
					{
						"subnet": "172.100.0.0/16",
					},
				},
				"driver": "default",
			},
			"labels": []string{
				"mythic_network",
				"default_network",
			},
		},
	}
	if !curConfig.IsSet("networks") {
		// don't blow away changes to the network configuration
		curConfig.Set("networks", networkInfo)
	} else {
		curConfig.Set("networks.default_network.driver_opts", map[string]string{
			"com.docker.network.bridge.name": "mythic_if",
		})
	}

	// adding or setting services in the docker-compose file
	var pStruct map[string]interface{}

	if curConfig.IsSet("services." + strings.ToLower(service)) {
		pStruct = curConfig.GetStringMap("services." + strings.ToLower(service))
		delete(pStruct, "network_mode")
		delete(pStruct, "extra_hosts")
		delete(pStruct, "build")
		pStruct["networks"] = []string{
			"default_network",
		}
	} else {
		pStruct = map[string]interface{}{
			"logging": map[string]interface{}{
				"driver": "json-file",
				"options": map[string]string{
					"max-file": "1",
					"max-size": "10m",
				},
			},
			"restart": "always",
			"labels": map[string]string{
				"name": service,
			},
			"container_name": service,
			"image":          service,
			"networks": []string{
				"default_network",
			},
		}
	}

	switch service {
	case "mythic_postgres":
		pStruct["build"] = map[string]interface{}{
			"context": "./postgres-docker",
			"args":    buildArguments,
		}
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         "pg_isready -d mythic_db -p ${POSTGRES_PORT} -U mythic_user",
			"interval":     "30s",
			"timeout":      "60s",
			"retries":      5,
			"start_period": "20s",
		}
		pStruct["command"] = "postgres -c \"max_connections=100\" -p ${POSTGRES_PORT}"
		pStruct["volumes"] = []string{
			"./postgres-docker/database:/var/lib/postgresql/data",
		}
		if imageExists("mythic_postgres") {
			if mythicEnv.GetBool("postgres_debug") {
				pStruct["volumes"] = []string{
					"./postgres-docker/database:/var/lib/postgresql/data",
					"./postgres-docker/postgres.conf:/var/lib/postgresql/postgresql.conf",
					"./postgres-docker/postgres.conf:/var/lib/postgresql/data/postgresql.conf",
				}
			} else {
				pStruct["volumes"] = []string{
					"./postgres-docker/database:/var/lib/postgresql/data",
				}
			}

		}
		pStruct["cpus"] = mythicEnv.GetInt("POSTGRES_CPUS")
		if mythicEnv.GetBool("postgres_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${POSTGRES_PORT}:${POSTGRES_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${POSTGRES_PORT}:${POSTGRES_PORT}",
			}
		}
		environment := []string{
			"POSTGRES_DB=${POSTGRES_DB}",
			"POSTGRES_USER=${POSTGRES_USER}",
			"POSTGRES_PASSWORD=${POSTGRES_PASSWORD}",
		}
		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		} else {
			pStruct["environment"] = environment
		}
	case "mythic_documentation":
		pStruct["build"] = "./documentation-docker"
		pStruct["build"] = map[string]interface{}{
			"context": "./documentation-docker",
			"args":    buildArguments,
		}
		pStruct["command"] = "server -p ${DOCUMENTATION_PORT}"
		if mythicEnv.GetBool("documentation_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${DOCUMENTATION_PORT}:${DOCUMENTATION_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${DOCUMENTATION_PORT}:${DOCUMENTATION_PORT}",
			}
		}
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         []string{"CMD-SHELL", "wget -nv -t1 -O /dev/null http://127.0.0.1:${DOCUMENTATION_PORT}/docs/"},
			"interval":     "10s",
			"timeout":      "10s",
			"retries":      5,
			"start_period": "10s",
		}
		pStruct["environment"] = []string{
			"DOCUMENTATION_PORT=${DOCUMENTATION_PORT}",
		}
		pStruct["volumes"] = []string{
			"./documentation-docker/:/src",
		}
	case "mythic_graphql":
		pStruct["build"] = map[string]interface{}{
			"context": "./hasura-docker",
			"args":    buildArguments,
		}
		pStruct["cpus"] = mythicEnv.GetInt("HASURA_CPUS")
		environment := []string{
			"HASURA_GRAPHQL_DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}",
			"HASURA_GRAPHQL_METADATA_DATABASE_URL=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}",
			"HASURA_GRAPHQL_ENABLE_CONSOLE=true",
			"HASURA_GRAPHQL_DEV_MODE=false",
			"HASURA_GRAPHQL_ADMIN_SECRET=${HASURA_SECRET}",
			"HASURA_GRAPHQL_INSECURE_SKIP_TLS_VERIFY=true",
			"HASURA_GRAPHQL_SERVER_PORT=${HASURA_PORT}",
			"HASURA_GRAPHQL_METADATA_DIR=/metadata",
			"HASURA_GRAPHQL_LIVE_QUERIES_MULTIPLEXED_REFETCH_INTERVAL=1000",
			"HASURA_GRAPHQL_AUTH_HOOK=http://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/graphql/webhook",
			"MYTHIC_ACTIONS_URL_BASE=http://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/api/v1.4",
			"HASURA_GRAPHQL_CONSOLE_ASSETS_DIR=/srv/console-assets",
		}
		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		} else {
			pStruct["environment"] = environment
		}
		pStruct["volumes"] = []string{
			"./hasura-docker/metadata:/metadata",
		}
		if mythicEnv.GetBool("hasura_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${HASURA_PORT}:${HASURA_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${HASURA_PORT}:${HASURA_PORT}",
			}
		}
	case "mythic_nginx":
		pStruct["build"] = map[string]interface{}{
			"context": "./nginx-docker",
			"args":    buildArguments,
		}
		nginxUseSSL := "ssl"
		if !mythicEnv.GetBool("NGINX_USE_SSL") {
			nginxUseSSL = ""
		}
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         []string{"CMD-SHELL", "curl -k https://127.0.0.1:${NGINX_PORT}"},
			"interval":     "30s",
			"timeout":      "60s",
			"retries":      5,
			"start_period": "15s",
		}
		environment := []string{
			"DOCUMENTATION_HOST=${DOCUMENTATION_HOST}",
			"DOCUMENTATION_PORT=${DOCUMENTATION_PORT}",
			"NGINX_PORT=${NGINX_PORT}",
			"MYTHIC_SERVER_HOST=${MYTHIC_SERVER_HOST}",
			"MYTHIC_SERVER_PORT=${MYTHIC_SERVER_PORT}",
			"HASURA_HOST=${HASURA_HOST}",
			"HASURA_PORT=${HASURA_PORT}",
			"MYTHIC_REACT_HOST=${MYTHIC_REACT_HOST}",
			"MYTHIC_REACT_PORT=${MYTHIC_REACT_PORT}",
			"JUPYTER_HOST=${JUPYTER_HOST}",
			"JUPYTER_PORT=${JUPYTER_PORT}",
			fmt.Sprintf("NGINX_USE_SSL=%s", nginxUseSSL),
		}
		if _, ok := pStruct["environment"]; ok {
			environment = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		}
		var finalNginxEnv []string
		for _, val := range environment {
			if !strings.Contains(val, "NEW_UI") {
				finalNginxEnv = append(finalNginxEnv, val)
			}
		}
		pStruct["environment"] = finalNginxEnv
		pStruct["volumes"] = []string{
			"./nginx-docker/ssl:/etc/ssl/private",
			"./nginx-docker/config:/etc/nginx",
		}
		if mythicEnv.GetBool("nginx_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${NGINX_PORT}:${NGINX_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${NGINX_PORT}:${NGINX_PORT}",
			}
		}
	case "mythic_rabbitmq":
		pStruct["build"] = map[string]interface{}{
			"context": "./rabbitmq-docker",
			"args":    buildArguments,
		}
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         []string{"CMD-SHELL", "rabbitmq-diagnostics -q status && rabbitmq-diagnostics -q check_local_alarms"},
			"interval":     "60s",
			"timeout":      "30s",
			"retries":      5,
			"start_period": "15s",
		}
		pStruct["cpus"] = mythicEnv.GetInt("RABBITMQ_CPUS")
		pStruct["command"] = "/bin/sh -c \"chmod +x /generate_config.sh && /generate_config.sh && rabbitmq-server\""
		if mythicEnv.GetBool("rabbitmq_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${RABBITMQ_PORT}:${RABBITMQ_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${RABBITMQ_PORT}:${RABBITMQ_PORT}",
			}
		}
		environment := []string{
			"RABBITMQ_USER=${RABBITMQ_USER}",
			"RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}",
			"RABBITMQ_VHOST=${RABBITMQ_VHOST}",
			"RABBITMQ_PORT=${RABBITMQ_PORT}",
		}
		if _, ok := pStruct["environment"]; ok {
			environment = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		}
		var finalRabbitEnv []string
		badRabbitMqEnvs := []string{
			"RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}",
			"RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}",
			"RABBITMQ_DEFAULT_VHOST=${RABBITMQ_VHOST}",
		}
		for _, val := range environment {
			if !stringInSlice(val, badRabbitMqEnvs) {
				finalRabbitEnv = append(finalRabbitEnv, val)
			}
		}
		pStruct["environment"] = finalRabbitEnv
		pStruct["volumes"] = []string{
			"./rabbitmq-docker/storage:/var/lib/rabbitmq",
			"./rabbitmq-docker/generate_config.sh:/generate_config.sh",
			"./rabbitmq-docker/rabbitmq.conf:/tmp/base_rabbitmq.conf",
		}
	case "mythic_react":
		pStruct["build"] = map[string]interface{}{
			"context": "./mythic-react-docker",
			"args":    buildArguments,
		}
		if mythicEnv.GetBool("mythic_react_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${MYTHIC_REACT_PORT}:${MYTHIC_REACT_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${MYTHIC_REACT_PORT}:${MYTHIC_REACT_PORT}",
			}
		}
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         []string{"CMD-SHELL", "curl -k http://127.0.0.1:${MYTHIC_REACT_PORT}/new"},
			"interval":     "30s",
			"timeout":      "60s",
			"retries":      3,
			"start_period": "15s",
		}
		pStruct["volumes"] = []string{
			"./mythic-react-docker/config:/etc/nginx",
			"./mythic-react-docker/mythic/public:/mythic/new",
		}
		pStruct["environment"] = []string{
			"MYTHIC_REACT_PORT=${MYTHIC_REACT_PORT}",
		}
	case "mythic_jupyter":
		pStruct["build"] = map[string]interface{}{
			"context": "./jupyter-docker",
			"args":    buildArguments,
		}
		pStruct["command"] = "start.sh jupyter lab --ServerApp.open_browser=false --IdentityProvider.token='mythic' --ServerApp.base_url=\"/jupyter\" --ServerApp.default_url=\"/jupyter\""
		if mythicEnv.GetBool("jupyter_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${JUPYTER_PORT}:${JUPYTER_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${JUPYTER_PORT}:${JUPYTER_PORT}",
			}
		}
		pStruct["volumes"] = []string{
			"./jupyter-docker/jupyter:/projects",
		}
	case "mythic_server":
		pStruct["build"] = map[string]interface{}{
			"context": "./mythic-docker",
			"args":    buildArguments,
		}
		pStruct["volumes"] = []string{
			"./mythic-docker/src:/usr/src/app",
		}
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         "curl -k http://127.0.0.1:${MYTHIC_SERVER_PORT}/health",
			"interval":     "60s",
			"timeout":      "10s",
			"retries":      5,
			"start_period": "20s",
		}
		pStruct["command"] = "${MYTHIC_SERVER_COMMAND}"
		environment := []string{
			"POSTGRES_HOST=${POSTGRES_HOST}",
			"POSTGRES_PORT=${POSTGRES_PORT}",
			"POSTGRES_PASSWORD=${POSTGRES_PASSWORD}",
			"RABBITMQ_HOST=${RABBITMQ_HOST}",
			"RABBITMQ_PORT=${RABBITMQ_PORT}",
			"RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}",
			"JWT_SECRET=${JWT_SECRET}",
			"DEBUG_LEVEL=${DEBUG_LEVEL}",
			"MYTHIC_DEBUG_AGENT_MESSAGE=${MYTHIC_DEBUG_AGENT_MESSAGE}",
			"MYTHIC_ADMIN_PASSWORD=${MYTHIC_ADMIN_PASSWORD}",
			"MYTHIC_ADMIN_USER=${MYTHIC_ADMIN_USER}",
			"MYTHIC_SERVER_PORT=${MYTHIC_SERVER_PORT}",
			"MYTHIC_SERVER_BIND_LOCALHOST_ONLY=${MYTHIC_SERVER_BIND_LOCALHOST_ONLY}",
			"MYTHIC_SERVER_GRPC_PORT=${MYTHIC_SERVER_GRPC_PORT}",
			"ALLOWED_IP_BLOCKS=${ALLOWED_IP_BLOCKS}",
			"DEFAULT_OPERATION_NAME=${DEFAULT_OPERATION_NAME}",
			"NGINX_PORT=${NGINX_PORT}",
			"NGINX_HOST=${NGINX_HOST}",
			"MYTHIC_SERVER_DYNAMIC_PORTS=${MYTHIC_SERVER_DYNAMIC_PORTS}",
		}
		mythicServerPorts := []string{
			"${MYTHIC_SERVER_PORT}:${MYTHIC_SERVER_PORT}",
			"${MYTHIC_SERVER_GRPC_PORT}:${MYTHIC_SERVER_GRPC_PORT}",
		}
		if mythicEnv.GetBool("MYTHIC_SERVER_BIND_LOCALHOST_ONLY") {
			mythicServerPorts = []string{
				"127.0.0.1:${MYTHIC_SERVER_PORT}:${MYTHIC_SERVER_PORT}",
				"127.0.0.1:${MYTHIC_SERVER_GRPC_PORT}:${MYTHIC_SERVER_GRPC_PORT}",
			}
		}
		dynamicPortPieces := strings.Split(mythicEnv.GetString("MYTHIC_SERVER_DYNAMIC_PORTS"), ",")
		for _, val := range dynamicPortPieces {
			mythicServerPorts = append(mythicServerPorts, fmt.Sprintf("%s:%s", val, val))
		}
		pStruct["ports"] = mythicServerPorts
		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		} else {
			pStruct["environment"] = environment
		}
	case "mythic_sync":
		if absPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder, service)); err != nil {
			fmt.Printf("[-] Failed to get abs path for mythic_sync")
			return
		} else {
			pStruct["build"] = map[string]interface{}{
				"context": absPath,
				"args":    buildArguments,
			}
			pStruct["environment"] = []string{
				"MYTHIC_IP=${NGINX_HOST}",
				"MYTHIC_PORT=${NGINX_PORT}",
				"MYTHIC_USERNAME=${MYTHIC_ADMIN_USER}",
				"MYTHIC_PASSWORD=${MYTHIC_ADMIN_PASSWORD}",
				"MYTHIC_API_KEY=${MYTHIC_API_KEY}",
				"GHOSTWRITER_API_KEY=${GHOSTWRITER_API_KEY}",
				"GHOSTWRITER_URL=${GHOSTWRITER_URL}",
				"GHOSTWRITER_OPLOG_ID=${GHOSTWRITER_OPLOG_ID}",
			}
			if !mythicEnv.IsSet("GHOSTWRITER_API_KEY") {
				key := askVariable("Please enter your GhostWriter API Key")
				mythicEnv.Set("GHOSTWRITER_API_KEY", key)
			}
			if !mythicEnv.IsSet("GHOSTWRITER_URL") {
				url := askVariable("Please enter your GhostWriter URL")
				mythicEnv.Set("GHOSTWRITER_URL", url)
			}
			if !mythicEnv.IsSet("GHOSTWRITER_OPLOG_ID") {
				gwID := askVariable("Please enter your GhostWriter OpLog ID")
				mythicEnv.Set("GHOSTWRITER_OPLOG_ID", gwID)
			}
			if !mythicEnv.IsSet("MYTHIC_API_KEY") {
				mythicID := askVariable("Please enter your Mythic API Key (optional)")
				mythicEnv.Set("MYTHIC_API_KEY", mythicID)
			}
			// just got new variables, need to update our .env
			writeMythicEnvironmentVariables()
		}

	case "mythic_grafana":
		pStruct["build"] = map[string]interface{}{
			"context": "./grafana-docker",
			"args":    buildArguments,
		}
		pStruct["ports"] = []string{
			"127.0.0.1:3000:3000",
		}
		pStruct["volumes"] = []string{
			"./grafana-docker/storage:/var/lib/grafana",
		}
		pStruct["user"] = "root"
	case "mythic_prometheus":
		pStruct["build"] = map[string]interface{}{
			"context": "./prometheus-docker",
			"args":    buildArguments,
		}
		pStruct["ports"] = []string{
			"127.0.0.1:9090:9090",
		}
		pStruct["volumes"] = []string{
			"./prometheus-docker/prometheus.yml:/etc/prometheus/prometheus.yml:ro",
		}
	case "mythic_postgres_exporter":
		pStruct["build"] = map[string]interface{}{
			"context": "./postgres-exporter-docker",
			"args":    buildArguments,
		}
		pStruct["ports"] = []string{
			"127.0.0.1:9187:9187",
		}
		pStruct["volumes"] = []string{
			"./postgres-exporter-docker/queries.yaml:/queries.yaml",
		}
		pStruct["links"] = []string{
			"mythic_postgres",
			"mythic_prometheus",
		}
		pStruct["environment"] = []string{
			"DATA_SOURCE_NAME=postgres://${POSTGRES_USER}:${POSTGRES_PASSWORD}@${POSTGRES_HOST}:${POSTGRES_PORT}/${POSTGRES_DB}?sslmode=disable",
		}
		pStruct["command"] = "--extend.query-path=/queries.yaml"
	}
	if !curConfig.IsSet("services." + strings.ToLower(service)) {
		curConfig.Set("services."+strings.ToLower(service), pStruct)
		fmt.Printf("[+] Added %s to docker-compose\n", strings.ToLower(service))
	} else {
		curConfig.Set("services."+strings.ToLower(service), pStruct)
	}

	if !curConfig.IsSet("networks") {
		curConfig.Set("networks", networkInfo)
	} else {
		curConfig.Set("networks.default_network.driver_opts", map[string]string{
			"com.docker.network.bridge.name": "mythic_if",
		})
	}
	curConfig.Set("version", "2.4")
	curConfig.WriteConfig()
}
func removeMythicServiceDockerComposeEntry(service string) {
	var curConfig = viper.New()
	curConfig.SetConfigName("docker-compose")
	curConfig.SetConfigType("yaml")
	curConfig.AddConfigPath(getCwdFromExe())
	if err := curConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in docker-compose file: %s\n", err)
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s\n", err)
		}
	}
	networkInfo := map[string]interface{}{
		"default_network": map[string]interface{}{
			"driver": "bridge",
			"driver_opts": map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			},
			"ipam": map[string]interface{}{
				"config": []map[string]interface{}{
					{
						"subnet": "172.100.0.0/16",
					},
				},
				"driver": "default",
			},
			"labels": []string{
				"mythic_network",
				"default_network",
			},
		},
	}
	if !curConfig.IsSet("networks") {
		// don't blow away changes to the network configuration
		curConfig.Set("networks", networkInfo)
	} else {
		curConfig.Set("networks.default_network.driver_opts", map[string]string{
			"com.docker.network.bridge.name": "mythic_if",
		})
	}

	if isServiceRunning(service) {
		DockerStop([]string{strings.ToLower(service)})
	}
	if curConfig.IsSet("services." + strings.ToLower(service)) {
		delete(curConfig.Get("services").(map[string]interface{}), strings.ToLower(service))
		fmt.Printf("[+] Removed %s from docker-compose because it's running on a different host\n", strings.ToLower(service))
	}
	if !curConfig.IsSet("networks") {
		curConfig.Set("networks", networkInfo)
	} else {
		curConfig.Set("networks.default_network.driver_opts", map[string]string{
			"com.docker.network.bridge.name": "mythic_if",
		})
	}
	curConfig.Set("version", "2.4")
	curConfig.WriteConfig()
}

func AddDockerComposeEntry(service string, additionalConfigs map[string]interface{}) error {
	// add c2/payload [name] as type [group] to the main yaml file
	var curConfig = viper.New()
	curConfig.SetConfigName("docker-compose")
	curConfig.SetConfigType("yaml")
	curConfig.AddConfigPath(getCwdFromExe())
	if err := curConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in docker-compose file: %s", err)
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s", err)
		}
	}
	networkInfo := map[string]interface{}{
		"default_network": map[string]interface{}{
			"driver": "bridge",
			"driver_opts": map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			},
			"ipam": map[string]interface{}{
				"config": []map[string]interface{}{
					{
						"subnet": "172.100.0.0/16",
					},
				},
				"driver": "default",
			},
			"labels": []string{
				"mythic_network",
				"default_network",
			},
		},
	}
	if !curConfig.IsSet("networks") {
		curConfig.Set("networks", networkInfo)
	} else {
		curConfig.Set("networks.default_network.driver_opts", map[string]string{
			"com.docker.network.bridge.name": "mythic_if",
		})
	}
	if absPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder, service)); err != nil {
		fmt.Printf("[-] Failed to get the absolute path to the %s folder, does the folder exist?", InstalledServicesFolder)
		fmt.Printf("[*] If the service doesn't exist, you might need to install with 'mythic-cli install'")
		os.Exit(1)
	} else if !dirExists(absPath) {
		fmt.Printf("[-] %s does not exist, not adding to Mythic\n", absPath)
		os.Exit(1)
	} else {
		pStruct := map[string]interface{}{
			"labels": map[string]string{
				"name": service,
			},
			"image":    strings.ToLower(service),
			"hostname": service,
			"logging": map[string]interface{}{
				"driver": "json-file",
				"options": map[string]string{
					"max-file": "1",
					"max-size": "10m",
				},
			},
			"restart": "always",
			"volumes": []string{
				absPath + ":/Mythic/",
			},
			"container_name": strings.ToLower(service),
			//"networks": []string{
			//	"default_network",
			//},
			"cpus": mythicEnv.GetInt("INSTALLED_SERVICE_CPUS"),
		}
		for key, element := range additionalConfigs {
			pStruct[key] = element
		}
		pStruct["build"] = map[string]interface{}{
			"context": absPath,
			"args":    buildArguments,
		}
		pStruct["network_mode"] = "host"
		pStruct["extra_hosts"] = []string{
			"mythic_server:127.0.0.1",
			"mythic_rabbitmq:127.0.0.1",
		}
		environment := []string{
			"MYTHIC_ADDRESS=http://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/api/v1.4/agent_message",
			"MYTHIC_WEBSOCKET=ws://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/ws/agent_message",
			"RABBITMQ_USER=${RABBITMQ_USER}",
			"RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}",
			"RABBITMQ_PORT=${RABBITMQ_PORT}",
			"RABBITMQ_HOST=${RABBITMQ_HOST}",
			"MYTHIC_SERVER_HOST=${MYTHIC_SERVER_HOST}",
			"MYTHIC_SERVER_PORT=${MYTHIC_SERVER_PORT}",
			"MYTHIC_SERVER_GRPC_PORT=${MYTHIC_SERVER_GRPC_PORT}",
			"DEBUG_LEVEL=${DEBUG_LEVEL}",
		}
		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		} else {
			pStruct["environment"] = environment
		}
		curConfig.Set("services."+strings.ToLower(service), pStruct)
		if !curConfig.IsSet("networks") {
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}
		curConfig.Set("version", "2.4")
		curConfig.WriteConfig()
		fmt.Println("[+] Successfully updated docker-compose.yml")
	}
	return nil
}
func RemoveDockerComposeEntry(service string) error {
	// add c2/payload [name] as type [group] to the main yaml file
	var curConfig = viper.New()
	curConfig.SetConfigName("docker-compose")
	curConfig.SetConfigType("yaml")
	curConfig.AddConfigPath(getCwdFromExe())
	if err := curConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in docker-compose file: %s", err)
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s", err)
		}
	}
	networkInfo := map[string]interface{}{
		"default_network": map[string]interface{}{
			"driver": "bridge",
			"driver_opts": map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			},
			"ipam": map[string]interface{}{
				"config": []map[string]interface{}{
					{
						"subnet": "172.100.0.0/16",
					},
				},
				"driver": "default",
			},
			"labels": []string{
				"mythic_network",
				"default_network",
			},
		},
	}

	if !stringInSlice(service, MythicPossibleServices) {
		if isServiceRunning(service) {
			DockerStop([]string{strings.ToLower(service)})
		}
		delete(curConfig.Get("services").(map[string]interface{}), strings.ToLower(service))
		fmt.Printf("[+] Removed %s from docker-compose\n", strings.ToLower(service))

	}
	if !curConfig.IsSet("networks") {
		curConfig.Set("networks", networkInfo)
	} else {
		curConfig.Set("networks.default_network.driver_opts", map[string]string{
			"com.docker.network.bridge.name": "mythic_if",
		})
	}
	curConfig.Set("version", "2.4")
	curConfig.WriteConfig()
	fmt.Println("[+] Successfully updated docker-compose.yml")
	return nil
}

func runDockerCompose(args []string) error {
	lookPath, err := exec.LookPath("docker-compose")
	if err != nil {
		lookPath, err = exec.LookPath("docker")
		if err != nil {
			log.Fatalf("[-] docker-compose and docker are not installed or available in the current PATH")
		} else {
			// adjust the current args for docker compose subcommand
			args = append([]string{"compose"}, args...)
		}
	}
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get lookPath to current executable")
	}
	exePath := filepath.Dir(exe)
	command := exec.Command(lookPath, args...)
	command.Dir = exePath
	command.Env = getMythicEnvList()

	stdout, err := command.StdoutPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stdout pipe for running docker-compose")
	}
	stderr, err := command.StderrPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stderr pipe for running docker-compose")
	}

	stdoutScanner := bufio.NewScanner(stdout)
	stderrScanner := bufio.NewScanner(stderr)
	go func() {
		for stdoutScanner.Scan() {
			fmt.Printf("%s\n", stdoutScanner.Text())
		}
	}()
	go func() {
		for stderrScanner.Scan() {
			fmt.Printf("%s\n", stderrScanner.Text())
		}
	}()
	err = command.Start()
	if err != nil {
		log.Fatalf("[-] Error trying to start docker-compose: %v\n", err)
	}
	err = command.Wait()
	if err != nil {
		fmt.Printf("[-] Error from docker-compose: %v\n", err)
		return err
	}
	return nil
}
func GetAllExistingNonMythicServiceNames() ([]string, error) {
	// get all services that exist within the loaded config
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(getCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Printf("[-] Error while reading in docker-compose file: %s", err)
			return []string{}, err
		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s", err)
			return []string{}, err
		}
	}
	servicesSub := groupNameConfig.Sub("services")
	services := servicesSub.AllSettings()
	containerList := []string{}
	for service := range services {
		if !stringInSlice(service, MythicPossibleServices) {
			containerList = append(containerList, service)
		}
	}
	return containerList, nil
}
func GetCurrentMythicServiceNames() ([]string, error) {
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(getCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Printf("[-] Error while reading in docker-compose file: %s", err)
			return []string{}, err
		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s", err)
			return []string{}, err
		}
	}
	servicesSub := groupNameConfig.Sub("services")
	services := servicesSub.AllSettings()
	containerList := []string{}
	for service := range services {
		if stringInSlice(service, MythicPossibleServices) {
			containerList = append(containerList, service)
		}
	}
	return containerList, nil
}

func getBuildArguments() []string {
	var buildEnv = viper.New()
	buildEnv.SetConfigName("build.env")
	buildEnv.SetConfigType("env")
	buildEnv.AddConfigPath(getCwdFromExe())
	buildEnv.AutomaticEnv()
	if !fileExists(filepath.Join(getCwdFromExe(), "build.env")) {
		fmt.Printf("[*] No build.env file detected in Mythic's root directory; not supplying build arguments to docker containers\n")
		fmt.Printf("    If you need to supply build arguments to docker containers, create build.env and supply key=value entries there\n")
		return []string{}
	}
	if err := buildEnv.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			log.Fatalf("[-] Error while reading in build.env file: %s", err)
		} else {
			log.Fatalf("[-]Error while parsing build.env file: %s", err)
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
func getMythicEnvList() []string {
	env := mythicEnv.AllSettings()
	var envList []string
	for key := range env {
		val := mythicEnv.GetString(key)
		if val != "" {
			// prevent trying to append arrays or dictionaries to our environment list
			//fmt.Println(strings.ToUpper(key), val)
			envList = append(envList, strings.ToUpper(key)+"="+val)
		}
	}
	envList = append(envList, os.Environ()...)
	return envList
}

func CheckDockerCompose() {
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(getCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			if _, err := os.Create("docker-compose.yml"); err != nil {
				fmt.Printf("[-] Failed to create docker-compose.yml file: %v\n", err)
				os.Exit(1)
			} else {
				if err := groupNameConfig.ReadInConfig(); err != nil {
					fmt.Printf("[-] Failed to read in new docker-compose.yml file: %v\n", err)
					os.Exit(1)
				} else {
					fmt.Printf("[+] Successfully created new docker-compose.yml file. Populating it now...\n")
					intendedMythicContainers, _ := GetIntendedMythicServiceNames()
					for _, container := range intendedMythicContainers {
						addMythicServiceDockerComposeEntry(container)
					}
					return
				}
			}

		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s", err)
			os.Exit(1)
		}
	}
	servicesSub := groupNameConfig.Sub("services")
	if servicesSub == nil {
		intendedMythicContainers, _ := GetIntendedMythicServiceNames()
		for _, container := range intendedMythicContainers {
			addMythicServiceDockerComposeEntry(container)
		}
	}
}
