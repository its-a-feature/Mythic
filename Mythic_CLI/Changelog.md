# Changelog
All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](http://keepachangelog.com/en/1.0.0/)
and this project adheres to [Semantic Versioning](http://semver.org/spec/v2.0.0.html).

## 0.1.0 - 2023-03-03

## Changed

- Updated to use viper and cobra 

## 0.0.8 - 2022-11-7

### Changed

- If the `services` section of the docker-compose.yml file is already set, then the `mythic-cli` binary doesn't modify it. This allows people to make small modifications (such as adding IPv6 addresses) without being overridden. The only field that gets statically changed back each time the mythic-cli binary is run is the `networks.default_network.driver_opts` field since the yaml parser will break up the `com.docker.network.bridge.name` field into subkeys rather than leaving it as a single key.
