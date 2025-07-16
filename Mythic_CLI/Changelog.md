# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 0.3.17 - 2025-07-16

### Changed

- Updated description for mythic_docker_networking environment variable

## 0.3.16 - 2025-05-22

### Changed

- Pulled in PR for adding NGINX_HOST, NGINX_PORT, and NGINX_SSL into InstalledService containers

## 0.3.15 - 2025-03-11

### Changed

- Added a flag for `rabbitmq reset` to start/stop the container after resetting the storage

## 0.3.14 - 2025-03-04

### Changed

- Added a `-i` flag for `update -s [service]` and `update -a` to auto install updates for installed services
- Updated the "port in use" check when starting Mythic to prevent port forwards for all services except the UI
- Added a `rabbitmq reset` command to delete the rabbitmq-docker/storage folder or volume

## 0.3.13 - 2025-02-18

### Changed

- Updated all containers to have all extra_host fields

## 0.3.12 - 2025-02-13

### Changed

- Fixed an issue with mythic_sync where it looped forever asking for input

## 0.3.11 - 2025-01-14

### Changed

- Fixed an issue when stopping containers that not all would get stopped

## 0.3.10 - 2024-12-28

### Changed

- Added a config variable, NGINX_MAX_BODY_SIZE, to adjust how big of a file is allowed through the Mythic UI for uploads

## 0.3.9 - 2024-12-18

### Changed

- Updated the container stopping logic to thread instead of doing it sequentially

## 0.3.8 - 2024-12-10 

### Changed

- Added check for docker compose plugin, not just docker version

## 0.3.7 - 

### Changed

- Updated the default value for an installed service's *_use_volume setting to be `false` instead of `true`
  - too many people were having issues with lingering volumes, so it's better to have people explicitly set this if they need it

## 0.3.6 - 2024-11-25

### Changed

- Updated mythic_server_allow_invite_links to get passed into the mythic_server container

## 0.3.5 - 2024-09-03

### Changed

- Dropped support for `docker-compose` script as it causes too many breaking issues in Kali
  - Make sure the `compose` plugin is installed with Docker (should be default in modern installs)
- Added support for `--keep-volume` flag with start, build, and install commands
  - This allows you to manually override on a per-command basis if you want to keep the volume with an agent/c2 container or not
  - By default, if `rebuild_on_start` is true, then volumes will be removed when containers start.
  - By default, volumes are removed on explicit `build` commands.
- Added support for tracking an installed service's `install_location`
  - `mythic-cli update --all-services` and `./mythic-cli update --services [name] [name]` can check for updated remote_images

## 0.3.4 - 2024-08-27

### Changed

- Added option for `mythic_docker_networking` to allow for `bridge` or `host` networking
  - This applies to all main mythic services
  
## 0.3.3 - 2024-08-11

### Changed

- Added a check for a GraphQL query to help make sure things are fully online before returning success from start

## 0.3.2 - 2024-08-06

### Changed

- Hopefully fixed a permissions issue with the /projects directory for jupyter notebooks

## 0.3.1 - 2024-08-01

### Changed

- Made the default for dynamic ports to bind to localhost

## 0.3.0 - 2024-07-31

### Changed

- Added experimental support for changing the mythic_server container to host networking

## 0.2.22 - 2024-04-09

### Changed

- Fixed an issue with wrapper payload installs that was checking the wrong environment variables

## 0.2.21 - 2024-03-21

### Changed

- Updated docker go library and had to slightly refactor namings due to incompatible updates 

## 0.2.20 - 2024-02-21

### Changed

- Added a -f (--force) flag for the `sudo ./mythic-cli database reset` command to not prompt for confirmation to help with automation

## 0.2.19 - 2024-02-20

### Changed

- During installation there's a typo for checking the .env for the documentation_use_volume boolean that broke wrapper installs

## 0.2.18 - 2024-02-13

### Changed

- Updated mythic_react to not use volumes since they keep old UI pieces around
- Fixed improper golang type when adding new services

## 0.2.16 - 2024-02-13

### Changed

- Updated the default values for docker-compose to add back in labels and names

## 0.2.15 - 2024-02-12

### Changed

- Added `global_restart_policy` env option to allow configuring of docker containers to restart 'always', 'unless-stopped'
- Fixed bug in installed agents where additional docker-config attributes would get overridden after initial install

## 0.2.14 - 2024-02-10

### Changed

- Updated postgres processing for exposed ports for proper handling in Docker vs docker-compose
- Reverted back to using command in docker-compose to fix permissions issues

## 0.2.12 - 2024-02-09

### Changed

- Fixed a bug where postgres wasn't exposing the port properly

## 0.2.11 - 2024-02-09

### Changed

- When installing an agent/c2, check for the *_use_build_context and *_use_volume keys before setting them

## 0.2.10 - 2024-02-06

### Changed

- Updated how file volume copies work to leverage the `docker cp` command
- Added a `backup` command with subcommands for `database` and `files`
- Added a `restore` command with subcommands for `database` and `files`
- Updated commands with Help displays when subcommands are available
- Updated `*_build_build_context` to default to false
- Fixed an issue with a typo in mythic-cli's default value for the rabbitmq_host variable

## 0.2.8 - 2024-01-29

### Changed

- Updated the addition of 3rd party containers to remove existing volumes if they exist

## 0.2.7 - 2024-01-29

### Changed

- Updated the config get/set regex matching to search for matching settings as all upper case or all lower case

## 0.2.6 - 2024-01-29

### Changed

- Fixed an issue with parsing empty docker-compose files not adding in necessary services key

## 0.2.5 - 2024-01-28

### Changed

- Removed the usage of the volume container for `mythic_graphql`
  - Existing volumes for mythic_graphql break new updates since the old volume information is used

## 0.2.4 - 2024-01-28

### Changed

- Refactored to allow multiple kinds of managers for Mythic (defaults to `Docker`)
- Added volume support

## 0.2.3 - 2023-12-27

### Changed

- Updated the 3rd party service additions to respect existing volume mounts

## 0.2.2 - 2023-09-07

### Changed

- Updated environment variables to have `nginx_use_ipv4` and `nginx_use_ipv6` configuration options

## 0.2.1 - 2023-07-20

### Changed

- Updated environment variables to support *_mem_limit to restrict the memory usage by the various containers.
This applies to all containers that also support setting their cpu limits. To restrict to 2GB, set "2gb", to restrict to 512MB, set "512mb"

## 0.2.0 - 2023-07-19

### Changed

- Removed the hard-coded mythic docker network subnet of 172.100.0.0/16. With this update you need to tear down all containers and rebuild so that the new networking applies.

## 0.1.26 - 2023-07-18

### Changed

- Updated the docker-compose creation process to not exit on failing to read in a newly created yaml file

## 0.1.25 - 2023-07-05

### Changed

- Added `services` command to list out container status, image build status, and dockercompose entry status for all folders in InstalledServices

## 0.1.24 - 2023-06-20

### Changed

- Adjusted installs to not error out if documentation folders fail to install

## 0.1.23 - 2023-06-20

### Changed

- Fixed a control flow bug that would restart all containers if building a new single container

## v0.1.21 - 2023-06-14

### Changed
- Updated the `./mythic-cli status` command to break out a distinction between services in docker compose that aren't running and those not in docker compose

## v0.1.20 - 2023-06-14

### Changed

- Pulled in a PR to make sure documentation-wrapper information is pulled in on install for services
- Updated the `./mythic-cli status` command to list out additional services installed but not present in docker-compose
- Updated the `./mythic-cli config service` command to list out just configurations needed for remote agent development
- Added new variable, `mythic_server_dynamic_ports_bind_localhost_only`, specifically to control if dynamic ports are bound to localhost or not, separate from mythic_server

## v0.1.19 - 2023-06-07

### Changed

- Updated docker-compose to bind the Dynamic ports for Mythic to localhost if `mythic_server_bind_localhost_only` is set to true

## v0.1.17 - 2023-06-02

### Changed

- Updated mythic_jupyter docker-compose entry to keep the `deploy` key and all sub keys 
- Updated health check for mythic_nginx to use curl instead of wget

## v0.1.15 - 2023-05-17

### Changed

- re-building mythic service containers will re-generate their docker-compose file entries first

### Added

- Added a command to remove containers

## 0.1.14 - 2023-05-10

### Changed

- Fixed an issue where installing another services after mythic_sync would uninstall mythic_sync

## 0.1.13 - 2023-05-10

### Changed

- Updated failed installs to return exit code 1 instead of just printing error and exiting

## 0.1.9 - 2023-04-25

### Changed

- Updated Mythic's env to take in configuration channels for the various webhook types and mirror it to containers

## 0.1.8 - 2023-04-20

### changed

- mythic_sync installation pointed to normal service installation instead of mythic_sync install

## 0.1.6 - 2023-04-19

### Added

- Added DEFAULT_OPERATION_WEBHOOK_URL and DEFAULT_OPERATION_WEBHOOK_CHANNEL values

## 0.1.3 - 2023-03-16

### Changed

- updated install service functionality to also start the service 

## 0.1.0 - 2023-03-03

### Changed

- Updated to use viper and cobra 

## 0.0.8 - 2022-11-7

### Changed

- If the `services` section of the docker-compose.yml file is already set, then the `mythic-cli` binary doesn't modify it. This allows people to make small modifications (such as adding IPv6 addresses) without being overridden. The only field that gets statically changed back each time the mythic-cli binary is run is the `networks.default_network.driver_opts` field since the yaml parser will break up the `com.docker.network.bridge.name` field into subkeys rather than leaving it as a single key.
