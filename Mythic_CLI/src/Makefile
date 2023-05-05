BINARY_NAME=mythic-cli

build:
	go build -o ${BINARY_NAME} .
	
build_linux:
	GOOS=linux go build -o ${BINARY_NAME} .

build_macos:
	GOOS=darwin go build -o ${BINARY_NAME} .

run:
	./${BINARY_NAME}

build_and_run: build run
