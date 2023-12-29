BINARY_NAME=mythic-cli
LOCAL_PATH=$(shell pwd)
BUILDER_IMAGE=ghcr.io/its-a-feature/mythic_cli:v0.0.2
.PHONY: default
default: build_all_linux ;

# pull in build and env options from global settings
-include ../build.env
-include ../.env

export

build_container:
	#docker build -t mythic-cli --build-arg GOPROXY --build-arg GO111MODULE .

build_binary:
	#docker run --env GOPROXY --env GO111MODULE --name mythic-cli-builder --rm -v ${LOCAL_PATH}:/usr/src/app mythic-cli make build_linux
	#mv src/${BINARY_NAME} .
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm -ti ${BUILDER_IMAGE} sh -c "cp /mythic-cli /copy_file/mythic-cli"
	mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_binary_macos:
	#docker run --env GOPROXY --env GO111MODULE  --name mythic-cli-builder --rm -v ${LOCAL_PATH}:/usr/src/app mythic-cli make build_macos
	#mv src/${BINARY_NAME} .
	docker run -v ${LOCAL_PATH}/copy_file/:/copy_file/ --rm -ti ${BUILDER_IMAGE} sh -c "cp /mythic-cli /copy_file/mythic-cli"
    mv ./copy_file/${BINARY_NAME} . && rm -rf ./copy_file && chmod +x ${BINARY_NAME}

build_binary_macos_local:
	cd src && go build -o ../../mythic-cli .

build_all_linux: build_container build_binary
build_all_macos: build_container build_binary_macos