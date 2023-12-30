FROM itsafeaturemythic/mythic_go_base:latest

WORKDIR /usr/src/app

ARG GOPROXY=proxy.golang.org
ARG GO111MODULE

RUN go env -w GOPROXY=${GOPROXY}
RUN go env -w GO111MODULE=${GO111MODULE}

COPY ["src/", "."]

RUN make build_final

FROM alpine

COPY --from=0 /mythic_server /mythic_server
COPY --from=0 /usr/src/app /usr/src/app

WORKDIR /usr/src/app

CMD ["/bin/sh", "-c", "cp /mythic_server . && ./mythic_server" ]