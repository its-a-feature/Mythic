
export

build_container:
	docker build -t mythic_server --build-arg GOPROXY --build-arg GO111MODULE -f Dockerfile .

run:
	docker run --rm --env GOPROXY --env GO111MODULE mythic_server

