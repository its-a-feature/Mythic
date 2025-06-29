BINARY_NAME=mythic-cli
LOCAL_PATH=$(shell pwd)
BUILDER_IMAGE=ghcr.io/its-a-feature/mythic_cli:v3.3.0.117
.PHONY: default
default: build_linux ;

# pull in build and env options from global settings
-include ../build.env
-include ../.env

export

copy_binary_linux:
	docker create --name mythic-cli-tmp ${BUILDER_IMAGE} /bin/sh
	docker cp mythic-cli-tmp:/mythic-cli_linux ./${BINARY_NAME}
	docker rm mythic-cli-tmp
	chmod +x ${BINARY_NAME}

copy_binary_macos:
	docker create --name mythic-cli-tmp ${BUILDER_IMAGE} /bin/sh
	docker cp mythic-cli-tmp:/mythic-cli_macos ./${BINARY_NAME}
	docker rm mythic-cli-tmp
	chmod +x ${BINARY_NAME}

build_local:
	cd src && go build -o ../../mythic-cli .

build_linux_docker:
	docker build -t mythic-cli-builder -f Dockerfile .
	docker create --name mythic-cli-tmp mythic-cli-builder /bin/sh
	docker cp mythic-cli-tmp:/mythic-cli_linux ./${BINARY_NAME}
	docker rm mythic-cli-tmp
	chmod +x ${BINARY_NAME}

build_macos_docker:
	docker build -t mythic-cli-builder -f Dockerfile .
	docker create --name mythic-cli-tmp mythic-cli-builder /bin/sh
	docker cp mythic-cli-tmp:/mythic-cli_macos ./${BINARY_NAME}
	docker rm mythic-cli-tmp
	chmod +x ${BINARY_NAME}

build_linux: copy_binary_linux
build_macos: copy_binary_macos