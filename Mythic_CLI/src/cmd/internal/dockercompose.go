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
	"sync"

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
	/*
		networkInfo := map[string]interface{}{
			"default_network": map[string]interface{}{
				"driver": "bridge",
				"driver_opts": map[string]string{
					"com.docker.network.bridge.name": "mythic_if",
				},
				"labels": []string{
					"mythic_network",
					"default_network",
				},
			},
		}
		if !curConfig.InConfig("networks") {
			// don't blow away changes to the network configuration
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/
	volumes := map[string]interface{}{}
	if curConfig.InConfig("volumes") {
		volumes = curConfig.GetStringMap("volumes")
	}

	// adding or setting services in the docker-compose file
	var pStruct map[string]interface{}

	if curConfig.InConfig("services." + strings.ToLower(service)) {
		pStruct = curConfig.GetStringMap("services." + strings.ToLower(service))
		delete(pStruct, "network_mode")
		delete(pStruct, "extra_hosts")
		delete(pStruct, "build")
		delete(pStruct, "networks")
		/*
			pStruct["networks"] = []string{
				"default_network",
			}

		*/
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
			/*
				"networks": []string{
					"default_network",
				},

			*/
		}
	}

	switch service {
	case "mythic_postgres":
		pStruct["build"] = map[string]interface{}{
			"context": "./postgres-docker",
			"args":    buildArguments,
		}
		/*
			pStruct["healthcheck"] = map[string]interface{}{
				"test":         "pg_isready -d mythic_db -p ${POSTGRES_PORT} -U mythic_user",
				"interval":     "30s",
				"timeout":      "60s",
				"retries":      5,
				"start_period": "20s",
			}

		*/
		//pStruct["command"] = "postgres -c \"max_connections=100\" -p ${POSTGRES_PORT} -c config_file=/etc/postgres.conf"
		if mythicEnv.GetBool("postgres_bind_local_mount") {
			pStruct["volumes"] = []string{
				"./postgres-docker/database:/var/lib/postgresql/data",
				"./postgres-docker/postgres.conf:/etc/postgresql.conf",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_postgres_volume:/var/lib/postgresql/data",
			}

		}

		if imageExists("mythic_postgres") {
			if mythicEnv.GetBool("postgres_debug") {
				pStruct["volumes"] = []string{
					"./postgres-docker/database:/var/lib/postgresql/data",
					"./postgres-docker/postgres_debug.conf:/etc/postgresql.conf",
				}
			}
		}
		pStruct["cpus"] = mythicEnv.GetInt("POSTGRES_CPUS")
		if mythicEnv.GetString("postgres_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("postgres_mem_limit")
		}
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
		if _, ok := volumes["mythic_postgres"]; !ok {
			volumes["mythic_postgres_volume"] = map[string]interface{}{
				"name": "mythic_postgres_volume",
			}
		}
	case "mythic_documentation":
		pStruct["build"] = "./documentation-docker"
		pStruct["build"] = map[string]interface{}{
			"context": "./documentation-docker",
			"args":    buildArguments,
		}
		//pStruct["command"] = "server -p ${DOCUMENTATION_PORT}"
		if mythicEnv.GetBool("documentation_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${DOCUMENTATION_PORT}:${DOCUMENTATION_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${DOCUMENTATION_PORT}:${DOCUMENTATION_PORT}",
			}
		}
		/*
			pStruct["healthcheck"] = map[string]interface{}{
				"test":         "wget -nv -t1 -O /dev/null http://127.0.0.1:${DOCUMENTATION_PORT}/docs/",
				"interval":     "10s",
				"timeout":      "10s",
				"retries":      5,
				"start_period": "10s",
			}

		*/
		pStruct["environment"] = []string{
			"DOCUMENTATION_PORT=${DOCUMENTATION_PORT}",
		}
		if mythicEnv.GetBool("documentation_bind_local_mount") {
			pStruct["volumes"] = []string{
				"./documentation-docker/:/src",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_documentation_volume:/usr/src/app",
			}
		}
		if _, ok := volumes["mythic_documentation"]; !ok {
			volumes["mythic_documentation_volume"] = map[string]interface{}{
				"name": "mythic_documentation_volume",
			}
		}

	case "mythic_graphql":
		pStruct["build"] = map[string]interface{}{
			"context": "./hasura-docker",
			"args":    buildArguments,
		}
		pStruct["cpus"] = mythicEnv.GetInt("HASURA_CPUS")
		if mythicEnv.GetString("hasura_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("hasura_mem_limit")
		}
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
		pStruct["healthcheck"] = map[string]interface{}{
			"test":         "curl -k https://127.0.0.1:${NGINX_PORT}/new/login",
			"interval":     "30s",
			"timeout":      "60s",
			"retries":      5,
			"start_period": "15s",
		}
		nginxUseSSL := "ssl"
		if !mythicEnv.GetBool("NGINX_USE_SSL") {
			nginxUseSSL = ""
			pStruct["healthcheck"] = map[string]interface{}{
				"test":         "curl http://127.0.0.1:${NGINX_PORT}/new/login",
				"interval":     "30s",
				"timeout":      "60s",
				"retries":      5,
				"start_period": "15s",
			}
		}
		nginxUseIPV4 := ""
		if !mythicEnv.GetBool("NGINX_USE_IPV4") {
			nginxUseIPV4 = "#"
		}
		nginxUseIPV6 := ""
		if !mythicEnv.GetBool("NGINX_USE_IPV6") {
			nginxUseIPV6 = "#"
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
			fmt.Sprintf("NGINX_USE_IPV4=%s", nginxUseIPV4),
			fmt.Sprintf("NGINX_USE_IPV6=%s", nginxUseIPV6),
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
		/*
			pStruct["healthcheck"] = map[string]interface{}{
				"test":         "rabbitmq-diagnostics -q check_port_connectivity",
				"interval":     "60s",
				"timeout":      "30s",
				"retries":      5,
				"start_period": "15s",
			}

		*/
		pStruct["cpus"] = mythicEnv.GetInt("RABBITMQ_CPUS")
		if mythicEnv.GetString("rabbitmq_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("rabbitmq_mem_limit")
		}
		//pStruct["command"] = "/bin/sh -c \"chmod +x /generate_config.sh && /generate_config.sh && rabbitmq-server\""
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
		if mythicEnv.GetBool("rabbitmq_bind_local_mount") {
			pStruct["volumes"] = []string{
				"./rabbitmq-docker/storage:/var/lib/rabbitmq",
				"./rabbitmq-docker/generate_config.sh:/generate_config.sh",
				"./rabbitmq-docker/rabbitmq.conf:/tmp/base_rabbitmq.conf",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_rabbitmq_volume:/var/lib/rabbitmq",
			}
		}
		if _, ok := volumes["mythic_rabbitmq"]; !ok {
			volumes["mythic_rabbitmq_volume"] = map[string]interface{}{
				"name": "mythic_rabbitmq_volume",
			}
		}

	case "mythic_react":
		if mythicEnv.GetBool("mythic_react_debug") {
			pStruct["build"] = map[string]interface{}{
				"context": "./MythicReactUI",
				"args":    buildArguments,
			}
			pStruct["volumes"] = []string{
				"./MythicReactUI/src:/app/src",
				"./MythicReactUI/public:/app/public",
				"./MythicReactUI/package.json:/app/package.json",
				"./MythicReactUI/package-lock.json:/app/package-lock.json",
				"./mythic-react-docker/mythic/public:/app/build",
			}
		} else {
			pStruct["build"] = map[string]interface{}{
				"context": "./mythic-react-docker",
				"args":    buildArguments,
			}
			pStruct["volumes"] = []string{
				"./mythic-react-docker/config:/etc/nginx",
				"./mythic-react-docker/mythic/public:/mythic/new",
			}
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
			"test":         "wget -SqO - http://127.0.0.1:${MYTHIC_REACT_PORT}/new",
			"interval":     "30s",
			"timeout":      "60s",
			"retries":      3,
			"start_period": "15s",
		}
		pStruct["environment"] = []string{
			"MYTHIC_REACT_PORT=${MYTHIC_REACT_PORT}",
		}
	case "mythic_jupyter":
		pStruct["build"] = map[string]interface{}{
			"context": "./jupyter-docker",
			"args":    buildArguments,
		}
		pStruct["cpus"] = mythicEnv.GetInt("JUPYTER_CPUS")
		if mythicEnv.GetString("jupyter_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("jupyter_mem_limit")
		}
		//pStruct["command"] = "start.sh jupyter lab --ServerApp.open_browser=false --IdentityProvider.token='${JUPYTER_TOKEN}' --ServerApp.base_url=\"/jupyter\" --ServerApp.default_url=\"/jupyter\""
		if mythicEnv.GetBool("jupyter_bind_localhost_only") {
			pStruct["ports"] = []string{
				"127.0.0.1:${JUPYTER_PORT}:${JUPYTER_PORT}",
			}
		} else {
			pStruct["ports"] = []string{
				"${JUPYTER_PORT}:${JUPYTER_PORT}",
			}
		}

		pStruct["environment"] = []string{
			"JUPYTER_TOKEN=${JUPYTER_TOKEN}",
		}
		if curConfig.InConfig("services.mythic_jupyter.deploy") {
			pStruct["deploy"] = curConfig.Get("services.mythic_jupyter.deploy")
		}
		if mythicEnv.GetBool("jupyter_bind_local_mount") {
			pStruct["volumes"] = []string{
				"./jupyter-docker/jupyter:/projects",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_jupyter_volume:/projects",
			}
		}
		if _, ok := volumes["mythic_jupyter"]; !ok {
			volumes["mythic_jupyter_volume"] = map[string]interface{}{
				"name": "mythic_jupyter_volume",
			}
		}
	case "mythic_server":
		pStruct["build"] = map[string]interface{}{
			"context": "./mythic-docker",
			"args":    buildArguments,
		}
		pStruct["cpus"] = mythicEnv.GetInt("MYTHIC_SERVER_CPUS")
		if mythicEnv.GetString("mythic_server_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("mythic_server_mem_limit")
		}
		/*
			pStruct["healthcheck"] = map[string]interface{}{
				"test":         "wget -SqO - http://127.0.0.1:${MYTHIC_SERVER_PORT}/health",
				"interval":     "60s",
				"timeout":      "10s",
				"retries":      5,
				"start_period": "20s",
			}

		*/
		//pStruct["command"] = "${MYTHIC_SERVER_COMMAND}"
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
			"DEFAULT_OPERATION_WEBHOOK_URL=${DEFAULT_OPERATION_WEBHOOK_URL}",
			"DEFAULT_OPERATION_WEBHOOK_CHANNEL=${DEFAULT_OPERATION_WEBHOOK_CHANNEL}",
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
			if mythicEnv.GetBool("mythic_server_dynamic_ports_bind_localhost_only") {
				mythicServerPorts = append(mythicServerPorts, fmt.Sprintf("127.0.0.1:%s:%s", val, val))
			} else {
				mythicServerPorts = append(mythicServerPorts, fmt.Sprintf("%s:%s", val, val))
			}

		}
		pStruct["ports"] = mythicServerPorts
		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
		} else {
			pStruct["environment"] = environment
		}
		if mythicEnv.GetBool("mythic_server_bind_local_mount") {
			pStruct["volumes"] = []string{
				"./mythic-docker/src:/usr/src/app",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_server_volume:/usr/src/app",
			}
		}
		if _, ok := volumes["mythic_server"]; !ok {
			volumes["mythic_server_volume"] = map[string]interface{}{
				"name": "mythic_server_volume",
			}
		}
	case "mythic_sync":
		if absPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder, service)); err != nil {
			fmt.Printf("[-] Failed to get abs path for mythic_sync\n")
			return
		} else {
			pStruct["build"] = map[string]interface{}{
				"context": absPath,
				"args":    buildArguments,
			}
			pStruct["cpus"] = mythicEnv.GetInt("MYTHIC_SYNC_CPUS")
			if mythicEnv.GetString("mythic_sync_mem_limit") != "" {
				pStruct["mem_limit"] = mythicEnv.GetString("mythic_sync_mem_limit")
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
			if !mythicEnv.InConfig("GHOSTWRITER_API_KEY") {
				key := askVariable("Please enter your GhostWriter API Key")
				mythicEnv.Set("GHOSTWRITER_API_KEY", key)
			}
			if !mythicEnv.InConfig("GHOSTWRITER_URL") {
				url := askVariable("Please enter your GhostWriter URL")
				mythicEnv.Set("GHOSTWRITER_URL", url)
			}
			if !mythicEnv.InConfig("GHOSTWRITER_OPLOG_ID") {
				gwID := askVariable("Please enter your GhostWriter OpLog ID")
				mythicEnv.Set("GHOSTWRITER_OPLOG_ID", gwID)
			}
			if !mythicEnv.InConfig("MYTHIC_API_KEY") {
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
	if !curConfig.InConfig("services." + strings.ToLower(service)) {
		curConfig.Set("services."+strings.ToLower(service), pStruct)
		fmt.Printf("[+] Added %s to docker-compose\n", strings.ToLower(service))
	} else {
		curConfig.Set("services."+strings.ToLower(service), pStruct)
	}
	/*
		if !curConfig.InConfig("networks") {
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/
	curConfig.Set("volumes", volumes)
	curConfig.Set("version", "2.4")
	err := curConfig.WriteConfig()
	if err != nil {
		fmt.Printf("[-] Failed to update config: %v\n", err)
	} else {
		fmt.Println("[+] Successfully updated docker-compose.yml")
	}
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
	/*
		networkInfo := map[string]interface{}{
			"default_network": map[string]interface{}{
				"driver": "bridge",
				"driver_opts": map[string]string{
					"com.docker.network.bridge.name": "mythic_if",
				},
				"labels": []string{
					"mythic_network",
					"default_network",
				},
			},
		}
		if !curConfig.InConfig("networks") {
			// don't blow away changes to the network configuration
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/

	if isServiceRunning(service) {
		DockerStop([]string{strings.ToLower(service)})
	}
	if curConfig.InConfig("services." + strings.ToLower(service)) {
		delete(curConfig.Get("services").(map[string]interface{}), strings.ToLower(service))
		if stringInSlice(service, []string{"mythic_grafana", "mythic_prometheus", "mythic_postgres_exporter"}) {
			fmt.Printf("[+] Removed %s from docker-compose because postgres_debug is set to false\n", strings.ToLower(service))
		} else {
			fmt.Printf("[+] Removed %s from docker-compose because it's running on a different host\n", strings.ToLower(service))
		}

	}
	/*
		if !curConfig.InConfig("networks") {
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/
	curConfig.Set("version", "2.4")
	fmt.Printf("set volume: %v\n", curConfig.GetStringMap("volumes"))
	err := curConfig.WriteConfig()
	if err != nil {
		fmt.Printf("[-] Failed to update config: %v\n", err)
	} else {
		fmt.Println("[+] Successfully updated docker-compose.yml")
	}
}

func AddDockerComposeEntry(service string, additionalConfigs map[string]interface{}) error {
	// add c2/payload [name] as type [group] to the main yaml file
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
	/*
		networkInfo := map[string]interface{}{
			"default_network": map[string]interface{}{
				"driver": "bridge",
				"driver_opts": map[string]string{
					"com.docker.network.bridge.name": "mythic_if",
				},
				"labels": []string{
					"mythic_network",
					"default_network",
				},
			},
		}
		if !curConfig.InConfig("networks") {
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/
	absPath, err := filepath.Abs(filepath.Join(getCwdFromExe(), InstalledServicesFolder, service))
	if err != nil {
		fmt.Printf("[-] Failed to get the absolute path to the %s folder, does the folder exist?\n", InstalledServicesFolder)
		fmt.Printf("[*] If the service doesn't exist, you might need to install with 'mythic-cli install'\n")
		os.Exit(1)
	}
	if !dirExists(absPath) {
		fmt.Printf("[-] %s does not exist, not adding to Mythic\n", absPath)
		os.Exit(1)
	}
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
		"restart":        "always",
		"container_name": strings.ToLower(service),
		"cpus":           mythicEnv.GetInt("INSTALLED_SERVICE_CPUS"),
	}
	if mythicEnv.GetString("installed_service_mem_limit") != "" {
		pStruct["mem_limit"] = mythicEnv.GetString("installed_service_mem_limit")
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
		"MYTHIC_ADDRESS=http://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/agent_message",
		"MYTHIC_WEBSOCKET=ws://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/ws/agent_message",
		"RABBITMQ_USER=${RABBITMQ_USER}",
		"RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}",
		"RABBITMQ_PORT=${RABBITMQ_PORT}",
		"RABBITMQ_HOST=${RABBITMQ_HOST}",
		"MYTHIC_SERVER_HOST=${MYTHIC_SERVER_HOST}",
		"MYTHIC_SERVER_PORT=${MYTHIC_SERVER_PORT}",
		"MYTHIC_SERVER_GRPC_PORT=${MYTHIC_SERVER_GRPC_PORT}",
		"WEBHOOK_DEFAULT_URL=${WEBHOOK_DEFAULT_URL}",
		"WEBHOOK_DEFAULT_CALLBACK_CHANNEL=${WEBHOOK_DEFAULT_CALLBACK_CHANNEL}",
		"WEBHOOK_DEFAULT_FEEDBACK_CHANNEL=${WEBHOOK_DEFAULT_FEEDBACK_CHANNEL}",
		"WEBHOOK_DEFAULT_STARTUP_CHANNEL=${WEBHOOK_DEFAULT_STARTUP_CHANNEL}",
		"WEBHOOK_DEFAULT_ALERT_CHANNEL=${WEBHOOK_DEFAULT_ALERT_CHANNEL}",
		"WEBHOOK_DEFAULT_CUSTOM_CHANNEL=${WEBHOOK_DEFAULT_CUSTOM_CHANNEL}",
		"DEBUG_LEVEL=${DEBUG_LEVEL}",
	}
	if _, ok := pStruct["environment"]; ok {
		pStruct["environment"] = updateEnvironmentVariables(curConfig.GetStringSlice("services."+strings.ToLower(service)+".environment"), environment)
	} else {
		pStruct["environment"] = environment
	}
	// only add in volumes if some aren't already listed
	if _, ok := pStruct["volumes"]; !ok {
		pStruct["volumes"] = []string{
			absPath + ":/Mythic/",
		}
	}
	curConfig.Set("services."+strings.ToLower(service), pStruct)
	/*
		if !curConfig.InConfig("networks") {
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/
	curConfig.Set("version", "2.4")
	fmt.Printf("set volume: %v\n", curConfig.GetStringMap("volumes"))
	err = curConfig.WriteConfig()
	if err != nil {
		fmt.Printf("[-] Failed to update config: %v\n", err)
	} else {
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
			log.Fatalf("[-] Error while reading in docker-compose file: %s\n", err)
		} else {
			log.Fatalf("[-] Error while parsing docker-compose file: %s\n", err)
		}
	}
	/*
		networkInfo := map[string]interface{}{
			"default_network": map[string]interface{}{
				"driver": "bridge",
				"driver_opts": map[string]string{
					"com.docker.network.bridge.name": "mythic_if",
				},
				"labels": []string{
					"mythic_network",
					"default_network",
				},
			},
		}

	*/

	if !stringInSlice(service, MythicPossibleServices) {
		if isServiceRunning(service) {
			DockerStop([]string{strings.ToLower(service)})
		}
		delete(curConfig.Get("services").(map[string]interface{}), strings.ToLower(service))
		fmt.Printf("[+] Removed %s from docker-compose\n", strings.ToLower(service))

	}
	/*
		if !curConfig.InConfig("networks") {
			curConfig.Set("networks", networkInfo)
		} else {
			curConfig.Set("networks.default_network.driver_opts", map[string]string{
				"com.docker.network.bridge.name": "mythic_if",
			})
		}

	*/
	curConfig.Set("version", "2.4")
	fmt.Printf("set volume: %v\n", curConfig.GetStringMap("volumes"))
	err := curConfig.WriteConfig()
	if err != nil {
		fmt.Printf("[-] Failed to update config: %v\n", err)
	} else {
		fmt.Println("[+] Successfully updated docker-compose.yml")
	}
	return nil
}

func runDockerCompose(args []string) error {
	lookPath, err := exec.LookPath("docker-compose")
	if err != nil {
		lookPath, err = exec.LookPath("docker")
		if err != nil {
			log.Fatalf("[-] docker-compose and docker are not installed or available in the current PATH\n")
		} else {
			// adjust the current args for docker compose subcommand
			args = append([]string{"compose"}, args...)
		}
	}
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get lookPath to current executable\n")
	}
	exePath := filepath.Dir(exe)
	command := exec.Command(lookPath, args...)
	command.Dir = exePath
	command.Env = getMythicEnvList()

	stdout, err := command.StdoutPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stdout pipe for running docker-compose\n")
	}
	stderr, err := command.StderrPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stderr pipe for running docker-compose\n")
	}

	stdoutScanner := bufio.NewScanner(stdout)
	stderrScanner := bufio.NewScanner(stderr)
	wg := sync.WaitGroup{}
	wg.Add(2)
	go func() {
		for stdoutScanner.Scan() {
			fmt.Printf("%s\n", stdoutScanner.Text())
		}
		wg.Done()
	}()
	go func() {
		for stderrScanner.Scan() {
			fmt.Printf("%s\n", stderrScanner.Text())
		}
		wg.Done()
	}()
	err = command.Start()
	if err != nil {
		log.Fatalf("[-] Error trying to start docker-compose: %v\n", err)
	}
	wg.Wait()
	err = command.Wait()
	if err != nil {
		fmt.Printf("[-] Error from docker-compose: %v\n", err)
		fmt.Printf("[*] Docker compose command: %v\n", args)
		return err
	}
	return nil
}
func runDocker(args []string) (string, error) {
	lookPath, err := exec.LookPath("docker")
	if err != nil {
		log.Fatalf("[-] docker is not installed or available in the current PATH\n")
	}
	exe, err := os.Executable()
	if err != nil {
		log.Fatalf("[-] Failed to get lookPath to current executable\n")
	}
	exePath := filepath.Dir(exe)
	command := exec.Command(lookPath, args...)
	command.Dir = exePath
	command.Env = getMythicEnvList()
	stdout, err := command.StdoutPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stdout pipe for running docker-compose\n")
	}
	stderr, err := command.StderrPipe()
	if err != nil {
		log.Fatalf("[-] Failed to get stderr pipe for running docker-compose\n")
	}
	stdoutScanner := bufio.NewScanner(stdout)
	stderrScanner := bufio.NewScanner(stderr)
	outputString := ""
	wg := sync.WaitGroup{}
	wg.Add(2)
	go func() {
		for stdoutScanner.Scan() {
			outputString += stdoutScanner.Text()
		}
		wg.Done()
	}()
	go func() {
		for stderrScanner.Scan() {
			fmt.Printf("%s\n", stderrScanner.Text())
		}
		wg.Done()
	}()
	err = command.Start()
	if err != nil {
		log.Fatalf("[-] Error trying to start docker: %v\n", err)
	}
	wg.Wait()
	err = command.Wait()
	if err != nil {
		fmt.Printf("[-] Error from docker: %v\n", err)
		fmt.Printf("[*] Docker command: %v\n", args)
		return "", err
	}
	return outputString, nil
}
func GetAllExistingNonMythicServiceNames() ([]string, error) {
	// get all services that exist within the loaded config
	groupNameConfig := viper.New()
	groupNameConfig.SetConfigName("docker-compose")
	groupNameConfig.SetConfigType("yaml")
	groupNameConfig.AddConfigPath(getCwdFromExe())
	if err := groupNameConfig.ReadInConfig(); err != nil {
		if _, ok := err.(viper.ConfigFileNotFoundError); ok {
			fmt.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			return []string{}, err
		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s\n", err)
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
			fmt.Printf("[-] Error while reading in docker-compose file: %s\n", err)
			return []string{}, err
		} else {
			fmt.Printf("[-] Error while parsing docker-compose file: %s\n", err)
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
				} else {
					fmt.Printf("[+] Successfully created new docker-compose.yml file. Populating it now...\n")
				}
				intendedMythicContainers, _ := GetIntendedMythicServiceNames()
				for _, container := range intendedMythicContainers {
					addMythicServiceDockerComposeEntry(container)
				}
				return
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
	if !checkDockerVersion() {
		log.Fatalf("[-] Bad docker version\n")
	}
}
