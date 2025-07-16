package config

import (
	"bufio"
	"fmt"
	"github.com/MythicMeta/Mythic_CLI/cmd/utils"
	"github.com/spf13/viper"
	"log"
	"os"
	"path/filepath"
	"regexp"
	"runtime"
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
	"mythic_grafana",
	"mythic_prometheus",
	"mythic_postgres_exporter",
}
var mythicEnv = viper.New()
var mythicEnvInfo = make(map[string]string)

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
			if mythicEnv.GetString("MYTHIC_DOCKER_NETWORKING") == "host" {
				containerList = append(containerList, service)
			} else if mythicEnv.GetString("MYTHIC_SERVER_HOST") == "127.0.0.1" || mythicEnv.GetString("MYTHIC_SERVER_HOST") == "mythic_server" {
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
		}
	}
	return containerList, nil
}
func GetMythicEnv() *viper.Viper {
	return mythicEnv
}
func setMythicConfigDefaultValues() {
	defaultNumberOfCPUs := 2
	if runtime.NumCPU() < defaultNumberOfCPUs {
		defaultNumberOfCPUs = runtime.NumCPU()
		fmt.Printf("WARNING: Setting default number of CPUs to %d, which is less than the recommended 2\n", defaultNumberOfCPUs)
	}
	// global configuration ---------------------------------------------
	mythicEnv.SetDefault("debug_level", "warning")
	mythicEnvInfo["debug_level"] = `This sets the logging level for mythic_server and all installed services. Valid options are debug, info, and warning`

	mythicEnv.SetDefault("global_server_name", "mythic")
	mythicEnvInfo["global_server_name"] = `This sets the name of the Mythic server that's sent down as part of webhook and logging data. This makes it easier to identify which Mythic server is sending data to webhooks or logs.`

	mythicEnv.SetDefault("global_manager", "docker")
	mythicEnvInfo["global_manager"] = `This sets the management software used to control Mythic. The default is "docker" which uses Docker and Docker Compose. Valid options are currently: docker. Additional PRs can be made to implement the CLIManager Interface and provide more options.`

	mythicEnv.SetDefault("global_restart_policy", "always")
	mythicEnvInfo["global_restart_policy"] = `This sets the restart policy for the containers within Mythic. Valid options should only be 'always', 'unless-stopped', and 'on-failure'. The default of 'always' will ensure that Mythic comes back up even when the server reboots. The 'unless-stopped' value means that Mythic should come back online after reboot unless you specifically ran './mythic-cli stop' first.`

	// nginx configuration ---------------------------------------------
	mythicEnv.SetDefault("nginx_port", 7443)
	mythicEnvInfo["nginx_port"] = `This sets the port used for the Nginx reverse proxy - this port is used by the React UI and Mythic's Scripting`

	mythicEnv.SetDefault("nginx_host", "mythic_nginx")
	mythicEnvInfo["nginx_host"] = `This specifies the ip/hostname for where the Nginx container executes. 
If this is "mythic_nginx" or "127.0.0.1", then mythic-cli assumes this container is running locally. 
If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("nginx_bind_localhost_only", false)
	mythicEnvInfo["nginx_bind_localhost_only"] = `This specifies if the Nginx container will expose the nginx_port on 0.0.0.0 or 127.0.0.1`

	mythicEnv.SetDefault("nginx_use_ssl", true)
	mythicEnvInfo["nginx_use_ssl"] = `This specifies if the Nginx reverse proxy uses http or https`

	mythicEnv.SetDefault("nginx_use_ipv4", true)
	mythicEnvInfo["nginx_use_ipv4"] = `This specifies if the Nginx reverse proxy should bind to IPv4 or not`

	mythicEnv.SetDefault("nginx_use_ipv6", true)
	mythicEnvInfo["nginx_use_ipv6"] = `This specifies if the Nginx reverse proxy should bind to IPv6 or not`

	mythicEnv.SetDefault("nginx_use_volume", false)
	mythicEnvInfo["nginx_use_volume"] = `The Nginx container gets dynamic configuration from a variety of .env values as well as dynamically created SSL certificates. 
If this is True, then a docker volume is created and mounted into the container to host these pieces. 
If this is false, then the local filesystem is mounted inside the container instead. `

	mythicEnv.SetDefault("nginx_use_build_context", false)
	mythicEnvInfo["nginx_use_build_context"] = `The Nginx container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/nginx-docker/Dockerfile is used to generate the image used for the mythic_nginx container instead of the hosted image.`

	mythicEnv.SetDefault("nginx_max_body_size", "500M")
	mythicEnvInfo["nginx_max_body_size"] = `The Nginx container by default limits UI uploads to 500MB, but this can be adjusted with this value. Just make sure to rebuild the container after making a change`

	// mythic react UI configuration ---------------------------------------------
	mythicEnv.SetDefault("mythic_react_host", "mythic_react")
	mythicEnvInfo["mythic_react_host"] = `This specifies the ip/hostname for where the React UI container executes. 
If this is 'mythic_react' or '127.0.0.1', then mythic-cli assumes this container is running locally. 
If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("mythic_react_port", 3000)
	mythicEnvInfo["mythic_react_port"] = `This specifies the port that the React UI server listens on. This is normally accessed through the nginx reverse proxy though via /new`

	mythicEnv.SetDefault("mythic_react_bind_localhost_only", true)
	mythicEnvInfo["mythic_react_bind_localhost_only"] = `This specifies if the mythic_react container will expose the mythic_react_port on 0.0.0.0 or 127.0.0.1. 
Binding the localhost will still allow internal reverse proxying to work, but won't allow the service to be hit remotely. 
It's unlikely this will ever need to change since you should be connecting through the nginx_proxy, but would be necessary to change if the React UI were hosted on a different server.`

	mythicEnv.SetDefault("mythic_react_use_volume", false)
	mythicEnvInfo["mythic_react_use_volume"] = `This specifies if the mythic_react container will mount mount the local filesystem to serve content or use the pre-build data within the image itself.
If you want to change the website that's shown, you need to mount locally and change the mythic_react_use_build_context to true'`

	mythicEnv.SetDefault("mythic_react_use_build_context", false)
	mythicEnvInfo["mythic_react_use_build_context"] = `This specifies if the mythic_react container should use the pre-built docker image hosted on GitHub's container registry (ghcr.io) or if the local mythic-react-docker/Dockerfile should be used to generate the base image for the mythic_react container`

	// documentation configuration ---------------------------------------------
	mythicEnv.SetDefault("documentation_host", "mythic_documentation")
	mythicEnvInfo["documentation_host"] = `This specifies the ip/hostname for where the documentation container executes. 
If this is 'documentation_host' or '127.0.0.1', then mythic-cli assumes this container is running locally. If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("documentation_port", 8090)
	mythicEnvInfo["documentation_port"] = `This specifies the port that the Documentation UI server listens on. 
This is normally accessed through the nginx reverse proxy though via /docs`

	mythicEnv.SetDefault("documentation_bind_localhost_only", true)
	mythicEnvInfo["documentation_bind_localhost_only"] = `This specifies if the documentation container will expose the documentation_port on 0.0.0.0 or 127.0.0.1`

	mythicEnv.SetDefault("documentation_use_volume", false)
	mythicEnvInfo["documentation_use_volume"] = `The documentation container gets dynamic from installed agents and c2 profiles. 
If this is True, then a docker volume is created and mounted into the container to host these pieces. 
If this is false, then the local filesystem is mounted inside the container instead. `

	mythicEnv.SetDefault("documentation_use_build_context", false)
	mythicEnvInfo["documentation_use_build_context"] = `The documentation container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/documentation-docker/Dockerfile is used to generate the image used for the mythic_documentation container instead of the hosted image.`

	// mythic server configuration ---------------------------------------------
	mythicEnv.SetDefault("mythic_debug_agent_message", false)
	mythicEnvInfo["mythic_debug_agent_message"] = `When this is true, Mythic will send a message to the operational event log for each step of processing every agent's message. 
This can be a lot of messages, so do it with care, but it can be extremely valuable in figuring out issues with agent messaging. 
This setting can also be toggled at will in the UI on the settings page by an admin.`

	mythicEnv.SetDefault("mythic_server_port", 17443)
	mythicEnvInfo["mythic_server_port"] = `This specifies the port that the mythic_server listens on. 
This is normally accessed through the nginx reverse proxy though via /new. Agent and C2 Profile containers will directly access this container and port when fetching/uploading files/payloads.`

	mythicEnv.SetDefault("mythic_server_grpc_port", 17444)
	mythicEnvInfo["mythic_server_grpc_port"] = `This specifies the port that the mythic_server's gRPC functionality listens on. 
Translation containers will directly access this container and port when establishing gRPC functionality. 
C2 Profile containers will directly access this container and port when using Push Style C2 connections.`

	mythicEnv.SetDefault("mythic_server_host", "mythic_server")
	mythicEnvInfo["mythic_server_host"] = `This specifies the ip/hostname for where the mythic server container executes. 
If this is 'mythic_server' or '127.0.0.1', then mythic-cli assumes this container is running locally. 
If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("mythic_server_bind_localhost_only", true)
	mythicEnvInfo["mythic_server_bind_localhost_only"] = `This specifies if the mythic_server container will expose the mythic_server_port and mythic_server_grpc_port on 0.0.0.0 or 127.0.0.1. 
If you have a remote agent container connecting to Mythic, you MUST set this to false so that the remote agent container can do file transfers with Mythic.`

	mythicEnv.SetDefault("mythic_server_cpus", defaultNumberOfCPUs)
	mythicEnvInfo["mythic_server_cpus"] = `Set this to limit the maximum number of CPUs this service is able to consume`

	mythicEnv.SetDefault("mythic_server_mem_limit", "")
	mythicEnvInfo["mythic_server_mem_limit"] = `Set this to limit the maximum amount of RAM this service is able to consume`

	mythicEnv.SetDefault("mythic_server_dynamic_ports", "7000-7010")
	mythicEnvInfo["mythic_server_dynamic_ports"] = `These ports are exposed through the Docker container and provide access to SOCKS, Reverse Port Forward, and Interactive Tasking ports opened up by the Mythic Server. 
This is a comma-separated list of ranges, so you could do 7000-7010,7012,713-720`

	mythicEnv.SetDefault("mythic_server_dynamic_ports_bind_localhost_only", true)
	mythicEnvInfo["mythic_server_dynamic_ports_bind_localhost_only"] = `This specifies if the mythic_server container will expose the dynamic_ports on 0.0.0.0 or 127.0.0.1.`

	mythicEnv.SetDefault("mythic_server_use_volume", false)
	mythicEnvInfo["mythic_server_use_volume"] = `The mythic_server container saves uploaded and downloaded files. 
If this is True, then a docker volume is created and mounted into the container to host these pieces. 
If this is false, then the local filesystem is mounted inside the container instead. `

	mythicEnv.SetDefault("mythic_server_use_build_context", false)
	mythicEnvInfo["mythic_server_use_build_context"] = `The mythic_server container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/mythic-docker/Dockerfile is used to generate the image used for the mythic_server container instead of the hosted image. 
If you want to modify the local mythic_server code then you need to set this to true and uncomment the sections of the mythic-docker/Dockerfile that copy over the existing code and build it. 
If you don't do this then you won't see any of your changes take effect`

	mythicEnv.SetDefault("mythic_sync_cpus", defaultNumberOfCPUs)
	mythicEnvInfo["mythic_sync_cpus"] = `Set this to limit the maximum number of CPUs this service is able to consume`

	mythicEnv.SetDefault("mythic_sync_mem_limit", "")
	mythicEnvInfo["mythic_sync_mem_limit"] = `Set this to limit the maximum amount of RAM this service is able to consume`

	mythicEnv.SetDefault("mythic_server_allow_invite_links", "false")
	mythicEnvInfo["mythic_server_allow_invite_links"] = `This configures whether or not admins are allowed to create one-time-use invite links for users to join the server and register their own username/password combinations. They still need to be assigned to operations.'`

	mythicEnv.SetDefault("mythic_docker_networking", "bridge")
	mythicEnvInfo["mythic_docker_networking"] = `Configure how the mythic services are networked (everything except the 3rd party things you install) - the default is 'bridge' which means that ports must be explicitly exposed (mythic_server_dynamic_ports). 
The other option, 'host', means that the services will share networking with the host and not need explicit ports exposed. 
Either way, MYTHIC_SERVER_DYNAMIC_PORTS_BIND_LOCALHOST_ONLY and MYTHIC_SERVER_BIND_LOCALHOST_ONLY still determine if ports are bound to 0.0.0.0 or 127.0.0.1.`

	// postgres configuration ---------------------------------------------
	mythicEnv.SetDefault("postgres_host", "mythic_postgres")
	mythicEnvInfo["postgres_host"] = `This specifies the ip/hostname for where the postgres database container executes. 
If this is 'mythic_postgres' or '127.0.0.1', then mythic-cli assumes this container is running locally. 
If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("postgres_port", 5432)
	mythicEnvInfo["postgres_port"] = `This specifies the port that the Postgres database server listens on.`

	mythicEnv.SetDefault("postgres_bind_localhost_only", true)
	mythicEnvInfo["postgres_bind_localhost_only"] = `This specifies if the mythic_postgres container will expose the postgres_port on 0.0.0.0 or 127.0.0.1`

	mythicEnv.SetDefault("postgres_db", "mythic_db")
	mythicEnvInfo["postgres_db"] = `This configures the name of the database Mythic uses to store its data`

	mythicEnv.SetDefault("postgres_user", "mythic_user")
	mythicEnvInfo["postgres_user"] = `This configures the name of the database user Mythic uses
`
	mythicEnv.SetDefault("postgres_password", utils.GenerateRandomPassword(30))
	mythicEnvInfo["postgres_password"] = `This is the randomly generated password that mythic_server and mythic_graphql use to connect to the mythic_postgres container`

	mythicEnv.SetDefault("postgres_cpus", defaultNumberOfCPUs)
	mythicEnvInfo["postgres_cpus"] = `Set this to limit the maximum number of CPUs this service is able to consume`

	mythicEnv.SetDefault("postgres_mem_limit", "")
	mythicEnvInfo["postgres_mem_limit"] = `Set this to limit the maximum amount of RAM this service is able to consume`

	mythicEnv.SetDefault("postgres_use_volume", false)
	mythicEnvInfo["postgres_use_volume"] = `The mythic_postgres container saves a database of everything that happens within Mythic. 
If this is True, then a docker volume is created and mounted into the container to host these pieces. 
If this is false, then the local filesystem is mounted inside the container instead. `

	mythicEnv.SetDefault("postgres_use_build_context", false)
	mythicEnvInfo["postgres_use_build_context"] = `The mythic_postgres container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/postgres-docker/Dockerfile is used to generate the image used for the mythic_postgres container instead of the hosted image. `

	// rabbitmq configuration ---------------------------------------------
	mythicEnv.SetDefault("rabbitmq_host", "mythic_rabbitmq")
	mythicEnvInfo["rabbitmq_host"] = `This specifies the ip/hostname for where the RabbitMQ container executes. 
If this is 'rabbitmq_host' or '127.0.0.1', then mythic-cli assumes this container is running locally. 
If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("rabbitmq_port", 5672)
	mythicEnvInfo["postgres_port"] = `This specifies the port that the RabbitMQ server listens on.`

	mythicEnv.SetDefault("rabbitmq_bind_localhost_only", true)
	mythicEnvInfo["rabbitmq_bind_localhost_only"] = `This specifies if the mythic_rabbitmq container will expose the rabbitmq_port on 0.0.0.0 or 127.0.0.1. 
If you have a remote agent container connecting to Mythic, you MUST set this to false so that the remote agent container can connect to Mythic.`

	mythicEnv.SetDefault("rabbitmq_user", "mythic_user")
	mythicEnvInfo["rabbitmq_user"] = `This is the user that all containers use to connect to RabbitMQ queues`

	mythicEnv.SetDefault("rabbitmq_password", utils.GenerateRandomPassword(30))
	mythicEnvInfo["rabbitmq_password"] = `This is the randomly generated password that all containers use to connect to RabbitMQ queues`
	mythicEnv.SetDefault("rabbitmq_vhost", "mythic_vhost")

	mythicEnv.SetDefault("rabbitmq_cpus", defaultNumberOfCPUs)
	mythicEnvInfo["rabbitmq_cpus"] = `Set this to limit the maximum number of CPUs this service is able to consume`

	mythicEnv.SetDefault("rabbitmq_mem_limit", "")
	mythicEnvInfo["rabbitmq_mem_limit"] = `Set this to limit the maximum amount of RAM this service is able to consume`

	mythicEnv.SetDefault("rabbitmq_use_volume", false)
	mythicEnvInfo["rabbitmq_use_volume"] = `The mythic_rabbitmq container saves data about the messages queues used and their stats. 
If this is True, then a docker volume is created and mounted into the container to host these pieces. 
If this is false, then the local filesystem is mounted inside the container instead. `

	mythicEnv.SetDefault("rabbitmq_use_build_context", false)
	mythicEnvInfo["rabbitmq_use_build_context"] = `The mythic_rabbitmq container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/rabbitmq-docker/Dockerfile is used to generate the image used for the mythic_rabbitmq container instead of the hosted image. `

	// jwt configuration ---------------------------------------------
	mythicEnv.SetDefault("jwt_secret", utils.GenerateRandomPassword(30))
	mythicEnvInfo["jwt_secret"] = `This is the randomly generated password used to sign JWTs to ensure they're valid for this Mythic instance`

	// hasura configuration ---------------------------------------------
	mythicEnv.SetDefault("hasura_host", "mythic_graphql")
	mythicEnvInfo["hasura_host"] = `This specifies the ip/hostname for where the Hasura GraphQL container executes. If this is 'mythic_graphql' or '127.0.0.1', then mythic-cli assumes this container is running locally. If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("hasura_port", 8080)
	mythicEnvInfo["postgres_port"] = `This specifies the port that the Hasura GraphQL server listens on. This is normally accessed through the Nginx reverse proxy though via /console`

	mythicEnv.SetDefault("hasura_bind_localhost_only", true)
	mythicEnvInfo["hasura_bind_localhost_only"] = `This specifies if the mythic_graphql container will expose the hasura_port on 0.0.0.0 or 127.0.0.1. `

	mythicEnv.SetDefault("hasura_secret", utils.GenerateRandomPassword(30))
	mythicEnvInfo["hasura_secret"] = `This is the randomly generated password you can use to connect to Hasura through the /console route through the nginx proxy`

	mythicEnv.SetDefault("hasura_cpus", defaultNumberOfCPUs)
	mythicEnvInfo["hasura_cpus"] = `Set this to limit the maximum number of CPUs this service is able to consume`

	mythicEnv.SetDefault("hasura_mem_limit", "2gb")
	mythicEnvInfo["hasura_mem_limit"] = `Set this to limit the maximum amount of RAM this service is able to consume`

	mythicEnv.SetDefault("hasura_use_volume", false)
	mythicEnvInfo["hasura_use_volume"] = `The mythic_graphql container has data about the roles within Mythic and their permissions for various graphQL endpoints. 
If this is True, then the internal settings are used from the built image. 
If this is false, then the local filesystem is mounted inside the container instead. 
If you want to make any changes to the Hasura permissions, columns, or actions, then you need to make sure you first set this to false and restart mythic_graphql so that your changes are saved to disk and loaded up each time properly.`

	mythicEnv.SetDefault("hasura_use_build_context", false)
	mythicEnvInfo["hasura_use_build_context"] = `The mythic_graphql container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/hasura-docker/Dockerfile is used to generate the image used for the mythic_graphql container instead of the hosted image.`

	// docker-compose configuration ---------------------------------------------
	mythicEnv.SetDefault("COMPOSE_PROJECT_NAME", "mythic")
	mythicEnvInfo["compose_project_name"] = `This is the project name for Docker Compose - it sets the prefix of the container names and shouldn't be changed`

	mythicEnv.SetDefault("REBUILD_ON_START", false)
	mythicEnvInfo["rebuild_on_start"] = `This identifies if a container's backing image should be re-built (or re-fetched) each time you start the container. 
This can cause agent and c2 profile containers to have their volumes wiped on each start (and thus deleting any changes). 
This also drastically increases the start time for Mythic overall. 
This should only be needed if you're doing a bunch of development on Mythic itself. 
If you need to rebuild a specific container, you should use './mythic-cli build [container name]' instead to just rebuild that one container.
This will also delete any volumes in use (which will remove things like C2 Profile's config.json updates). 
To keep these around when starting or building, use the --keep-volume flag`

	// Mythic instance configuration ---------------------------------------------
	mythicEnv.SetDefault("mythic_admin_user", "mythic_admin")
	mythicEnvInfo["mythic_admin_user"] = `This configures the name of the first user in Mythic when Mythic starts for the first time. 
After the first time Mythic starts, this value is unused.`

	mythicEnv.SetDefault("mythic_admin_password", utils.GenerateRandomPassword(30))
	mythicEnvInfo["mythic_admin_password"] = `This randomly generated password is used when Mythic first starts to set the password for the mythic_admin_user account. 
After the first time Mythic starts, this value is unused`

	mythicEnv.SetDefault("default_operation_name", "Operation Chimera")
	mythicEnvInfo["default_operation_name"] = `This is used to name the initial operation created for the mythic_admin account. 
After the first time Mythic starts, this value is unused`

	mythicEnv.SetDefault("allowed_ip_blocks", "0.0.0.0/0,::/0")
	mythicEnvInfo["allowed_ip_blocks"] = `This comma-separated set of HOST-ONLY CIDR ranges specifies where valid logins can come from. 
These values are used by mythic_server to block potential downloads as well as by mythic_nginx to block connections from invalid addresses as well.`

	mythicEnv.SetDefault("default_operation_webhook_url", "")
	mythicEnvInfo["default_operation_webhook_url"] = `If an operation doesn't specify their own webhook URL, then this value is used. 
You must install a webhook container to have access to webhooks.`

	mythicEnv.SetDefault("default_operation_webhook_channel", "")
	mythicEnvInfo["default_operation_webhook_channel"] = `If an operation doesn't specify their own webhook channel, then this value is used.
You must install a webhook container to have access to webhooks.`

	// jupyter configuration ---------------------------------------------
	mythicEnv.SetDefault("jupyter_port", 8888)
	mythicEnvInfo["jupyter_port"] = `This specifies the port for the mythic_jupyter container to expose outside of its container. 
This is typically accessed through the nginx proxy via /jupyter`

	mythicEnv.SetDefault("jupyter_host", "mythic_jupyter")
	mythicEnvInfo["jupyter_host"] = `This specifies the ip/hostname for where the Jupyter container executes. 
If this is 'jupyter_host' or '127.0.0.1', then mythic-cli assumes this container is running locally. 
If it's anything else, mythic-cli will not spin up this container as it assumes it lives elsewhere`

	mythicEnv.SetDefault("jupyter_token", utils.GenerateRandomPassword(30))
	mythicEnvInfo["jupyter_token"] = `This value is used to authenticate to the Jupyter instance via the /jupyter route in the React UI`

	mythicEnv.SetDefault("jupyter_cpus", defaultNumberOfCPUs)
	mythicEnvInfo["jupyter_cpus"] = `Set this to limit the maximum number of CPUs this service is able to consume`

	mythicEnv.SetDefault("jupyter_mem_limit", "")
	mythicEnvInfo["jupyter_mem_limit"] = `Set this to limit the maximum amount of RAM this service is able to consume`

	mythicEnv.SetDefault("jupyter_bind_localhost_only", true)
	mythicEnvInfo["jupyter_bind_localhost_only"] = `This specifies if the mythic_jupyter container will expose the jupyter_port on 0.0.0.0 or 127.0.0.1. `

	mythicEnv.SetDefault("jupyter_use_volume", false)
	mythicEnvInfo["jupyter_use_volume"] = `The mythic_jupyter container saves data about script examples. 
If this is True, then a docker volume is created and mounted into the container to host these pieces. 
If this is false, then the local filesystem is mounted inside the container instead. `

	mythicEnv.SetDefault("jupyter_use_build_context", false)
	mythicEnvInfo["jupyter_use_build_context"] = `The mythic_jupyter container by default pulls configuration from a pre-compiled Docker image hosted on GitHub's Container Registry (ghcr.io). 
Setting this to "true" means that the local Mythic/jupyter-docker/Dockerfile is used to generate the image used for the mythic_jupyter container instead of the hosted image.`

	// debugging help ---------------------------------------------
	mythicEnv.SetDefault("postgres_debug", false)
	mythicEnv.SetDefault("mythic_react_debug", false)
	mythicEnvInfo["mythic_react_debug"] = `Setting this to true switches the React UI from using a pre-built React UI to a live hot-reloading development server. 
You should only need to do this if you're planning on working on the Mythic UI. 
Once you're doing making changes to the UI, you can run 'sudo ./mythic-cli build_ui' to compile your changes and save them to the mythic-react-docker folder. 
Assuming you have mythic_react_use_volume set to false, then when you disable debugging, you'll be using the newly compiled version of the UI`

	// installed service configuration ---------------------------------------------
	mythicEnv.SetDefault("installed_service_cpus", "1")
	mythicEnvInfo["installed_service_cpus"] = `Set this to limit the maximum number of CPUs that installed Agents/C2 Profile containers are allowed to consume`

	mythicEnv.SetDefault("installed_service_mem_limit", "")
	mythicEnvInfo["installed_service_mem_limit"] = `Set this to limit the maximum amount of RAM that installed Agents/C2 Profile containers are allowed to consume`

	mythicEnv.SetDefault("webhook_default_url", "")
	mythicEnvInfo["webhook_default_url"] = `This is the default webhook URL to use if one isn't configured for an operation`

	mythicEnv.SetDefault("webhook_default_callback_channel", "")
	mythicEnvInfo["webhook_default_callback_channel"] = `This is the default channel to use for new callbacks with the specified webhook url`

	mythicEnv.SetDefault("webhook_default_feedback_channel", "")
	mythicEnvInfo["webhook_default_feedback_channel"] = `This is the default channel to use for new feedback with the specified webhook url`

	mythicEnv.SetDefault("webhook_default_startup_channel", "")
	mythicEnvInfo["webhook_default_startup_channel"] = `This is the default channel to use for new startup notifications with the specified webhook url`

	mythicEnv.SetDefault("webhook_default_alert_channel", "")
	mythicEnvInfo["webhook_default_alert_channel"] = `This is the default channel to use for new alerts with the specified webhook url`

	mythicEnv.SetDefault("webhook_default_custom_channel", "")
	mythicEnvInfo["webhook_default_custom_channel"] = `This is the default channel to use for new custom messages with the specified webhook url`
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
	mythicEnv.Set("global_docker_latest", MythicDockerLatest)
	mythicEnvInfo["global_docker_latest"] = `This is the latest Docker Image version available for all Mythic services (mythic_server, mythic_postgres, mythic-cli, etc). 
This is determined by the tag on the Mythic branch and stamped into mythic-cli. 
Even if you change or remove this locally, mythic-cli will always put it back to what it was. 
For each of the main Mythic services, if you set their *_use_build_context to false, then it's this specified Docker image version that will be fetched and used.`
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
	allSettings := mythicEnv.AllKeys()
	for i := 0; i < len(args[0:]); i++ {
		searchRegex, err := regexp.Compile(args[i])
		if err != nil {
			log.Fatalf("[!] bad regex: %v", err)
		}
		for _, setting := range allSettings {
			if searchRegex.MatchString(strings.ToUpper(setting)) || searchRegex.MatchString(strings.ToLower(setting)) {
				resultMap[setting] = mythicEnv.GetString(setting)
			}
		}
	}
	return resultMap
}
func SetConfigStrings(key string, value string) {
	allSettings := mythicEnv.AllKeys()
	searchRegex, err := regexp.Compile(key)
	if err != nil {
		log.Fatalf("[!] bad regex: %v", err)
	}
	found := false
	for _, setting := range allSettings {
		if searchRegex.MatchString(strings.ToUpper(setting)) || searchRegex.MatchString(strings.ToLower(setting)) {
			mythicEnv.Set(setting, value)
			found = true
		}
	}
	if !found {
		log.Printf("[-] Failed to find any matching keys for %s\n", key)
		return
	}
	log.Println("[+] Configuration successfully updated. Bring containers down and up for changes to take effect.")
	writeMythicEnvironmentVariables()
}
func SetNewConfigStrings(key string, value string) {
	mythicEnv.Set(key, value)
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
func GetConfigHelp(entries []string) map[string]string {
	allSettings := mythicEnv.AllKeys()
	output := make(map[string]string)
	for i := 0; i < len(entries[0:]); i++ {
		searchRegex, err := regexp.Compile(entries[i])
		if err != nil {
			log.Fatalf("[!] bad regex: %v", err)
		}
		for _, setting := range allSettings {
			if searchRegex.MatchString(strings.ToUpper(setting)) || searchRegex.MatchString(strings.ToLower(setting)) {
				if _, ok := mythicEnvInfo[setting]; ok {
					output[setting] = mythicEnvInfo[setting]
				} else if strings.HasSuffix(setting, "use_volume") {
					output[setting] = `This creates a new volume in the format [agent]_volume that's mapped into an agent's '/Mythic' directory. The first time this is created with an empty volume, the contents of your pre-built agent/c2 gets copied to the volume. If you install a new version of the agent/c2 profile or rebuild the container (either via rebuild_on_start or directly calling ./mythic-cli build [agent]) then the volume is deleted and recreated. This will DELETE any changes you made in the container. For agents this could be temporary files created as part of builds. For C2 Profiles this could be profile updates. If this is set to 'false' the no new volume is created and instead the local InstalledServices/[agent] directory is mapped into the container, preserving all changes on rebuild and restart.`
				} else if strings.HasSuffix(setting, "use_build_context") {
					output[setting] = `This setting determines if you use the pre-built image hosted on GitHub/DockerHub or if you use your local InstalledService/[agent]/Dockerfile to build a new local image for your container. If you're wanting to make changes to an agent or c2 profile (adding commands, updating code, etc), then you need to set this to 'true' and update your Dockerfile to copy in your modified code. If your container code is Golang, then you'll also need to make sure your modified Dockerfile rebuilds that Go code based on your changes (probably with a 'go build' or 'make build' command depending on the agent). If your container code is Python, then simply copying in the changes should be sufficient. Also make sure you change [agent]_use_volume to 'false' so that your changes don't get overwritten by an old volume. Alternatively, you could remove the old volume with './mythic-cli volume rm [agent]_volume' and then build your new container with './mythic-cli build [agent]'.`
				} else if strings.HasSuffix(setting, "remote_image") {
					output[setting] = `This setting configures the remote image to use if you have *_use_build_context set to false. This value should get automatically updated by the agent/c2 profile's repo as new releases are created. This value will also get updated each time you install an agent. So if you want to pull an agent's latest image, just re-install the agent (or manually update this value and restart the local container).`
				} else {

				}
			}
		}
	}
	return output
}

// https://gist.github.com/r0l1/3dcbb0c8f6cfe9c66ab8008f55f8f28b
func AskConfirm(prompt string) bool {
	reader := bufio.NewReader(os.Stdin)
	for {
		fmt.Printf("%s [y/n]: ", prompt)
		input, err := reader.ReadString('\n')
		if err != nil {
			fmt.Printf("[-] Failed to read user input\n")
			continue
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
			continue
		}
		input = strings.TrimSpace(input)
		mythicEnv.SetDefault(environmentVariable, input)
		mythicEnv.Set(environmentVariable, input)
		writeMythicEnvironmentVariables()
		return
	}
}
func Initialize() {
	parseMythicEnvironmentVariables()
	writeMythicEnvironmentVariables()
}
