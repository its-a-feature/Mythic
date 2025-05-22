package internal

import (
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/config"
	"github.com/MythicMeta/Mythic_CLI/cmd/manager"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"log"
	"path/filepath"
	"strings"
)

func AddMythicService(service string, removeVolume bool) {
	pStruct, err := manager.GetManager().GetServiceConfiguration(service)
	if err != nil {
		log.Fatalf("[-] Failed to get current configuration information: %v\n", err)
	}
	if _, ok := pStruct["environment"]; !ok {
		pStruct["environment"] = []interface{}{}
	}
	pStruct["labels"] = map[string]string{
		"name": service,
	}
	pStruct["hostname"] = strings.ToLower(service)
	pStruct["logging"] = map[string]interface{}{
		"driver": "json-file",
		"options": map[string]string{
			"max-file": "1",
			"max-size": "10m",
		},
	}
	pStruct["restart"] = config.GetMythicEnv().GetString("global_restart_policy")
	pStruct["container_name"] = strings.ToLower(service)
	mythicEnv := config.GetMythicEnv()
	volumes, _ := manager.GetManager().GetVolumes()

	switch service {
	case "mythic_postgres":
		if mythicEnv.GetBool("postgres_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./postgres-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
		}

		pStruct["cpus"] = mythicEnv.GetInt("POSTGRES_CPUS")
		if mythicEnv.GetString("postgres_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("postgres_mem_limit")
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("postgres_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${POSTGRES_PORT}:${POSTGRES_PORT}",
				}
			} else {
				pStruct["ports"] = []string{
					"${POSTGRES_PORT}:${POSTGRES_PORT}",
				}
			}
			pStruct["command"] = "postgres -c \"max_connections=100\" -p ${POSTGRES_PORT} -c config_file=/etc/postgresql.conf"
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			if mythicEnv.GetBool("postgres_bind_localhost_only") {
				pStruct["command"] = "postgres -c \"max_connections=100\" -p ${POSTGRES_PORT} -c config_file=/etc/postgresql.conf -c \"listen_addresses=localhost\""
			} else {
				pStruct["command"] = "postgres -c \"max_connections=100\" -p ${POSTGRES_PORT} -c config_file=/etc/postgresql.conf"
			}
		}
		environment := []string{
			"POSTGRES_DB=${POSTGRES_DB}",
			"POSTGRES_USER=${POSTGRES_USER}",
			"POSTGRES_PASSWORD=${POSTGRES_PASSWORD}",
			"POSTGRES_PORT=${POSTGRES_PORT}",
		}
		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = utils.UpdateEnvironmentVariables(pStruct["environment"].([]interface{}), environment)
		} else {
			pStruct["environment"] = environment
		}
		if !mythicEnv.GetBool("postgres_use_volume") {
			pStruct["volumes"] = []string{
				"./postgres-docker/database:/var/lib/postgresql/data",
				"./postgres-docker/postgres.conf:/etc/postgresql.conf",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_postgres_volume:/var/lib/postgresql/data",
			}

		}
		if _, ok := volumes["mythic_postgres"]; !ok {
			volumes["mythic_postgres_volume"] = map[string]interface{}{
				"name": "mythic_postgres_volume",
			}
		}
	case "mythic_documentation":
		if mythicEnv.GetBool("documentation_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./documentation-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("documentation_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${DOCUMENTATION_PORT}:${DOCUMENTATION_PORT}",
				}
			} else {
				pStruct["ports"] = []string{
					"${DOCUMENTATION_PORT}:${DOCUMENTATION_PORT}",
				}
			}
			pStruct["environment"] = []string{
				"DOCUMENTATION_PORT=${DOCUMENTATION_PORT}",
			}
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			if mythicEnv.GetBool("documentation_bind_localhost_only") {
				pStruct["environment"] = []string{
					"DOCUMENTATION_PORT=${DOCUMENTATION_PORT}",
					"HUGO_BIND=127.0.0.1",
				}
			} else {
				pStruct["environment"] = []string{
					"DOCUMENTATION_PORT=${DOCUMENTATION_PORT}",
					"HUGO_BIND=0.0.0.0",
				}
			}

		}

		if !mythicEnv.GetBool("documentation_use_volume") {
			pStruct["volumes"] = []string{
				"./documentation-docker/:/src",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_documentation_volume:/src",
			}
		}
		if _, ok := volumes["mythic_documentation"]; !ok {
			volumes["mythic_documentation_volume"] = map[string]interface{}{
				"name": "mythic_documentation_volume",
			}
		}
	case "mythic_graphql":
		if mythicEnv.GetBool("hasura_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./hasura-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
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
			"HASURA_GRAPHQL_MIGRATIONS_SERVER_PORT=${HASURA_PORT}",
			"HASURA_GRAPHQL_METADATA_DIR=/metadata",
			"HASURA_GRAPHQL_LIVE_QUERIES_MULTIPLEXED_REFETCH_INTERVAL=1000",
			"HASURA_GRAPHQL_AUTH_HOOK=http://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/graphql/webhook",
			"HASURA_GRAPHQL_AUTH_HOOK_MODE=POST",
			"MYTHIC_ACTIONS_URL_BASE=http://${MYTHIC_SERVER_HOST}:${MYTHIC_SERVER_PORT}/api/v1.4",
			"HASURA_GRAPHQL_CONSOLE_ASSETS_DIR=/srv/console-assets",
		}
		//if _, ok := pStruct["environment"]; ok {
		//	pStruct["environment"] = utils.UpdateEnvironmentVariables(pStruct["environment"].([]interface{}), environment)
		//} else {
		//	pStruct["environment"] = environment
		//}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("hasura_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${HASURA_PORT}:${HASURA_PORT}",
				}

			} else {
				pStruct["ports"] = []string{
					"${HASURA_PORT}:${HASURA_PORT}",
				}
			}
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			if mythicEnv.GetBool("hasura_bind_localhost_only") {
				environment = append(environment, "HASURA_GRAPHQL_SERVER_HOST=127.0.0.1")
			} else {
				environment = append(environment, "HASURA_GRAPHQL_SERVER_HOST=*")
			}
		}
		pStruct["environment"] = environment
		if !mythicEnv.GetBool("hasura_use_volume") {
			pStruct["volumes"] = []string{
				"./hasura-docker/metadata:/metadata",
			}
		} else {
			delete(pStruct, "volumes")
		}
	case "mythic_nginx":
		if mythicEnv.GetBool("nginx_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./nginx-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
		}

		nginxUseSSL := "ssl"
		if !mythicEnv.GetBool("NGINX_USE_SSL") {
			nginxUseSSL = ""
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
			"NGINX_MAX_BODY_SIZE=${NGINX_MAX_BODY_SIZE}",
		}
		if _, ok := pStruct["environment"]; ok {
			environment = utils.UpdateEnvironmentVariables(pStruct["environment"].([]interface{}), environment)
		}
		var finalNginxEnv []string
		for _, val := range environment {
			if !strings.Contains(val, "NEW_UI") {
				finalNginxEnv = append(finalNginxEnv, val)
			}
		}
		for _, val := range []string{"NGINX_BIND_IPV4=0.0.0.0", "NGINX_BIND_IPV6=[::]", "NGINX_BIND_IPV4=127.0.0.1", "NGINX_BIND_IPV6=[::1]"} {
			finalNginxEnv = utils.RemoveStringFromSliceNoOrder(finalNginxEnv, val)
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("nginx_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${NGINX_PORT}:${NGINX_PORT}",
				}
			} else {
				pStruct["ports"] = []string{
					"${NGINX_PORT}:${NGINX_PORT}",
				}
			}
			finalNginxEnv = append(finalNginxEnv, "NGINX_BIND_IPV4=0.0.0.0", "NGINX_BIND_IPV6=[::]")
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			if mythicEnv.GetBool("nginx_bind_localhost_only") {
				finalNginxEnv = append(finalNginxEnv, "NGINX_BIND_IPV4=127.0.0.1", "NGINX_BIND_IPV6=[::1]")
			} else {
				finalNginxEnv = append(finalNginxEnv, "NGINX_BIND_IPV4=0.0.0.0", "NGINX_BIND_IPV6=[::]")
			}
		}
		pStruct["environment"] = finalNginxEnv
		if !mythicEnv.GetBool("nginx_use_volume") {
			pStruct["volumes"] = []string{
				"./nginx-docker/ssl:/etc/ssl/private",
				"./nginx-docker/config:/etc/nginx",
			}
		} else {
			pStruct["volumes"] = []string{
				"mythic_nginx_volume_config:/etc/nginx",
				"mythic_nginx_volume_ssl:/etc/ssl/private",
			}
		}
		if _, ok := volumes["mythic_nginx"]; !ok {
			volumes["mythic_nginx_volume_config"] = map[string]interface{}{
				"name": "mythic_nginx_volume_config",
			}
			volumes["mythic_nginx_volume_ssl"] = map[string]interface{}{
				"name": "mythic_nginx_volume_ssl",
			}
		}

	case "mythic_rabbitmq":
		if mythicEnv.GetBool("rabbitmq_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./rabbitmq-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
		}
		pStruct["cpus"] = mythicEnv.GetInt("RABBITMQ_CPUS")
		if mythicEnv.GetString("rabbitmq_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("rabbitmq_mem_limit")
		}
		environment := []string{
			"RABBITMQ_USER=${RABBITMQ_USER}",
			"RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}",
			"RABBITMQ_VHOST=${RABBITMQ_VHOST}",
			"RABBITMQ_PORT=${RABBITMQ_PORT}",
		}
		if _, ok := pStruct["environment"]; ok {
			environment = utils.UpdateEnvironmentVariables(pStruct["environment"].([]interface{}), environment)
		}
		var finalRabbitEnv []string
		badRabbitMqEnvs := []string{
			"RABBITMQ_DEFAULT_USER=${RABBITMQ_USER}",
			"RABBITMQ_DEFAULT_PASS=${RABBITMQ_PASSWORD}",
			"RABBITMQ_DEFAULT_VHOST=${RABBITMQ_VHOST}",
		}
		for _, val := range environment {
			if !utils.StringInSlice(val, badRabbitMqEnvs) {
				finalRabbitEnv = append(finalRabbitEnv, val)
			}
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("rabbitmq_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${RABBITMQ_PORT}:${RABBITMQ_PORT}",
				}
			} else {
				pStruct["ports"] = []string{
					"${RABBITMQ_PORT}:${RABBITMQ_PORT}",
				}
			}
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			if mythicEnv.GetBool("rabbitmq_bind_localhost_only") {
				environment = append(environment, "RABBITMQ_NODE_IP_ADDRESS=127.0.0.1", "RABBITMQ_NODE_PORT=${RABBITMQ_PORT}")
			} else {
				environment = append(environment, "RABBITMQ_NODE_IP_ADDRESS=0.0.0.0", "RABBITMQ_NODE_PORT=${RABBITMQ_PORT}")
			}
		}

		pStruct["environment"] = finalRabbitEnv
		if !mythicEnv.GetBool("rabbitmq_use_volume") {
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
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
			pStruct["volumes"] = []string{
				"./MythicReactUI/src:/app/src",
				"./MythicReactUI/public:/app/public",
				"./MythicReactUI/package.json:/app/package.json",
				"./MythicReactUI/package-lock.json:/app/package-lock.json",
				"./mythic-react-docker/mythic/public:/app/build",
			}
		} else {
			if mythicEnv.GetBool("mythic_react_use_build_context") {
				pStruct["build"] = map[string]interface{}{
					"context": "./mythic-react-docker",
					"args":    config.GetBuildArguments(),
				}
				pStruct["image"] = service
			} else {
				pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
			}

			if !mythicEnv.GetBool("mythic_react_use_volume") {
				pStruct["volumes"] = []string{
					"./mythic-react-docker/config:/etc/nginx",
					"./mythic-react-docker/mythic/public:/mythic/new",
				}
			} else {
				if removeVolume {
					log.Printf("[*] Removing old volume, %s, if it exists to make room for updated configs", "mythic_react_volume_config")
					manager.GetManager().RemoveVolume("mythic_react_volume_config")
					log.Printf("[*] Removing old volume, %s, if it exists to make room for updated UI", "mythic_react_volume_public")
					manager.GetManager().RemoveVolume("mythic_react_volume_public")
				}
				pStruct["volumes"] = []string{
					"mythic_react_volume_config:/etc/nginx",
					"mythic_react_volume_public:/mythic/new",
				}
			}
		}
		if _, ok := volumes["mythic_react"]; !ok {
			volumes["mythic_react_volume_config"] = map[string]interface{}{
				"name": "mythic_react_volume_config",
			}
			volumes["mythic_react_volume_public"] = map[string]interface{}{
				"name": "mythic_react_volume_public",
			}
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("mythic_react_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${MYTHIC_REACT_PORT}:${MYTHIC_REACT_PORT}",
				}
			} else {
				pStruct["ports"] = []string{
					"${MYTHIC_REACT_PORT}:${MYTHIC_REACT_PORT}",
				}
			}
			pStruct["environment"] = []string{
				"MYTHIC_REACT_PORT=${MYTHIC_REACT_PORT}",
				"MYTHIC_REACT_BIND_IPV4=0.0.0.0",
			}
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			if mythicEnv.GetBool("mythic_react_bind_localhost_only") {
				pStruct["environment"] = []string{
					"MYTHIC_REACT_PORT=${MYTHIC_REACT_PORT}",
					"MYTHIC_REACT_BIND_IPV4=127.0.0.1",
				}
			} else {
				pStruct["environment"] = []string{
					"MYTHIC_REACT_PORT=${MYTHIC_REACT_PORT}",
					"MYTHIC_REACT_BIND_IPV4=0.0.0.0",
				}
			}
		}

	case "mythic_jupyter":
		if mythicEnv.GetBool("jupyter_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./jupyter-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
		}

		pStruct["cpus"] = mythicEnv.GetInt("JUPYTER_CPUS")
		if mythicEnv.GetString("jupyter_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("jupyter_mem_limit")
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			if mythicEnv.GetBool("jupyter_bind_localhost_only") {
				pStruct["ports"] = []string{
					"127.0.0.1:${JUPYTER_PORT}:${JUPYTER_PORT}",
				}
			} else {
				pStruct["ports"] = []string{
					"${JUPYTER_PORT}:${JUPYTER_PORT}",
				}
			}
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
			pStruct["environment"] = []string{
				"JUPYTER_TOKEN=${JUPYTER_TOKEN}",
				"CHOWN_EXTRA=/projects",
				"CHOWN_EXTRA_OPTS=-R",
			}
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
			environment := []string{
				"JUPYTER_TOKEN=${JUPYTER_TOKEN}",
				"CHOWN_EXTRA=/projects",
				"CHOWN_EXTRA_OPTS=-R",
				"JUPYTER_PORT=${JUPYTER_PORT}",
			}
			if mythicEnv.GetBool("jupyter_bind_localhost_only") {
				environment = append(environment, "JUPYTER_IP=127.0.0.1")
			} else {
				environment = append(environment, "JUPYTER_IP=0.0.0.0")
			}
			pStruct["environment"] = environment
		}
		pStruct["user"] = "root"
		/*
			if curConfig.InConfig("services.mythic_jupyter.deploy") {
				pStruct["deploy"] = curConfig.Get("services.mythic_jupyter.deploy")
			}

		*/
		if !mythicEnv.GetBool("jupyter_use_volume") {
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
		if mythicEnv.GetBool("mythic_server_use_build_context") {
			pStruct["build"] = map[string]interface{}{
				"context": "./mythic-docker",
				"args":    config.GetBuildArguments(),
			}
			pStruct["image"] = service
		} else {
			pStruct["image"] = fmt.Sprintf("ghcr.io/its-a-feature/%s:%s", service, mythicEnv.GetString("global_docker_latest"))
		}

		pStruct["cpus"] = mythicEnv.GetInt("MYTHIC_SERVER_CPUS")
		if mythicEnv.GetString("mythic_server_mem_limit") != "" {
			pStruct["mem_limit"] = mythicEnv.GetString("mythic_server_mem_limit")
		}
		environment := []string{
			"ALLOWED_IP_BLOCKS=${ALLOWED_IP_BLOCKS}",
			"DEBUG_LEVEL=${DEBUG_LEVEL}",
			"DEFAULT_OPERATION_NAME=${DEFAULT_OPERATION_NAME}",
			"DEFAULT_OPERATION_WEBHOOK_CHANNEL=${DEFAULT_OPERATION_WEBHOOK_CHANNEL}",
			"DEFAULT_OPERATION_WEBHOOK_URL=${DEFAULT_OPERATION_WEBHOOK_URL}",
			"GLOBAL_SERVER_NAME=${GLOBAL_SERVER_NAME}",
			"JWT_SECRET=${JWT_SECRET}",
			"MYTHIC_ADMIN_USER=${MYTHIC_ADMIN_USER}",
			"MYTHIC_ADMIN_PASSWORD=${MYTHIC_ADMIN_PASSWORD}",
			"MYTHIC_DEBUG_AGENT_MESSAGE=${MYTHIC_DEBUG_AGENT_MESSAGE}",
			"MYTHIC_SERVER_ALLOW_INVITE_LINKS=${MYTHIC_SERVER_ALLOW_INVITE_LINKS}",
			"MYTHIC_SERVER_PORT=${MYTHIC_SERVER_PORT}",
			"MYTHIC_SERVER_BIND_LOCALHOST_ONLY=${MYTHIC_SERVER_BIND_LOCALHOST_ONLY}",
			"MYTHIC_SERVER_GRPC_PORT=${MYTHIC_SERVER_GRPC_PORT}",
			"MYTHIC_SERVER_DYNAMIC_PORTS=${MYTHIC_SERVER_DYNAMIC_PORTS}",
			"MYTHIC_SERVER_DYNAMIC_PORTS_BIND_LOCALHOST_ONLY=${MYTHIC_SERVER_DYNAMIC_PORTS_BIND_LOCALHOST_ONLY}",
			"MYTHIC_DOCKER_NETWORKING=${MYTHIC_DOCKER_NETWORKING}",
			"NGINX_PORT=${NGINX_PORT}",
			"NGINX_HOST=${NGINX_HOST}",
			"POSTGRES_HOST=${POSTGRES_HOST}",
			"POSTGRES_PORT=${POSTGRES_PORT}",
			"POSTGRES_PASSWORD=${POSTGRES_PASSWORD}",
			"RABBITMQ_HOST=${RABBITMQ_HOST}",
			"RABBITMQ_PORT=${RABBITMQ_PORT}",
			"RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD}",
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
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
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			delete(pStruct, "ports")
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
		}

		if _, ok := pStruct["environment"]; ok {
			pStruct["environment"] = utils.UpdateEnvironmentVariables(pStruct["environment"].([]interface{}), environment)
		} else {
			pStruct["environment"] = environment
		}
		if !mythicEnv.GetBool("mythic_server_use_volume") {
			// mount the entire directory in so that you can see changes to code too
			pStruct["volumes"] = []string{
				"./mythic-docker/src:/usr/src/app",
			}
		} else {
			// when using a volume for Mythic server, just have it save off the files
			pStruct["volumes"] = []string{
				"mythic_server_volume:/usr/src/app/files",
			}
		}
		if _, ok := volumes["mythic_server"]; !ok {
			volumes["mythic_server_volume"] = map[string]interface{}{
				"name": "mythic_server_volume",
			}
		}
	case "mythic_sync":
		absPath, err := filepath.Abs(filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service))
		if err != nil {
			log.Printf("[-] Failed to get abs path for mythic_sync\n")
			return
		}

		pStruct["build"] = map[string]interface{}{
			"context": absPath,
			"args":    config.GetBuildArguments(),
		}
		pStruct["image"] = service
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
			"GLOBAL_SERVER_NAME=${GLOBAL_SERVER_NAME}",
		}
		if !mythicEnv.InConfig("GHOSTWRITER_API_KEY") {
			config.AskVariable("Please enter your GhostWriter API Key", "GHOSTWRITER_API_KEY")
		}
		if !mythicEnv.InConfig("GHOSTWRITER_URL") {
			config.AskVariable("Please enter your GhostWriter URL", "GHOSTWRITER_URL")
		}
		if !mythicEnv.InConfig("GHOSTWRITER_OPLOG_ID") {
			config.AskVariable("Please enter your GhostWriter OpLog ID", "GHOSTWRITER_OPLOG_ID")
		}
		if !mythicEnv.InConfig("MYTHIC_API_KEY") {
			config.AskVariable("Please enter your Mythic API Key (optional)", "MYTHIC_API_KEY")
		}
		if mythicEnv.GetString("mythic_docker_networking") == "bridge" {
			delete(pStruct, "network_mode")
			delete(pStruct, "extra_hosts")
		} else {
			pStruct["network_mode"] = "host"
			pStruct["extra_hosts"] = []string{
				"mythic_server:127.0.0.1",
				"mythic_rabbitmq:127.0.0.1",
				"mythic_nginx:127.0.0.1",
				"mythic_react:127.0.0.1",
				"mythic_documentation:127.0.0.1",
				"mythic_graphql:127.0.0.1",
				"mythic_jupyter:127.0.0.1",
				"mythic_postgres:127.0.0.1",
			}
		}

	}
	manager.GetManager().SetVolumes(volumes)
	_ = manager.GetManager().SetServiceConfiguration(service, pStruct)
}
func Add3rdPartyService(service string, additionalConfigs map[string]interface{}, removeVolume bool) error {
	existingConfig, _ := manager.GetManager().GetServiceConfiguration(service)
	if _, ok := existingConfig["environment"]; !ok {
		existingConfig["environment"] = []interface{}{}
	}
	existingConfig["labels"] = map[string]string{
		"name": service,
	}
	existingConfig["image"] = strings.ToLower(service)
	existingConfig["hostname"] = strings.ToLower(service)
	existingConfig["logging"] = map[string]interface{}{
		"driver": "json-file",
		"options": map[string]string{
			"max-file": "1",
			"max-size": "10m",
		},
	}
	existingConfig["restart"] = config.GetMythicEnv().GetString("global_restart_policy")
	existingConfig["container_name"] = strings.ToLower(service)
	existingConfig["cpus"] = config.GetMythicEnv().GetInt("INSTALLED_SERVICE_CPUS")
	existingConfig["build"] = map[string]interface{}{
		"context": filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service),
		"args":    config.GetBuildArguments(),
	}
	existingConfig["network_mode"] = "host"
	existingConfig["extra_hosts"] = []string{
		"mythic_server:127.0.0.1",
		"mythic_rabbitmq:127.0.0.1",
		"mythic_nginx:127.0.0.1",
		"mythic_react:127.0.0.1",
		"mythic_documentation:127.0.0.1",
		"mythic_graphql:127.0.0.1",
		"mythic_jupyter:127.0.0.1",
		"mythic_postgres:127.0.0.1",
	}
	/*
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
			"restart":        config.GetMythicEnv().GetString("global_restart_policy"),
			"container_name": strings.ToLower(service),
			"cpus":           config.GetMythicEnv().GetInt("INSTALLED_SERVICE_CPUS"),
		}
		pStruct["build"] = map[string]interface{}{
			"context": filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service),
			"args":    config.GetBuildArguments(),
		}

	*/
	agentConfigs := config.GetConfigStrings([]string{fmt.Sprintf("%s_.*", service)})
	agentUseBuildContextKey := fmt.Sprintf("%s_use_build_context", service)
	agentRemoteImageKey := fmt.Sprintf("%s_remote_image", service)
	agentUseVolumeKey := fmt.Sprintf("%s_use_volume", service)
	if useBuildContext, ok := agentConfigs[agentUseBuildContextKey]; ok {
		if useBuildContext == "false" {
			delete(existingConfig, "build")
			existingConfig["image"] = agentConfigs[agentRemoteImageKey]
		}
	}
	if useVolume, ok := agentConfigs[agentUseVolumeKey]; ok {
		if useVolume == "true" {
			volumeName := fmt.Sprintf("%s_volume", service)
			existingConfig["volumes"] = []string{
				volumeName + ":/Mythic/",
			}
			if removeVolume {
				// blow away the old volume just in case to make sure we don't carry over old data
				log.Printf("[*] Removing old volume, %s, if it exists", volumeName)
				manager.GetManager().RemoveVolume(volumeName)
			}

			// add our new volume to the list of volumes if needed
			volumes, _ := manager.GetManager().GetVolumes()
			volumes[volumeName] = map[string]string{
				"name": volumeName,
			}
			manager.GetManager().SetVolumes(volumes)
		} else {
			delete(existingConfig, "volumes")
		}
	}
	if config.GetMythicEnv().GetString("installed_service_mem_limit") != "" {
		existingConfig["mem_limit"] = config.GetMythicEnv().GetString("installed_service_mem_limit")
	}
	for key, element := range additionalConfigs {
		existingConfig[key] = element
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
		"NGINX_HOST=${NGINX_HOST}",
		"NGINX_PORT=${NGINX_PORT}",
		"NGINX_USE_SSL=${NGINX_USE_SSL}",
		"WEBHOOK_DEFAULT_URL=${WEBHOOK_DEFAULT_URL}",
		"WEBHOOK_DEFAULT_CALLBACK_CHANNEL=${WEBHOOK_DEFAULT_CALLBACK_CHANNEL}",
		"WEBHOOK_DEFAULT_FEEDBACK_CHANNEL=${WEBHOOK_DEFAULT_FEEDBACK_CHANNEL}",
		"WEBHOOK_DEFAULT_STARTUP_CHANNEL=${WEBHOOK_DEFAULT_STARTUP_CHANNEL}",
		"WEBHOOK_DEFAULT_ALERT_CHANNEL=${WEBHOOK_DEFAULT_ALERT_CHANNEL}",
		"WEBHOOK_DEFAULT_CUSTOM_CHANNEL=${WEBHOOK_DEFAULT_CUSTOM_CHANNEL}",
		"DEBUG_LEVEL=${DEBUG_LEVEL}",
		"GLOBAL_SERVER_NAME=${GLOBAL_SERVER_NAME}",
	}
	existingConfig["environment"] = utils.UpdateEnvironmentVariables(existingConfig["environment"].([]interface{}), environment)
	// only add in volumes if some aren't already listed
	if _, ok := existingConfig["volumes"]; !ok {
		existingConfig["volumes"] = []string{
			filepath.Join(manager.GetManager().GetPathTo3rdPartyServicesOnDisk(), service) + ":/Mythic/",
		}
	}
	return manager.GetManager().SetServiceConfiguration(service, existingConfig)
}
func RemoveService(service string) error {
	return manager.GetManager().RemoveServices([]string{service}, false)
}

func Initialize() {
	if !manager.GetManager().CheckRequiredManagerVersion() {
		log.Fatalf("[-] Bad %s version\n", manager.GetManager().GetManagerName())
	}
	manager.GetManager().GenerateRequiredConfig()
	// based on .env, find out which mythic services are supposed to be running and add them to docker compose
	intendedMythicContainers, _ := config.GetIntendedMythicServiceNames()
	for _, container := range intendedMythicContainers {
		AddMythicService(container, false)
	}

}
