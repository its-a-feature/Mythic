BINARY_NAME?=mythic_server
JWT_SECRET?="2Zd2rGaAhTnuGVEsq9LeYVFXns5PN1"
POSTGRES_HOST?="127.0.0.1"
POSTGRES_PASSWORD?="0zoHFSTbiT7AzJvnbvQ5Lt65YkIsuT"
DEBUG_LEVEL?="debug"
RABBITMQ_HOST?="127.0.0.1"
RABBITMQ_PASSWORD?="PqR9XJ957sfHqcxj6FsBMj4p"
ALLOWED_IP_BLOCKS?="0.0.0.0/0"
MYTHIC_SERVER_GRPC_PORT?="17444"
MYTHIC_SERVER_BIND_LOCALHOST_ONLY?="false"
MYTHIC_SERVER_DYNAMIC_PORTS?="7000-7010"
MYTHIC_ADMIN_USERNAME?="mythic_admin"
MYTHIC_ADMIN_PASSWORD?="mythic_password"
MYTHIC_DEFAULT_OPERATION?="Operation Chimera"
MYTHIC_DEBUG_AGENT_MESSAGE?=false
MYTHIC_DOCKER_NETWORKING?="host"

export

build:
	go mod tidy
	CGO_ENABLED=0 go build -o ${BINARY_NAME} -tags="nomsgpack" .
copy_to_final:
	cp ${BINARY_NAME} /
copy_from_final:
	cp /${BINARY_NAME} .

run_custom_values:
	JWT_SECRET=${JWT_SECRET} \
POSTGRES_HOST=${POSTGRES_HOST} \
POSTGRES_PASSWORD=${POSTGRES_PASSWORD} \
DEBUG_LEVEL=${DEBUG_LEVEL} \
MYTHIC_DEBUG_AGENT_MESSAGE=${MYTHIC_DEBUG_AGENT_MESSAGE} \
RABBITMQ_HOST=${RABBITMQ_HOST} \
RABBITMQ_PASSWORD=${RABBITMQ_PASSWORD} \
ALLOWED_IP_BLOCKS=${ALLOWED_IP_BLOCKS} \
MYTHIC_ADMIN_USERNAME=${MYTHIC_ADMIN_USERNAME} \
MYTHIC_ADMIN_PASSWORD=${MYTHIC_ADMIN_PASSWORD} \
MYTHIC_DEFAULT_OPERATION=${MYTHIC_DEFAULT_OPERATION} \
MYTHIC_SERVER_BIND_LOCALHOST_ONLY=${MYTHIC_SERVER_BIND_LOCALHOST_ONLY} \
MYTHIC_SERVER_DYNAMIC_PORTS=${MYTHIC_SERVER_DYNAMIC_PORTS} \
MYTHIC_SERVER_GRPC_PORT=${MYTHIC_SERVER_GRPC_PORT} \
MYTHIC_DOCKER_NETWORKING=${MYTHIC_DOCKER_NETWORKING} \
./${BINARY_NAME}

run_local_build:
	./${BINARY_NAME}

build_protobuf_go:
	protoc --go_out=`pwd`/grpc/services --go_opt=paths=source_relative \
--go-grpc_out=`pwd`/grpc/services --go-grpc_opt=paths=source_relative \
--proto_path=`pwd`/grpc/services \
`pwd`/grpc/services/*.proto

build_protobuf_python:
	python3 -m grpc_tools.protoc --python_out=`pwd`/../../../MythicMeta/MythicContainerPyPi/mythic_container/grpc \
--pyi_out=`pwd`/../../../MythicMeta/MythicContainerPyPi/mythic_container/grpc \
--grpc_python_out=`pwd`/../../../MythicMeta/MythicContainerPyPi/mythic_container/grpc \
--proto_path=`pwd`/grpc/services \
`pwd`/grpc/services/*.proto

build_protobuf: build_protobuf_go
build_and_build_protobuf: build_protobuf build
build_final: build copy_to_final
build_and_run: build_and_build_protobuf run_local_build
run_custom: build run_custom_values

clean:
	go clean
	rm ${BINARY_NAME}
