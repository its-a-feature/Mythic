BINARY_NAME=mythic-cli

export

build:
	go mod download
	go mod tidy
	go build -o ${BINARY_NAME} .
	
build_linux:
	GOOS=linux go build -o ${BINARY_NAME} .

build_macos:
	GOOS=darwin go build -o ${BINARY_NAME} .

run:
	./${BINARY_NAME}

build_and_run: build run
