BINARY_NAME=mythic-cli

export

build:
	go mod download
	go mod tidy
	go build -o ${BINARY_NAME} .
	
build_linux:
	go mod tidy
	GOOS=linux go build -o ${BINARY_NAME}_linux .

build_macos:
	go mod tidy
	GOOS=darwin go build -o ${BINARY_NAME}_macos .

build_windows:
	go mod tidy
	GOOS=windows go build -o ${BINARY_NAME}_windows.exe .

build_all: build_linux build_macos build_windows

run:
	./${BINARY_NAME}

build_and_run: build run
