BINARY_NAME=mythic-cli

build:
	go build -o ${BINARY_NAME} .
	
build_linux:
	GOOS=linux GOARCH=amd64 go build -o ${BINARY_NAME} .

build_macos:
	GOOS=darwin GOARCH=amd64 go build -o ${BINARY_NAME} .

run:
	./${BINARY_NAME}

build_and_run: build run
