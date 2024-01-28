#FROM itsafeaturemythic/mythic_go_base:latest
FROM golang:1.21-alpine
WORKDIR /usr/src/app

ARG GOPROXY=proxy.golang.org
ARG GO111MODULE

RUN go env -w GOPROXY=${GOPROXY}
RUN go env -w GO111MODULE=${GO111MODULE}

COPY ["src/", "."]

RUN apk add --no-cache make

RUN make build_all

FROM alpine

COPY --from=0 /usr/src/app/mythic-cli_linux /mythic-cli_linux
COPY --from=0 /usr/src/app/mythic-cli_macos /mythic-cli_macos