BINARY_NAME=mythic-cli
LOCAL_PATH=$(shell pwd)
BUILDER_IMAGE=ghcr.io/its-a-feature/mythic_cli:v0.0.2.3
.PHONY: default
default: build_linux ;

# pull in build and env options from global settings
-include ../build.env
-include ../.env

export

build_binary_linux:
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm -ti ${BUILDER_IMAGE} sh -c "cp /mythic-cli_linux /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_binary_macos:
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm -ti ${BUILDER_IMAGE} sh -c "cp /mythic-cli_macos /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_binary_macos_local:
	cd src && go build -o ../../mythic-cli .

build_linux: build_binary_linux
build_macos: build_binary_macos