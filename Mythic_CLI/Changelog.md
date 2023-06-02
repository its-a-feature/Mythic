# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## v1.0.17 - 2023-06-02

### Changed

- Updated mythic_jupyter docker-compose entry to keep the `deploy` key and all sub keys 
- Updated health check for mythic_nginx to use curl instead of wget

## v1.0.15 - 2023-05-17

### Changed

- re-building mythic service containers will re-generate their docker-compose file entries first

### Added

- Added a command to remove containers

## 1.0.14 - 2023-05-10

### Changed

- Fixed an issue where installing another services after mythic_sync would uninstall mythic_sync

## 1.0.13 - 2023-05-10

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
