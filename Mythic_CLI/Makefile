BINARY_NAME=mythic-cli
LOCAL_PATH=$(shell pwd)/src
.PHONY: default
default: build_all_linux ;

build_container:
	docker build -t mythic-cli .

build_binary:
	docker run --name mythic-cli-builder --rm -v ${LOCAL_PATH}:/usr/src/app mythic-cli make build_linux
	mv src/${BINARY_NAME} .
	chmod +x ${BINARY_NAME}

build_binary_macos:
	docker run --name mythic-cli-builder --rm -v ${LOCAL_PATH}:/usr/src/app mythic-cli make build_macos
	mv src/${BINARY_NAME} .
	chmod +x ${BINARY_NAME}


build_all_linux: build_container build_binary
build_all_macos: build_container build_binary_macos