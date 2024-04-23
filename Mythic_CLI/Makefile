BINARY_NAME=mythic-cli
LOCAL_PATH=$(shell pwd)
BUILDER_IMAGE=ghcr.io/its-a-feature/mythic_cli:v0.0.3.53
.PHONY: default
default: build_linux ;

# pull in build and env options from global settings
-include ../build.env
-include ../.env

export

copy_binary_linux:
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm ${BUILDER_IMAGE} sh -c "cp /mythic-cli_linux /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

copy_binary_macos:
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm ${BUILDER_IMAGE} sh -c "cp /mythic-cli_macos /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_local:
	cd src && go build -o ../../mythic-cli .

build_linux_docker:
	docker build -t mythic-cli-builder -f Dockerfile .
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm mythic-cli-builder sh -c "cp /mythic-cli_linux /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_macos_docker:
	docker build -t mythic-cli-builder -f Dockerfile .
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm mythic-cli-builder sh -c "cp /mythic-cli_macos /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_linux: copy_binary_linux
build_macos: copy_binary_macos