BINARY_NAME=mythic-cli
GO_BUILD_FLAGS?=-trimpath -ldflags="-s -w"

export

build:
	go mod download
	go mod tidy
	go build ${GO_BUILD_FLAGS} -o ${BINARY_NAME} .

build_linux:
	go mod tidy
	GOOS=linux go build ${GO_BUILD_FLAGS} -o ${BINARY_NAME}_linux .

build_macos:
	go mod tidy
	GOOS=darwin go build ${GO_BUILD_FLAGS} -o ${BINARY_NAME}_macos .

build_all: build_linux build_macos

run:
	./${BINARY_NAME}

build_and_run: build run
