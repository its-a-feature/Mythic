FROM itsafeaturemythic/mythic_go_base:latest

WORKDIR /usr/src/app

ARG GOPROXY
ARG GO111MODULE

RUN go env -w GOPROXY=${GOPROXY}
RUN go env -w GO111MODULE=${GO111MODULE}

COPY ["src/", "."]

RUN go mod download
RUN go mod tidy

CMD ["/bin/bash", "-c", "make", "build"]